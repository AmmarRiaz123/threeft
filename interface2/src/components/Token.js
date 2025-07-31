import React, { useEffect, useState } from 'react';

const Token = ({ onTokenGenerated }) => {
  const [token, setToken] = useState('');

  useEffect(() => {
    const generated = Math.random().toString(36).substring(2, 10);
    setToken(generated);
    if (onTokenGenerated) {
      onTokenGenerated(generated);
    }
  }, [onTokenGenerated]);

  return (
    <div className="token-screen">
      <h2>Access Granted</h2>
      <p>Your session token: <strong>{token}</strong></p>
    </div>
  );
};

export default Token;
