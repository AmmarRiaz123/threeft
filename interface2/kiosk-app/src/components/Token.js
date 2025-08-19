// import React, { useEffect, useState } from 'react';

// const Token = ({ onTokenGenerated }) => {
//   const [token, setToken] = useState('');

//   useEffect(() => {
//     const generated = Math.random().toString(36).substring(2, 10);
//     setToken(generated);
//     if (onTokenGenerated) {
//       onTokenGenerated(generated);
//     }
//   }, [onTokenGenerated]);

//   return (
//     <div className="token-screen">
//       <h2>Access Granted</h2>
//       <p>Your session token: <strong>{token}</strong></p>
//     </div>
//   );
// };

// export default Token;
// Token.jsx
import React from 'react';
import './Token.css';
const Token = ({ token, onDone }) => (
  <div className="token-center-container">
    <div className="token-content">
      <h2>Your New Token</h2>
      <p style={{ fontSize: "2rem", margin: "20px 0" }}>{token}</p>
      <button onClick={onDone} style={{ padding: "10px 30px", fontSize: "1rem" }}>Done</button>
    </div>
  </div>
);
export default Token;