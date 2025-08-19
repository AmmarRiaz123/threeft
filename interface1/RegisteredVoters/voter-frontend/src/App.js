import React, { useState } from 'react';
import VoterApp from './VoterApp';
import IdentityVerify from './IdentityVerify';

export default function App() {
  const [step, setStep] = useState('scan');
  const [qrId, setQrId] = useState('');

  const handleQrScanned = (scannedQrId) => {
    if (scannedQrId) {
      setQrId(scannedQrId);
      setStep('verify');
    }
  };

  const handleVerified = () => {
    if (qrId) {
      setStep('vote');
    }
  };

  return (
    <div className="app-container">
      {step === 'scan' && (
        <VoterApp onQrScanned={handleQrScanned} scanOnlyMode={true} />
      )}
      
      {step === 'verify' && qrId && (
        <IdentityVerify qrId={qrId} onVerified={handleVerified} />
      )}
      
      {step === 'vote' && qrId && (
        <VoterApp qrId={qrId} scanOnlyMode={false} />
      )}
    </div>
  );
}

