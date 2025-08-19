import React, { useState } from 'react';
import TokenEntry from './components/TokenEntry';
import FaceRecognition from './components/FaceRecognition';
import FeedbackForm from './components/FeedbackForm';
import ThankYou from './components/ThankYou';
import Token from './components/Token';
import { supabase } from './supabaseClient';

function App() {
  const [step, setStep] = useState(1);
  const [verifiedToken, setVerifiedToken] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');

  // Step 1: Token verification
  const handleTokenSubmit = (token) => {
    setVerifiedToken(token);
    setStep(2);
  };

  // Step 2: Face recognition and token generation
  const handleFaceVerified = () => {
    const newToken = Math.random().toString(36).substr(2, 8).toUpperCase();
    setGeneratedToken(newToken);

    supabase
      .from('registered_voters')
      .update({ token: newToken })
      .eq('token', verifiedToken);

    setStep(3);
  };

  // Step 3: Feedback form
  const handleFeedbackSubmit = () => {
    setStep(4);
  };

  // Step 4: Thank you
  const handleThankYou = () => {
    setStep(5); // Go to Token screen after Thank You
  };

  // Step 5: Show token, then reset everything on button click
  const handleTokenDone = () => {
    setStep(1); // Go back to TokenEntry
    setVerifiedToken('');
    setGeneratedToken('');
  };

  return (
    <div className="App">
      {step === 1 && <TokenEntry onSubmit={handleTokenSubmit} />}
      {step === 2 && <FaceRecognition onVerified={handleFaceVerified} />}
      {step === 3 && (
        <FeedbackForm token={generatedToken} onSubmit={handleFeedbackSubmit} />
      )}
      {step === 4 && <ThankYou onRestart={handleThankYou} />} {/* Pass handleThankYou as onRestart */}
      {step === 5 && <Token token={generatedToken} onDone={handleTokenDone} />}
    </div>
  );
}

export default App;
