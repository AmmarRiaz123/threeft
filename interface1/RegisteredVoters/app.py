from flask import Flask
from flask_cors import CORS
from scan_qr_api import scan_qr_bp
from voter_info_api import voter_info_bp
from voter_vote_api import voter_vote_bp

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Register blueprints
app.register_blueprint(scan_qr_bp)
app.register_blueprint(voter_info_bp)
app.register_blueprint(voter_vote_bp)

if __name__ == '__main__':
    app.run(debug=True)
