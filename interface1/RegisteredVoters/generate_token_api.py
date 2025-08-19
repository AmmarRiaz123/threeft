from flask import Blueprint, request, jsonify
import psycopg2
import configparser
import secrets
import base64

generate_token_bp = Blueprint('generate_token', __name__)

config = configparser.ConfigParser()
config.read('config.ini')
DATABASE_URL = config['postgresql']['DATABASE_URL']

def get_db_conn():
    return psycopg2.connect(DATABASE_URL)

def encrypt_token(token):
    # Simple base64 encoding for demonstration; replace with real encryption in production
    return base64.urlsafe_b64encode(token.encode()).decode()

@generate_token_bp.route('/generate-token/<qr_id>', methods=['POST'])
def generate_token(qr_id):
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        
        # Check if voter exists and hasn't voted
        cur.execute("""
            SELECT has_voted, token 
            FROM registered_voters 
            WHERE qr_id = %s
        """, (qr_id,))
        row = cur.fetchone()
        
        if not row:
            return jsonify({'error': 'Voter not found.'}), 404
            
        has_voted, existing_token = row
        
        if has_voted:
            return jsonify({'error': 'Voter has already voted.'}), 400
            
        if existing_token:
            return jsonify({'token': existing_token, 'message': 'Using existing token'})

        # Generate new token
        token = secrets.token_urlsafe(32)
        encrypted_token = encrypt_token(token)

        # Store token in registered_voters
        cur.execute("""
            UPDATE registered_voters 
            SET token = %s, 
                token_generated_at = CURRENT_TIMESTAMP
            WHERE qr_id = %s
        """, (encrypted_token, qr_id))
        
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'token': encrypted_token,
            'printable': True,
            'message': 'New token generated'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
