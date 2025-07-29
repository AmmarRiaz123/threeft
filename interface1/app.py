from flask import Flask, request, jsonify, render_template, send_file
from PIL import Image
import easyocr
import re
import os
import cv2
import numpy as np
from fuzzywuzzy import fuzz
from difflib import get_close_matches
import string
import psycopg2
import configparser
import secrets
from face_verification import verify_person

app = Flask(__name__)

reader = easyocr.Reader(['en', 'ur'], gpu=False)  # Urdu & English

# ==================== Database ====================
def read_db_config(filename="config.ini", section="postgresql"):
    parser = configparser.ConfigParser()
    parser.read(filename)
    if parser.has_section(section):
        return {param[0]: param[1] for param in parser.items(section)}
    else:
        raise Exception(f"Section {section} not found in {filename}")

def save_to_postgres(data):
    config = read_db_config()
    try:
        conn = psycopg2.connect(**config)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cnic_data (
                id SERIAL PRIMARY KEY,
                name TEXT,
                father_name TEXT,
                cnic_number TEXT,
                dob TEXT,
                issue_date TEXT,
                expiry_date TEXT,
                gender TEXT
            )
        ''')
        cursor.execute('''
            INSERT INTO cnic_data (name, father_name, cnic_number, dob, issue_date, expiry_date, gender)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (
            data.get("name", ""),
            data.get("father_name", ""),
            data.get("cnic_number", ""),
            data.get("dob", ""),
            data.get("issue_date", ""),
            data.get("expiry_date", ""),
            data.get("gender", "")
        ))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to save to PostgreSQL: {str(e)}")

# ==================== Helper Functions ====================
def extract_cnic(text):
    cnic_pattern = r'\b\d{5}-\d{7}-\d\b'
    match = re.search(cnic_pattern, text)
    return match.group() if match else "-"

def is_english_text(text):
    return all(char in string.printable for char in text)

class NADRAAccessError(Exception):
    """Raised when access to NADRA verification is not available."""
    pass

def verify_with_nadra(cnic: str, name: str, dob: str) -> bool:
    nadra_config = read_nadra_config()
    access_granted = nadra_config.get("access_granted", "false").lower() == "true"

    if not access_granted:
        raise NADRAAccessError("Could not verify with NADRA: Access not granted.")

    print(f"Verifying CNIC: {cnic}, Name: {name}, DOB: {dob} with NADRA...")
    return True


def preprocess_image(pil_image):
    img = np.array(pil_image.convert("RGB"))
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    enhanced = cv2.resize(enhanced, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_LINEAR)
    return Image.fromarray(enhanced)

def fuzzy_search(label, lines, threshold=75):
    for i, line in enumerate(lines):
        score = fuzz.partial_ratio(label.lower(), line.lower())
        if score >= threshold and i+1 < len(lines):
            next_line = re.sub(r"[^\w\s]", "", lines[i+1]).strip()
            if next_line and not any(x in next_line.lower() for x in ["father", "name", "identity", "pakistan", "card"]):
                return next_line
    return None

def read_nadra_config(filename="config.ini", section="nadra"):
    parser = configparser.ConfigParser()
    parser.read(filename)
    if parser.has_section(section):
        return {param[0]: param[1] for param in parser.items(section)}
    else:
        raise Exception(f"Section {section} not found in {filename}")

def extract_cnic_data(text):
    print("[DEBUG] OCR Raw Output:")
    print(text)

    data = {
        "name": "-",
        "father_name": "-",
        "cnic_number": "-",
        "dob": "-",
        "issue_date": "-",
        "expiry_date": "-",
        "gender": "-",
    }

    lines = [line.strip() for line in text.split("\n") if line.strip()]
    lines_lower = [line.lower() for line in lines]

    identity_idx = next((i for i, line in enumerate(lines_lower) if "identity number" in line), None)
    cnic_found = False

    if identity_idx is not None and identity_idx + 1 < len(lines):
        line_after_identity = lines[identity_idx + 1].replace(" ", "").replace(".", "-")
        possible_cnic = extract_cnic(line_after_identity)
        if possible_cnic and possible_cnic != "-":
            data["cnic_number"] = possible_cnic
            cnic_found = True

    if not cnic_found:
        cleaned_text = text.replace(" ", "").replace(".", "-")
        fallback_cnic = extract_cnic(cleaned_text)
        if fallback_cnic and fallback_cnic != "-":
            data["cnic_number"] = fallback_cnic
        else:
            data["cnic_number"] = "-"

    text = text.replace(",", ".")
    date_matches = re.findall(r'\d{2}\.\d{2}\.\d{4}', text)
    if date_matches:
        data["dob"] = date_matches[0] if len(date_matches) > 0 else "-"
        data["issue_date"] = date_matches[1] if len(date_matches) > 1 else "-"
        data["expiry_date"] = date_matches[2] if len(date_matches) > 2 else "-"

    possible_name = fuzzy_search("name", lines)
    possible_father = fuzzy_search("father", lines)

    if possible_name:
        if not get_close_matches(possible_name.lower(), ["pakistan", "national identity card"], cutoff=0.8):
            data["name"] = possible_name

    if possible_father:
        data["father_name"] = possible_father

    gender_keywords = ["gender", "gendef", "gend", "genfer", "gander"]
    gender_idx = next((i for i, line in enumerate(lines_lower) if any(key in line for key in gender_keywords)), None)

    if gender_idx is not None and gender_idx + 1 < len(lines):
        gender_line = lines[gender_idx + 1].strip().upper()
        if gender_line in ["M", "MALE"]:
            data["gender"] = "Male"
        elif gender_line in ["F", "FEMALE"]:
            data["gender"] = "Female"
        else:
            data["gender"] = "-"
    else:
        data["gender"] = "-"
    return data

