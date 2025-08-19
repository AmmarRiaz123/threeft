import React, { useRef, useCallback } from 'react';
import Webcam from 'react-webcam';

const videoConstraints = {
  width: 400,
  height: 300,
  facingMode: "user"
};

const FaceRecognition = ({ onVerified }) => {
  const webcamRef = useRef(null);

const capture = useCallback(() => {
  // const imageSrc = webcamRef.current.getScreenshot(); ❌ not used
  alert("Face captured for verification!");
  onVerified();
}, [ onVerified]);

  return (
    <div className="screen">
      <h2>Face Recognition</h2>
      <Webcam
        audio={false}
        height={300}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={400}
        videoConstraints={videoConstraints}
      />
      <br />
      <button onClick={capture}>Verify Face</button>
    </div>
  );
};

export default FaceRecognition;
