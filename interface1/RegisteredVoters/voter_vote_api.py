import psycopg2
import configparser
from flask import Blueprint, jsonify

voter_vote_bp = Blueprint('voter_vote', __name__)

config = configparser.ConfigParser()
config.read('config.ini')
DATABASE_URL = config['postgresql']['DATABASE_URL']

def get_db_conn():
    return psycopg2.connect(DATABASE_URL)

@voter_vote_bp.route('/voter/<qr_id>/vote', methods=['POST'])
def vote(qr_id):
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("SELECT has_voted FROM registered_voters WHERE qr_id = %s", (qr_id,))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Voter not found.'}), 404
        if row[0]:
            cur.close()
            conn.close()
            return jsonify({'message': 'Voter has already voted.'})
        cur.execute("""
            UPDATE registered_voters
            SET has_voted = TRUE, voted_at = CURRENT_TIMESTAMP
            WHERE qr_id = %s
        """, (qr_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'message': 'Voter status updated to voted.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
