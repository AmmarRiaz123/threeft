from flask import Blueprint, request, jsonify
import numpy as np
import cv2
import face_recognition
import psycopg2
import configparser

verify_bp = Blueprint('verify_identity', __name__)

# Load DB config and threshold
config = configparser.ConfigParser()
config.read('config.ini')
DATABASE_URL = config['postgresql']['DATABASE_URL']
THRESHOLD = float(config['face_verification'].get('THRESHOLD', 0.6)) if 'face_verification' in config else 0.6

def get_db_conn():
    return psycopg2.connect(DATABASE_URL)

def extract_embedding(image):
    """Extract the first face embedding from an image (numpy array, RGB)."""
    encodings = face_recognition.face_encodings(image)
    if not encodings:
        return None
    return encodings[0]

def average_embeddings(embeddings):
    """Average a list of embeddings (numpy arrays)."""
    if not embeddings:
        return None
    return np.mean(embeddings, axis=0)

def verify_faces(embedding1, embedding2, threshold=0.6):
    """Compare two embeddings, return True if distance < threshold."""
    if embedding1 is None or embedding2 is None:
        return False, None
    distance = np.linalg.norm(embedding1 - embedding2)
    # Convert numpy.bool_ to Python bool
    return bool(distance < threshold), float(distance)

def load_image(file_storage):
    """Load image from Flask file storage and convert to RGB."""
    file_bytes = np.frombuffer(file_storage.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image file")
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return rgb_img

def store_live_embedding(qr_id, live_embedding):
    """Store the averaged live embedding and its shape/dtype in the DB for future verification."""
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        shape_str = str(live_embedding.shape)
        dtype_str = str(live_embedding.dtype)
        cur.execute("""
            UPDATE registered_voters
            SET live_embedding = %s,
                live_embedding_shape = %s,
                live_embedding_dtype = %s
            WHERE qr_id = %s
        """, (psycopg2.Binary(live_embedding.tobytes()), shape_str, dtype_str, qr_id))
        conn.commit()
        cur.close()
        conn.close()
        return True, None
    except Exception as e:
        return False, str(e)

@verify_bp.route('/verify_identity', methods=['POST'])
def verify_identity():
    try:
        qr_id = request.form.get('qr_id')
        if not qr_id:
            return jsonify({'error': 'Missing qr_id'}), 400

        cnic_file = request.files.get('cnic_image')
        live_files = request.files.getlist('live_images[]')
        if not cnic_file or len(live_files) != 5:
            return jsonify({'error': 'Please provide one CNIC image and five live images.'}), 400

        # Extract CNIC embedding
        try:
            cnic_img = load_image(cnic_file)
        except Exception as e:
            return jsonify({'error': f'Error loading CNIC image: {str(e)}'}), 400
        cnic_embedding = extract_embedding(cnic_img)
        if cnic_embedding is None:
            return jsonify({'error': 'No face detected in CNIC image.'}), 400

        # Extract live embeddings
        live_embeddings = []
        live_details = []
        for idx, live_file in enumerate(live_files):
            try:
                live_img = load_image(live_file)
                emb = extract_embedding(live_img)
                if emb is None:
                    live_details.append({'image': idx+1, 'success': False, 'reason': 'No face detected'})
                else:
                    live_embeddings.append(emb)
                    live_details.append({'image': idx+1, 'success': True})
            except Exception as e:
                live_details.append({'image': idx+1, 'success': False, 'reason': f'Error loading image: {str(e)}'})

        if len(live_embeddings) < 1:
            return jsonify({
                'verified': False,
                'error': 'Face detection failed for all images.',
                'details': live_details
            }), 400

        # Average live embeddings
        try:
            avg_live_embedding = average_embeddings(live_embeddings)
        except Exception as e:
            return jsonify({'error': f'Error averaging embeddings: {str(e)}'}), 500

        # Compare averaged live embedding to CNIC embedding
        try:
            verified, distance = verify_faces(avg_live_embedding, cnic_embedding, threshold=THRESHOLD)
        except Exception as e:
            return jsonify({'error': f'Error comparing embeddings: {str(e)}'}), 500

        # If verified, store averaged embedding in DB
        stored = False
        store_error = None
        if verified:
            stored, store_error = store_live_embedding(qr_id, avg_live_embedding)

        response = {
            'verified': bool(verified),
            'distance': float(distance),
            'threshold': float(THRESHOLD),
            'live_embeddings_used': len(live_embeddings),
            'details': live_details,
            'embedding_stored': bool(stored)
        }
        
        # Add more detailed messages
        if verified:
            response['message'] = 'Identity verification successful!'
        else:
            response['error'] = 'Face verification failed. Distance above threshold.'
            
        if store_error:
            response['embedding_store_error'] = store_error

        return jsonify(response)
    except Exception as e:
        return jsonify({
            'verified': False,
            'error': f'Verification failed: {str(e)}',
            'trace': traceback.format_exc()
        }), 500
