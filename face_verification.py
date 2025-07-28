import face_recognition
from PIL import Image
import numpy as np

def extract_face(image_path):
    """Extracts the largest face from an image file."""
    image = face_recognition.load_image_file(image_path)
    face_locations = face_recognition.face_locations(image)
    if not face_locations:
        return None
    # Take the largest face (in case of multiple)
    top, right, bottom, left = max(face_locations, key=lambda box: (box[2]-box[0]) * (box[1]-box[3]))
    face_image = image[top:bottom, left:right]
    return face_image

def get_face_encoding(face_image):
    """Returns the face encoding for a cropped face image."""
    encodings = face_recognition.face_encodings(face_image)
    if encodings:
        return encodings[0]
    return None

def verify_person(cnic_image_path, person_image_paths, threshold=0.6):
    """
    Verifies if the person in the CNIC image matches the majority of the 5 provided images.
    Returns True if verified, False otherwise.
    """
    cnic_face = extract_face(cnic_image_path)
    if cnic_face is None:
        return False, "No face found in CNIC image."
    cnic_encoding = get_face_encoding(cnic_face)
    if cnic_encoding is None:
        return False, "Could not encode face in CNIC image."

    matches = 0
    for img_path in person_image_paths:
        person_face = extract_face(img_path)
        if person_face is None:
            continue
        person_encoding = get_face_encoding(person_face)
        if person_encoding is None:
            continue
        distance = np.linalg.norm(cnic_encoding - person_encoding)
        if distance < threshold:
            matches += 1

    # Require at least 3 out of 5 matches
    verified = matches >= 3
    return verified, f"{matches}/5 faces matched."

# Example usage:
# verified, msg = verify_person("cnic.jpg", ["img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"])
# print(verified, msg)
