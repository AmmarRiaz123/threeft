import React, { useState, useRef } from 'react';

const API_BASE = 'http://localhost:5000';

export default function IdentityVerify({ onVerified, qrId }) {
  const [cnicFile, setCnicFile] = useState(null);
  const [liveFiles, setLiveFiles] = useState([null, null, null, null, null]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const cnicInputRef = useRef(null);
  const liveInputRef = useRef(null);

  const handleLiveUpload = (e) => {
    const files = Array.from(e.target.files);
    const currentFiles = [...liveFiles];
    let emptySlotFound = false;

    // Try to fill empty slots first
    files.forEach(file => {
      const emptyIndex = currentFiles.findIndex(f => f === null);
      if (emptyIndex !== -1) {
        currentFiles[emptyIndex] = file;
        emptySlotFound = true;
      }
    });

    // If no empty slots found and trying to upload more than remaining slots
    if (!emptySlotFound && files.length > currentFiles.filter(f => f === null).length) {
      alert('Maximum 5 photos allowed. Clear some photos first.');
      return;
    }

    setLiveFiles(currentFiles);
  };

  const handleCnicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCnicFile(file);
    }
  };

  const clearLiveFiles = () => {
    setLiveFiles([null, null, null, null, null]);
    if (liveInputRef.current) {
      liveInputRef.current.value = '';
    }
  };

  const clearLiveFile = (index) => {
    const newFiles = [...liveFiles];
    newFiles[index] = null;
    setLiveFiles(newFiles);
    if (liveInputRef.current) {
      liveInputRef.current.value = '';
    }
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
      maxWidth: 800,
      margin: '2rem auto',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)',
      padding: '2rem',
      fontFamily: 'Inter, Arial, sans-serif'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          color: '#3b82f6', 
          fontWeight: 700,
          fontSize: '1.8rem',
          marginBottom: '2rem'
        }}>
          Face Verification
        </h2>

        <form onSubmit={handleSubmit}>
          {/* CNIC Image Upload Card */}
          <div style={{
            border: '2px dashed #d1d5db',
            borderRadius: 12,
            padding: '2rem',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#4b5563', marginBottom: '1rem' }}>CNIC Photo</h3>
            <input
              type="file"
              accept="image/*"
              onChange={handleCnicUpload}
              style={{ display: 'none' }}
              ref={cnicInputRef}
            />
            <button
              type="button"
              onClick={() => cnicInputRef.current.click()}
              style={{
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                cursor: 'pointer'
              }}
            >
              Select CNIC Image
            </button>
            {/* Progress bar for CNIC */}
            <div style={{
              marginTop: '1rem',
              background: '#f3f4f6',
              borderRadius: 8,
              padding: '0.5rem',
              color: '#4b5563'
            }}>
              {cnicFile ? (
                <>
                  <div style={{ color: '#059669' }}>✓ {cnicFile.name}</div>
                  <div style={{ 
                    width: '100%',
                    height: '4px',
                    background: '#dcfce7',
                    borderRadius: '2px',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: '#059669',
                      borderRadius: '2px'
                    }} />
                  </div>
                </>
              ) : (
                <div>0/1 CNIC image selected</div>
              )}
            </div>
          </div>

          {/* Live Images Upload Card */}
          <div style={{
            border: '2px dashed #d1d5db',
            borderRadius: 12,
            padding: '2rem',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#4b5563', marginBottom: '1rem' }}>Live Photos (5 Required)</h3>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleLiveUpload}
                style={{ display: 'none' }}
                ref={liveInputRef}
              />
              <button
                type="button"
                onClick={() => liveInputRef.current.click()}
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  cursor: 'pointer'
                }}
              >
                Select Photos 
              </button>
              <button
                type="button"
                onClick={() => {
                  setLiveFiles([null, null, null, null, null]);
                  if (liveInputRef.current) liveInputRef.current.value = '';
                }}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  cursor: 'pointer'
                }}
              >
                Clear All
              </button>
            </div>
            
            {/* Progress bar for live photos */}
            <div style={{
              marginTop: '1rem',
              background: '#f3f4f6',
              borderRadius: 8,
              padding: '0.5rem'
            }}>
              <div style={{ color: '#4b5563', marginBottom: '0.5rem' }}>
                {liveFiles.filter(f => f).length}/5 photos selected
              </div>
              <div style={{ 
                width: '100%',
                height: '4px',
                background: '#e5e7eb',
                borderRadius: '2px'
              }}>
                <div style={{
                  width: `${(liveFiles.filter(f => f).length / 5) * 100}%`,
                  height: '100%',
                  background: '#3b82f6',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              {/* File list with individual clear buttons */}
              <div style={{ 
                marginTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                textAlign: 'left'
              }}>
                {liveFiles.map((file, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem',
                    background: file ? '#f0fdf4' : '#f3f4f6',
                    borderRadius: '6px',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      color: file ? '#059669' : '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {file ? '✓' : '○'} Photo {idx + 1}: {file ? file.name : 'Not selected'}
                    </div>
                    {file && (
                      <button
                        type="button"
                        onClick={() => clearLiveFile(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '16px 32px',
              fontWeight: 600,
              width: '100%',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1.1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
    </div>
  );
}

