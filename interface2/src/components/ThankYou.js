import React from 'react';

const ThankYou = ({ onRestart }) => {
  return (
    <div className="screen">
      <h2>Thank You!</h2>
      <button onClick={onRestart}>Start Again</button>
    </div>
  );
};

export default ThankYou;
