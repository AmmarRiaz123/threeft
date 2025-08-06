import face_recognition
import numpy as np
import tempfile
import os

def extract_single_face_encoding(image_path, use_cnn_fallback=False):
    image = face_recognition.load_image_file(image_path)
    face_locations = face_recognition.face_locations(image, model="hog")
    if not face_locations and use_cnn_fallback:
        face_locations = face_recognition.face_locations(image, model="cnn")
    if not face_locations:
        return None
    top, right, bottom, left = max(face_locations, key=lambda box: (box[2]-box[0]) * (box[1]-box[3]))
    encodings = face_recognition.face_encodings(image, known_face_locations=[(top, right, bottom, left)])
    if not encodings:
        return None
    return encodings[0]

def verify_person(cnic_image_file, face_image_files, threshold=0.6):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as cnic_tmp:
        cnic_image_file.save(cnic_tmp)
        cnic_path = cnic_tmp.name

    cnic_encoding = extract_single_face_encoding(cnic_path, use_cnn_fallback=False)
    os.remove(cnic_path)
    if cnic_encoding is None:
        return False, "No face found or could not encode face in CNIC image."

    matches = 0
    total = 0
    for face_file in face_image_files:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as face_tmp:
            face_file.save(face_tmp)
            face_path = face_tmp.name
        person_encoding = extract_single_face_encoding(face_path, use_cnn_fallback=False)
        os.remove(face_path)
        if person_encoding is None:
            continue
        distance = np.linalg.norm(cnic_encoding - person_encoding)
        if distance < threshold:
            matches += 1
        total += 1

    verified = matches >= 3
    return verified, f"{matches}/{total} faces matched."
