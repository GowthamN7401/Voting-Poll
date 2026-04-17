import React, { useState } from 'react';

const AgeVerification = ({ onVerified }) => {
  const [error, setError] = useState(false);

  const handleYes = () => {
    localStorage.setItem('ageVerified', 'true');
    onVerified();
  };

  const handleNo = () => {
    setError(true);
  };

  return (
    <div className="card verification-content">
      <h2>⚠️ Age Verification</h2>
      <p>Are you 18 years of age or older?</p>
      <div style={{ marginTop: '2rem' }}>
        <button className="btn btn-primary" onClick={handleYes}>Yes, I am 18+</button>
        <button className="btn btn-secondary" onClick={handleNo}>No</button>
      </div>
      {error && <p className="error-text">You must be 18 or older to vote.</p>}
    </div>
  );
};

export default AgeVerification;
