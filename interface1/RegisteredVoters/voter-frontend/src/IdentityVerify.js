import React, { useState } from 'react';

const API_BASE = 'http://localhost:5000';

export default function IdentityVerify({ onVerified, qrId }) {
  const [cnicFile, setCnicFile] = useState(null);
  const [liveFiles, setLiveFiles] = useState([null, null, null, null, null]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleLiveChange = (idx, file) => {
    const files = [...liveFiles];
    files[idx] = file;
    setLiveFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (!qrId || !cnicFile || liveFiles.some(f => !f)) {
      setResult({ error: 'Please upload CNIC image and all 5 live images.' });
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('qr_id', qrId);
    formData.append('cnic_image', cnicFile);
    liveFiles.forEach((file, idx) => {
      formData.append('live_images[]', file, `live${idx + 1}.jpg`);
    });

    try {
      const resp = await fetch(`${API_BASE}/verify_identity`, {
        method: 'POST',
        body: formData,
      });
      const data = await resp.json();
      setResult(data);
      if (resp.ok && data.verified) {
        // Wait 2 seconds to show success message before proceeding
        setTimeout(() => {
          onVerified(qrId);
        }, 2000);
      }
    } catch (err) {
      setResult({ 
        error: 'Network or server error.',
        verified: false 
      });
    }
    setLoading(false);
  };

  return (
    <div style={{
      maxWidth: 500,
      margin: '2rem auto',
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      padding: '2rem',
      fontFamily: 'Inter, Arial, sans-serif'
    }}>
      <h2 style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 700 }}>Voter Identity Verification</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Upload CNIC Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setCnicFile(e.target.files[0])}
            style={{ width: '100%', marginTop: 4 }}
            required
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Upload 5 Live Images:</label>
          {[0,1,2,3,4].map(idx => (
            <input
              key={idx}
              type="file"
              accept="image/*"
              onChange={e => handleLiveChange(idx, e.target.files[0])}
              style={{ display: 'block', marginTop: 4, marginBottom: 4 }}
              required
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#22c55e',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 24px',
            fontWeight: 600,
            width: '100%',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Verifying...' : 'Verify Identity'}
        </button>
      </form>
      {result && (
        <div style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 8,
          background: result.verified ? '#dcfce7' : '#fee2e2',
          color: result.verified ? '#22c55e' : '#ef4444',
          fontWeight: 500
        }}>
          {result.error ? (
            <div>
              <div style={{fontSize: '1.1em', marginBottom: '0.5rem'}}>Verification Failed</div>
              <div>{result.error}</div>
            </div>
          ) : result.verified ? (
            <div>
              <div style={{fontSize: '1.1em', marginBottom: '0.5rem'}}>✓ Identity Verified Successfully!</div>
              <div>Proceeding to voter verification in a moment...</div>
            </div>
          ) : (
            <div>
              <div style={{fontSize: '1.1em', marginBottom: '0.5rem'}}>Verification Failed</div>
              {result.details && result.details.map((d, i) =>
                <div key={i}>
                  Image {d.image}: {d.success ? 'Face detected' : `Error: ${d.reason}`}
                </div>
              )}
              {result.distance && <div>Match distance: {result.distance.toFixed(2)}</div>}
              <div style={{marginTop: '0.5rem'}}>Please try again with clearer photos.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

