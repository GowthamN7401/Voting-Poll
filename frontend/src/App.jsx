import React, { useState, useEffect } from 'react';
import AgeVerification from './components/AgeVerification';
import PollBoard from './components/PollBoard';

function App() {
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('ageVerified') === 'true') {
      setIsVerified(true);
    }
  }, []);

  return (
    <div className="app-container">
      <h1>TN Elections Web Poll</h1>
      {!isVerified ? (
        <AgeVerification onVerified={() => setIsVerified(true)} />
      ) : (
        <PollBoard />
      )}
    </div>
  );
}

export default App;
