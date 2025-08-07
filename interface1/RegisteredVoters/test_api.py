import os
import io
import pytest
from PIL import Image
from flask import json
from RegisteredVoters.app import app
import configparser

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_scan_qr_success(client, tmp_path):
    # Generate a QR code image for testing
    import qrcode
    qr_id = "TESTQR123"
    img = qrcode.make(qr_id)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    data = {'image': (buf, 'test.png')}
    resp = client.post('/scan-qr', content_type='multipart/form-data', data=data)
    assert resp.status_code == 200
    assert resp.get_json()['qr_id'] == qr_id

def test_scan_qr_no_image(client):
    resp = client.post('/scan-qr', content_type='multipart/form-data', data={})
    assert resp.status_code == 400

def test_voter_info_not_found(client):
    resp = client.get('/voter/DOESNOTEXIST')
    assert resp.status_code == 404

def test_voter_vote_not_found(client):
    resp = client.post('/voter/DOESNOTEXIST/vote')
    assert resp.status_code == 404

def test_voter_info_and_vote_flow(client):
    # Insert a test voter directly into DB for integration test
    import psycopg2
    config = configparser.ConfigParser()
    config.read('config.ini')
    DATABASE_URL = config['postgresql']['DATABASE_URL']
    qr_id = "TESTQR456"
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("DELETE FROM registered_voters WHERE qr_id = %s", (qr_id,))
    cur.execute("""
        INSERT INTO registered_voters (qr_id, full_name, gender, address)
        VALUES (%s, %s, %s, %s)
    """, (qr_id, "Test User", "Other", "Test Address"))
    conn.commit()
    cur.close()
    conn.close()

    # Test GET voter info
    resp = client.get(f'/voter/{qr_id}')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['full_name'] == "Test User"
    assert data['has_voted'] is False

    # Test POST vote
    resp = client.post(f'/voter/{qr_id}/vote')
    assert resp.status_code == 200
    assert resp.get_json()['message'] == "Voter status updated to voted."

    # Test POST vote again (should say already voted)
    resp = client.post(f'/voter/{qr_id}/vote')
    assert resp.status_code == 200
    assert resp.get_json()['message'] == "Voter has already voted."
    assert resp.status_code == 200
    assert resp.get_json()['message'] == "Voter has already voted."
