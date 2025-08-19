import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000';

export default function VoterApp({ qrId: initialQrId, onQrScanned, scanOnlyMode = false }) {
  const [qrId, setQrId] = useState(initialQrId || '');
  const [scanResult, setScanResult] = useState('');
  const [voterInfo, setVoterInfo] = useState(null);
  const [voteMsg, setVoteMsg] = useState('');
  const [qrFile, setQrFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (initialQrId) setQrId(initialQrId);
  }, [initialQrId]);

  // Scan QR code image
  const handleScanQr = async (e) => {
    e.preventDefault();
    if (!qrFile) return;
    setLoading(true);
    setScanResult('');
    setVoterInfo(null);
    setVoteMsg('');
    const formData = new FormData();
    formData.append('image', qrFile);
    try {
      const res = await fetch(`${API_BASE}/scan-qr`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setScanResult(data.qr_id);
        setQrId(data.qr_id);
        if (scanOnlyMode && onQrScanned) {
          onQrScanned(data.qr_id);
        }
      } else {
        setScanResult(data.error || 'Scan failed');
      }
    } catch (err) {
      setScanResult('Error scanning QR');
    }
    setLoading(false);
  };

  // Fetch voter info
  const handleFetchVoter = async () => {
    setLoading(true);
    setVoterInfo(null);
    setVoteMsg('');
    try {
      const res = await fetch(`${API_BASE}/voter/${qrId}`);
      const data = await res.json();
      if (res.ok) {
        setVoterInfo(data);
      } else {
        setVoterInfo({ error: data.error || 'Not found' });
      }
    } catch (err) {
      setVoterInfo({ error: 'Error fetching voter info' });
    }
    setLoading(false);
  };

  // Mark voter as voted
  const handleVote = async () => {
    setLoading(true);
    setVoteMsg('');
    try {
      const res = await fetch(`${API_BASE}/voter/${qrId}/vote`, {
        method: 'POST',
      });
      const data = await res.json();
      setVoteMsg(data.message || data.error || 'Vote failed');
      // Refresh voter info after voting
      setTimeout(handleFetchVoter, 500);
    } catch (err) {
      setVoteMsg('Error voting');
    }
    setLoading(false);
  };

  const handleGenerateToken = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/generate-token/${qrId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        setTimeout(() => window.print(), 500); // Print after showing receipt
      } else {
        setVoteMsg(data.error || 'Token generation failed');
      }
    } catch (err) {
      setVoteMsg('Error generating token');
    }
    setLoading(false);
  };

  // In scan-only mode, show enhanced QR upload UI
  if (scanOnlyMode) {
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
            CNIC Verification
          </h2>

          <div style={{
            border: '2px dashed #d1d5db',
            borderRadius: 12,
            padding: '2rem',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#4b5563', marginBottom: '1rem' }}>Upload CNIC QR Code</h3>
            <form onSubmit={handleScanQr}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '1.5rem',
                  background: '#f9fafb',
                  width: '100%',
                  maxWidth: '400px'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setQrFile(e.target.files[0])}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      background: '#fff'
                    }}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !qrFile}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 32px',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    cursor: loading || !qrFile ? 'not-allowed' : 'pointer',
                    opacity: loading || !qrFile ? 0.7 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  {loading ? 'Scanning...' : 'Scan QR Code'}
                </button>
              </div>
            </form>

            {/* QR Scan Result Display */}
            {scanResult && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: 8,
                background: !scanResult.startsWith('Error') ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${!scanResult.startsWith('Error') ? '#86efac' : '#fecaca'}`,
              }}>
                <div style={{
                  fontWeight: 500,
                  color: !scanResult.startsWith('Error') ? '#059669' : '#ef4444',
                  marginBottom: '0.5rem'
                }}>
                  {!scanResult.startsWith('Error') ? '✓ QR Code Scanned Successfully' : '✗ Scan Failed'}
                </div>
                <div style={{ 
                  color: '#4b5563',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.5rem' 
                }}>
                  {!scanResult.startsWith('Error') && <strong>ID:</strong>}
                  <span>{scanResult}</span>
                </div>
              </div>
            )}
          </div>

          {loading && (
            <div style={{
              textAlign: 'center',
              color: '#6366f1',
              fontWeight: 500,
              marginTop: '1rem'
            }}>
              Processing...
            </div>
          )}

          <div style={{ 
            marginTop: '2rem',
            textAlign: 'center',
            fontSize: 13,
            color: '#64748b'
          }}>
            Scan your CNIC QR code to proceed with verification
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)',
      padding: '2rem',
      fontFamily: 'Inter, Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: 420,
        margin: '2rem auto',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '2rem 2rem 1.5rem 2rem'
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '1.5rem',
          fontWeight: 700,
          color: '#3b82f6',
          letterSpacing: '0.02em'
        }}>
          Voter Verification Portal
        </h1>
        <form onSubmit={handleScanQr} style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>
            Upload CNIC QR Image
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="file"
              accept="image/*"
              onChange={e => setQrFile(e.target.files[0])}
              style={{
                flex: 1,
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: '#f3f4f6'
              }}
            />
            <button
              type="submit"
              disabled={loading || !qrFile}
              style={{
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '0 18px',
                fontWeight: 600,
                cursor: loading || !qrFile ? 'not-allowed' : 'pointer'
              }}
            >
              Scan QR
            </button>
          </div>
          {scanResult && (
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              background: '#f1f5f9',
              borderRadius: 6,
              fontSize: 15
            }}>
              <strong>QR ID:</strong> <span style={{ color: '#0ea5e9' }}>{scanResult}</span>
            </div>
          )}
          {scanResult && !scanResult.startsWith('Error') && !scanResult.startsWith('Scan') && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
              You can now fetch voter info below.
            </div>
          )}
        </form>
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: 10,
          boxShadow: '0 1px 4px rgba(59,130,246,0.04)'
        }}>
          <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>
            Enter or Paste QR ID
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={qrId}
              onChange={e => setQrId(e.target.value)}
              placeholder="QR ID"
              style={{
                flex: 1,
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: '#f3f4f6',
                fontSize: 15
              }}
            />
            <button
              onClick={handleFetchVoter}
              disabled={loading || !qrId}
              style={{
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '0 18px',
                fontWeight: 600,
                cursor: loading || !qrId ? 'not-allowed' : 'pointer'
              }}
            >
              Fetch Info
            </button>
          </div>
        </div>
        {voterInfo && (
          <div style={{
            background: '#f1f5f9',
            borderRadius: 12,
            padding: '1.2rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 8px rgba(59,130,246,0.07)'
          }}>
            {voterInfo.error ? (
              <div style={{ color: '#ef4444', fontWeight: 500, fontSize: 16 }}>
                {voterInfo.error}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>
                  {voterInfo.full_name}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Gender:</span> {voterInfo.gender}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Address:</span> {voterInfo.address}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Has Voted:</span>{' '}
                  <span style={{
                    color: voterInfo.has_voted ? '#22c55e' : '#f59e42',
                    fontWeight: 600
                  }}>
                    {voterInfo.has_voted ? 'Yes' : 'No'}
                  </span>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Voted At:</span> {voterInfo.voted_at || '-'}
                </div>
                <button
                  onClick={handleVote}
                  disabled={loading || voterInfo.has_voted}
                  style={{
                    background: voterInfo.has_voted ? '#d1d5db' : '#22c55e',
                    color: voterInfo.has_voted ? '#64748b' : '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 24px',
                    fontWeight: 600,
                    cursor: loading || voterInfo.has_voted ? 'not-allowed' : 'pointer',
                    marginTop: 8
                  }}
                >
                  {voterInfo.has_voted ? 'Already Voted' : 'Mark as Voted'}
                </button>
              </div>
            )}
          </div>
        )}
        {voteMsg && (
          <div style={{
            marginTop: '0.5rem',
            padding: '8px 12px',
            borderRadius: 6,
            fontWeight: 500,
            color: voteMsg.includes('already') ? '#f59e42' : voteMsg.includes('updated') ? '#22c55e' : '#ef4444',
            background: voteMsg.includes('already') ? '#fef3c7' : voteMsg.includes('updated') ? '#dcfce7' : '#fee2e2'
          }}>
            {voteMsg}
          </div>
        )}
        {loading && (
          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            color: '#6366f1',
            fontWeight: 500
          }}>
            Loading...
          </div>
        )}
        {voterInfo && !voterInfo.has_voted && (
          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={handleGenerateToken}
              disabled={loading || token}
              style={{
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 24px',
                fontWeight: 600,
                cursor: loading || token ? 'not-allowed' : 'pointer'
              }}
            >
              Generate Token & Print Receipt
            </button>
            {token && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: 8,
                border: '1px solid #d1d5db'
              }}>
                <h3 style={{ color: '#3b82f6', marginBottom: '0.5rem' }}>Voter Access Token</h3>
                <div style={{ wordBreak: 'break-all', fontSize: '1.1em', marginBottom: '1rem' }}>
                  <strong>Token:</strong> {token}
                </div>
                <div>
                  <strong>QR ID:</strong> {qrId}
                </div>
                <div style={{ marginTop: '1rem', color: '#059669', fontWeight: 500 }}>
                  Please present this receipt at the next machine.
                </div>
              </div>
            )}
          </div>
        )}
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: 13, color: '#64748b' }}>
          <span>Powered by CNIC QR & PostgreSQL Voting API</span>
        </div>
      </div>
    </div>
  );
}
