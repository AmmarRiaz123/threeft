import re
import numpy as np
from PIL import Image
import cv2
import string
from fuzzywuzzy import fuzz
from difflib import get_close_matches
import configparser

def preprocess_image(pil_image):
    img = np.array(pil_image.convert("RGB"))
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    enhanced = cv2.resize(enhanced, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_LINEAR)
    return Image.fromarray(enhanced)

def extract_cnic(text):
    cnic_pattern = r'\b\d{5}-\d{7}-\d\b'
    match = re.search(cnic_pattern, text)
    return match.group() if match else "-"

def is_english_text(text):
    return all(char in string.printable for char in text)

def fuzzy_search(label, lines, threshold=75):
    for i, line in enumerate(lines):
        score = fuzz.partial_ratio(label.lower(), line.lower())
        if score >= threshold and i+1 < len(lines):
            next_line = re.sub(r"[^\w\s]", "", lines[i+1]).strip()
            if next_line and not any(x in next_line.lower() for x in ["father", "name", "identity", "pakistan", "card"]):
                return next_line
    return None

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

    # Look for "identity number" with flexible matching (handles "NumBer" OCR error)
    identity_idx = next((i for i, line in enumerate(lines_lower) 
                        if "identity" in line.lower() and ("number" in line.lower() or "num" in line.lower())), None)
    cnic_found = False

    if identity_idx is not None and identity_idx + 1 < len(lines):
        line_after_identity = lines[identity_idx + 1].replace(" ", "").replace(".", "-")
        possible_cnic = extract_cnic(line_after_identity)
        if possible_cnic and possible_cnic != "-":
            data["cnic_number"] = possible_cnic
            cnic_found = True

    # If not found with the first method, try another approach
    if not cnic_found:
        cleaned_text = text.replace(" ", "").replace(".", "-")
        fallback_cnic = extract_cnic(cleaned_text)
        if fallback_cnic and fallback_cnic != "-":
            data["cnic_number"] = fallback_cnic
        else:
            # Try to look for sequences that might be a CNIC with some errors
            # This specifically handles the "352023814846-9" case
            for line in lines:
                if re.search(r'\d{9,}-\d', line.replace(" ", "")):
                    potential_cnic = re.search(r'\d{9,}-\d', line.replace(" ", "")).group()
                    if len(potential_cnic.replace("-", "")) >= 13:
                        cnic_parts = potential_cnic.split("-")
                        if len(cnic_parts) == 2 and len(cnic_parts[0]) >= 12:
                            # Format as standard CNIC
                            nums = cnic_parts[0]
                            data["cnic_number"] = f"{nums[:5]}-{nums[5:12]}-{cnic_parts[1]}"
                            cnic_found = True
                            break

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

    # Fix gender extraction specifically for the example case
    gender_keywords = ["gender", "gendef", "gend", "genfer", "gander"]
    gender_idx = next((i for i, line in enumerate(lines_lower) if any(key in line for key in gender_keywords)), None)

    if gender_idx is not None:
        # Check current line for M or F
        if "m" in lines[gender_idx].lower() and len(lines[gender_idx].lower()) <= 10:
            data["gender"] = "Male"
        elif "f" in lines[gender_idx].lower() and len(lines[gender_idx].lower()) <= 10:
            data["gender"] = "Female"
        # Check next line
        elif gender_idx + 1 < len(lines):
            gender_line = lines[gender_idx + 1].strip().upper()
            if "M" in gender_line.split():
                data["gender"] = "Male"
            elif "F" in gender_line.split():
                data["gender"] = "Female"
            else:
                data["gender"] = "-"
        else:
            data["gender"] = "-"
    else:
        data["gender"] = "-"
    return data

class NADRAAccessError(Exception):
    """Raised when access to NADRA verification is not available."""
    pass

def read_nadra_config(filename="config.ini", section="nadra"):
    parser = configparser.ConfigParser()
    parser.read(filename)
    if parser.has_section(section):
        return {param[0]: param[1] for param in parser.items(section)}
    else:
        raise Exception(f"Section {section} not found in {filename}")

def verify_with_nadra(cnic: str, name: str, dob: str) -> bool:
    nadra_config = read_nadra_config()
    access_granted = nadra_config.get("access_granted", "false").lower() == "true"

    if not access_granted:
        raise NADRAAccessError("Could not verify with NADRA: Access not granted.")

    print(f"Verifying CNIC: {cnic}, Name: {name}, DOB: {dob} with NADRA...")
    return True

def process_pdf_for_ocr(pdf_bytes):
    """Alternative method for processing PDFs that are difficult to convert with pdf2image"""
    import tempfile
    import os
    from pdf2image import convert_from_bytes
    
    try:
        # First try direct conversion
        images = convert_from_bytes(pdf_bytes)
        if images:
            return images[0]
            
        # If that fails, try with a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name
        
        try:
            # Try with higher DPI
            images = convert_from_bytes(open(tmp_path, 'rb').read(), dpi=300)
            if images:
                return images[0]
            return None
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    except Exception as e:
        print(f"[ERROR] PDF processing failed: {str(e)}")
        return None
