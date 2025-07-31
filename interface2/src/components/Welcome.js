import React from 'react';

const Welcome = ({ onNext }) => {
  return (
    <div className="screen">
      <h1>Welcome to the Kiosk</h1>
      <button onClick={onNext}>Start</button>
    </div>
  );
};

export default Welcome;
