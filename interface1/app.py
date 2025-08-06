from flask import Flask, request, jsonify, render_template, send_file
from PIL import Image
import easyocr
import os
import numpy as np
import secrets
import io

# Import all utility functions
from ocr_utils import (
    preprocess_image,
    extract_cnic_data,
    is_english_text,
    verify_with_nadra,
    NADRAAccessError
)
from face_verification_utils import verify_person
from db_utils import save_to_postgres

app = Flask(__name__)

# Initialize OCR reader once for the application
reader = easyocr.Reader(['en', 'ur'], gpu=False)

# ==================== Routes ====================
@app.route('/')
def home():
    return render_template("index.html")

@app.route('/ocr', methods=['POST'])
def handle_ocr():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    image_file = request.files['image']
    filename = image_file.filename.lower()
    
    # Check if file is an image
    if not any(filename.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']):
        return jsonify({'error': 'Only image files are supported'}), 400
    
    try:
        img = Image.open(image_file.stream).convert("RGB")

        # Process the image using utility functions
        preprocessed = preprocess_image(img)
        # Ensure preprocessed is correctly converted to numpy array
        results = reader.readtext(np.array(preprocessed), detail=1)
        clean_lines = [res[1].strip() for res in results if res[2] >= 0.40 and is_english_text(res[1])]
        extracted_text = "\n".join(clean_lines)

        extracted_data = extract_cnic_data(extracted_text)

        print("[DEBUG] Extracted Data after OCR:")
        print(extracted_data)

        # Verify with NADRA
        nadra_verification = False
        nadra_error = None
        try:
            nadra_verification = verify_with_nadra(
                extracted_data["cnic_number"],
                extracted_data["name"],
                extracted_data["dob"]
            )
            # Save to database
            save_to_postgres(extracted_data)
        except NADRAAccessError as e:
            nadra_error = str(e)
        except Exception as e:
            nadra_error = f"Unexpected NADRA error: {e}"

        # Return response
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

        extracted_data = extract_cnic_data(text)
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

    # Get files from request
    cnic_image = request.files['cnic_image']
    face_images = []
    for i in range(5):
        key = f'face_image_{i}'
        if key not in request.files:
            return jsonify({'verified': False, 'reason': f'Face image {i+1} missing'}), 400
        face_images.append(request.files[key])

    # Prepare temporary directory and files
    temp_dir = "temp_verification"
    os.makedirs(temp_dir, exist_ok=True)
    cnic_path = os.path.join(temp_dir, "cnic.jpg")
    cnic_image.save(cnic_path)

    face_paths = []
    for idx, img in enumerate(face_images):
        path = os.path.join(temp_dir, f"face_{idx}.jpg")
        img.save(path)
        face_paths.append(path)

    # Use CNIC as "official DB" face for now
    official_db_face_path = cnic_path

    # Step 1: Official DB face vs CNIC face
    official_verified, official_msg = verify_person(official_db_face_path, [cnic_path], threshold=0.6)
    if not official_verified:
        for p in [cnic_path] + face_paths:
            os.remove(p)
        return jsonify({'verified': False, 'reason': 'Official DB face does not match CNIC face.'})

    # Step 2: CNIC vs user faces
    user_verified, user_msg = verify_person(cnic_path, face_paths, threshold=0.6)

    # Cleanup
    for p in [cnic_path] + face_paths:
        os.remove(p)

    if user_verified:
        token = secrets.token_hex(8)
        return jsonify({'verified': True, 'token': token, 'msg': user_msg})
    else:
        return jsonify({'verified': False, 'reason': user_msg})

# ==================== Run App ====================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
