import psycopg2
import configparser
from flask import Blueprint, jsonify

voter_info_bp = Blueprint('voter_info', __name__)

config = configparser.ConfigParser()
config.read('config.ini')
DATABASE_URL = config['postgresql']['DATABASE_URL']

def get_db_conn():
    return psycopg2.connect(DATABASE_URL)

@voter_info_bp.route('/voter/<qr_id>', methods=['GET'])
def get_voter_info(qr_id):
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT full_name, father_name, date_of_birth, gender, address, has_voted, verified_at, voted_at, created_at
            FROM registered_voters WHERE qr_id = %s
        """, (qr_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return jsonify({'error': 'Voter not found.'}), 404
        keys = ['full_name', 'father_name', 'date_of_birth', 'gender', 'address', 'has_voted', 'verified_at', 'voted_at', 'created_at']
        return jsonify(dict(zip(keys, row)))
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
