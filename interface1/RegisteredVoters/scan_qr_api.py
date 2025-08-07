from flask import Blueprint, request, jsonify
from pyzbar.pyzbar import decode
from PIL import Image
import io
import configparser

scan_qr_bp = Blueprint('scan_qr', __name__)

# Load config (for consistency, not used here)
config = configparser.ConfigParser()
config.read('config.ini')
DATABASE_URL = config['postgresql']['DATABASE_URL']

@scan_qr_bp.route('/scan-qr', methods=['POST'])
def scan_qr():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded.'}), 400
    file = request.files['image']
    try:
        img = Image.open(file.stream)
        decoded_objs = decode(img)
        if not decoded_objs:
            return jsonify({'error': 'No QR code found.'}), 400
        qr_id = decoded_objs[0].data.decode('utf-8')
        return jsonify({'qr_id': qr_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