# ==================== Routes ====================

@app.route('/')
def home():
    return render_template("index.html")

@app.route('/ocr', methods=['POST'])
def handle_ocr():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    image_file = request.files['image']
    try:
        img = Image.open(image_file.stream).convert("RGB")
        preprocessed = preprocess_image(img)

        results = reader.readtext(np.array(preprocessed), detail=1)
        clean_lines = [res[1].strip() for res in results if res[2] >= 0.40 and is_english_text(res[1])]

        extracted_text = "\n".join(clean_lines)
        extracted_data = extract_cnic_data(extracted_text)

        # Debug: Print extracted data after OCR
        print("[DEBUG] Extracted Data after OCR:")
        print(extracted_data)

        nadra_verification = False
        nadra_error = None
        try:
            nadra_verification = verify_with_nadra(
                extracted_data["cnic_number"],
                extracted_data["name"],
                extracted_data["dob"]
            )
            # Save only if NADRA verification is successful
            save_to_postgres(extracted_data)
        except NADRAAccessError as e:
            nadra_error = str(e)
        except Exception as e:
            nadra_error = f"Unexpected NADRA error: {e}"

        # Always return extracted data, raw_text, and nadra_verification status
        response = {
            "raw_text": extracted_text.strip(),
            "data": extracted_data,
            "nadra_verification": nadra_verification
        }
        if nadra_error:
            response["nadra_error"] = nadra_error
        return jsonify(response)

    except Exception as e:
        print(f"[ERROR] Exception in /ocr: {e}")
        return jsonify({'error': f'Failed to process image: {str(e)}'}), 500


@app.route('/test')
def test_static_cnic():
    try:
        results = reader.readtext('cnic.png', detail=0)
        clean_lines = [line.strip() for line in results if is_english_text(line) and line.strip()]
        text = "\n".join(clean_lines)
        print("\n".join(clean_lines))

        extracted_data = extract_cnic_data(text)

        # Debug: Print extracted data after OCR
        print("[DEBUG] Extracted Data after OCR:")
        print(extracted_data)

        return jsonify({
            "raw_text": text,
            "data": extracted_data
        })
    except Exception as e:
        return jsonify({'error': f'Failed to process static image: {str(e)}'}), 500

@app.route('/face_verification')
def face_verification_page():
    return render_template("face_verification.html")

@app.route('/face_verify', methods=['POST'])
def face_verify():
    if 'cnic_image' not in request.files:
        return jsonify({'verified': False, 'reason': 'CNIC image missing'}), 400
    cnic_image = request.files['cnic_image']
    face_images = []
    for i in range(5):
        key = f'face_image_{i}'
        if key not in request.files:
            return jsonify({'verified': False, 'reason': f'Face image {i+1} missing'}), 400
        face_images.append(request.files[key])

    temp_dir = "temp_verification"
    os.makedirs(temp_dir, exist_ok=True)
    cnic_path = os.path.join(temp_dir, "cnic.jpg")
    cnic_image.save(cnic_path)
    face_paths = []
    for idx, img in enumerate(face_images):
        path = os.path.join(temp_dir, f"face_{idx}.jpg")
        img.save(path)
        face_paths.append(path)

    # Simulate official DB face as CNIC face for this demo
    official_db_face_path = cnic_path

    # Step 1: Official DB face vs CNIC face
    official_verified, official_msg = verify_person(official_db_face_path, [cnic_path], threshold=0.6)
    if not official_verified:
        for p in [cnic_path] + face_paths:
            os.remove(p)
        return jsonify({'verified': False, 'reason': 'Official DB face does not match CNIC face.'})

    # Step 2: CNIC face vs 5 user images
    user_verified, user_msg = verify_person(cnic_path, face_paths, threshold=0.6)
    for p in [cnic_path] + face_paths:
        os.remove(p)
    if user_verified:
        token = secrets.token_hex(8)
        return jsonify({'verified': True, 'token': token, 'msg': user_msg})
    else:
        return jsonify({'verified': False, 'reason': user_msg})

# ==================== Run ====================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
