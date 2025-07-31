import face_recognition
import numpy as np
import tempfile
import os

def extract_single_face_encoding(image_path):
    """Extract and encode the largest face from an image file. Returns None if no face found."""
    image = face_recognition.load_image_file(image_path)
    # Try both CNN and HOG models for robustness
    face_locations = face_recognition.face_locations(image, model="cnn")
    if not face_locations:
        face_locations = face_recognition.face_locations(image, model="hog")
    if not face_locations:
        print(f"[DEBUG] No face found in {image_path}")
        return None
    # Take the largest face (in case of multiple)
    top, right, bottom, left = max(face_locations, key=lambda box: (box[2]-box[0]) * (box[1]-box[3]))
    # Instead of cropping, use the full image and pass the face location to face_encodings
    encodings = face_recognition.face_encodings(image, known_face_locations=[(top, right, bottom, left)])
    if not encodings:
        print(f"[DEBUG] Could not encode face in {image_path}")
        return None
    return encodings[0]

def verify_person(cnic_image_file, face_image_files, threshold=0.6):
    """
    cnic_image_file: file-like object (from request.files['cnic_image'])
    face_image_files: list of file-like objects (from request.files.getlist or similar)
    Returns (verified: bool, message: str)
    """
    # Save CNIC image to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as cnic_tmp:
        cnic_image_file.save(cnic_tmp)
        cnic_path = cnic_tmp.name

    cnic_encoding = extract_single_face_encoding(cnic_path)
    os.remove(cnic_path)
    if cnic_encoding is None:
        return False, "No face found or could not encode face in CNIC image."

    matches = 0
    total = 0
    for face_file in face_image_files:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as face_tmp:
            face_file.save(face_tmp)
            face_path = face_tmp.name
        person_encoding = extract_single_face_encoding(face_path)
        os.remove(face_path)
        if person_encoding is None:
            continue
        distance = np.linalg.norm(cnic_encoding - person_encoding)
        if distance < threshold:
            matches += 1
        total += 1

    # Require at least 3 out of 5 matches
    verified = matches >= 3
    return verified, f"{matches}/{total} faces matched."

# Example usage in Flask route:
# from flask import request, jsonify
# @app.route('/face_verify', methods=['POST'])
# def face_verify():
#     cnic_image = request.files['cnic_image']
#     face_images = [request.files[f'face_image_{i}'] for i in range(5)]
#     verified, msg = verify_person(cnic_image, face_images)
#     return jsonify({'verified': verified, 'reason': msg})

if __name__ == "__main__":
    # TESTING CODE
    # Place 1 CNIC image and 5 face images in the same directory as this script.
    # Update the filenames below to match your test images.
    cnic_image_path = "cnic.png"
    face_image_paths = [
        "test_face1.jpg",
        "test_face2.jpg",
        "test_face3.jpg",
        "test_face4.jpg",
        "test_face5.jpg"
    ]

    # Ensure working directory is correct
    import sys
    import os
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print("Current working directory:", os.getcwd())

    # Check if all files exist before running the test
    missing = []
    if not os.path.isfile(cnic_image_path):
        missing.append(cnic_image_path)
    for p in face_image_paths:
        if not os.path.isfile(p):
            missing.append(p)
    if missing:
        print("ERROR: The following test image files are missing:")
        for m in missing:
            print(" -", m)
        print("Files in directory:", os.listdir(os.getcwd()))
        sys.exit(1)

    class DummyFile:
        def __init__(self, path):
            self.path = path
        def save(self, fp):
            with open(self.path, "rb") as src, open(fp.name, "wb") as dst:
                dst.write(src.read())

    cnic_file = DummyFile(cnic_image_path)
    face_files = [DummyFile(p) for p in face_image_paths]

    verified, msg = verify_person(cnic_file, face_files)
    print("Verified:", verified)
    print("Message:", msg)
    verified, msg = verify_person(cnic_file, face_files)
    print("Verified:", verified)
    print("Message:", msg)
