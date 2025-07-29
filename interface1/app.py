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

        # Try NADRA verification using extracted data
        try:
            verification_result = verify_with_nadra(
                extracted_data["cnic_number"],
                extracted_data["name"],
                extracted_data["dob"]
            )

        except NADRAAccessError as e:
            return jsonify({
                "error": "NADRA verification failed",
                "reason": str(e),
                "data": extracted_data,
                "raw_text": extracted_text.strip()
            }), 503  # Service Unavailable

        # Save only if NADRA verification is successful
        save_to_postgres(extracted_data)

        return jsonify({
            "raw_text": extracted_text.strip(),
            "data": extracted_data,
            "nadra_verification": verification_result
        })

    except Exception as e:
        return jsonify({'error': f'Failed to process image: {str(e)}'}), 500


@app.route('/test')
def test_static_cnic():
    try:
        results = reader.readtext('cnic.png', detail=0)
        clean_lines = [line.strip() for line in results if is_english_text(line) and line.strip()]
        text = "\n".join(clean_lines)
        print("\n".join(clean_lines))

        extracted_data = extract_cnic_data(text)
        return jsonify({
            "raw_text": text,
            "data": extracted_data
        })
    except Exception as e:
        return jsonify({'error': f'Failed to process static image: {str(e)}'}), 500

# ==================== Run ====================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)                is this all good
