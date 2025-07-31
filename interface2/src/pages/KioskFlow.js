import React, { useState } from 'react';
import Welcome from '../components/Welcome';
import FaceRecognition from '../components/FaceRecognition';
import Token from '../components/Token';
import FeedbackForm from '../components/FeedbackForm';
import ThankYou from '../components/ThankYou';

const KioskFlow = () => {
  const [step, setStep] = useState(0);
  const [sessionToken, setSessionToken] = useState('');

  const nextStep = () => setStep(step + 1);

  const handleTokenGenerated = (token) => {
    setSessionToken(token);
    nextStep();
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <Welcome onNext={nextStep} />;
      case 1:
        return <FaceRecognition onVerified={nextStep} />;
      case 2:
        return <Token onTokenGenerated={handleTokenGenerated} />;
      case 3:
        return <FeedbackForm token={sessionToken} onSubmit={nextStep} />;
      case 4:
        return <ThankYou />;
      default:
        return <div>Invalid step</div>;
    }
  };

  return <div>{renderStep()}</div>;
};

export default KioskFlow;
