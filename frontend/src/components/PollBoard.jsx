import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

// Connect to backend
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(SOCKET_URL);

const PREVENT_DUPLICATE_KEY = 'poll_voter_uuid';

const PollBoard = () => {
  const [poll, setPoll] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate UUID for local storage if not exists
    if (!localStorage.getItem(PREVENT_DUPLICATE_KEY)) {
      localStorage.setItem(PREVENT_DUPLICATE_KEY, crypto.randomUUID());
    }

    const fetchPoll = async () => {
      try {
        const res = await axios.get(`${SOCKET_URL}/api/poll`);
        setPoll(res.data);
        
        // Check if user has already voted
        const voterId = localStorage.getItem(PREVENT_DUPLICATE_KEY);
        if (res.data?.voters?.includes(voterId)) {
          setHasVoted(true);
        }
      } catch (err) {
        console.error("Error fetching poll data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();

    socket.on('pollUpdate', (updatedPoll) => {
      setPoll(updatedPoll);
    });

    return () => socket.off('pollUpdate');
  }, []);

  const handleVote = async (option) => {
    const voterId = localStorage.getItem(PREVENT_DUPLICATE_KEY);
    try {
      await axios.post(`${SOCKET_URL}/api/vote`, { option, userIdentifier: voterId });
      setHasVoted(true);
    } catch (err) {
      if (err.response?.status === 400) {
        alert(err.response.data.error);
        setHasVoted(true);
      } else {
        console.error("Error submitting vote", err);
      }
    }
  };

  if (loading) return <div className="card" style={{textAlign: 'center'}}>Loading live data...</div>;

  if (!poll) return <div className="card" style={{textAlign: 'center'}}>No poll data available or waiting for DB to connect.</div>;

  const totalVotes = Object.values(poll.options).reduce((a, b) => a + b, 0);

  const getPercentage = (count) => {
    if (totalVotes === 0) return 0;
    return ((count / totalVotes) * 100).toFixed(1);
  };

  return (
    <div className="card">
      {!hasVoted ? (
        <>
          <p style={{marginBottom: '1.5rem', textAlign: 'center', color: '#6b7280'}}>Select a party to cast your vote.</p>
          <div className="poll-grid">
            {Object.keys(poll.options).map((party) => (
              <button key={party} className="party-btn" onClick={() => handleVote(party)}>
                <span>{party}</span>
                <span className="party-logo">🗳️</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="results-container">
          <h2 style={{textAlign: 'center', color: 'var(--primary)', marginBottom: '2rem'}}>Live Results</h2>
          {Object.entries(poll.options).map(([party, count]) => (
            <div key={party} className="result-item">
              <div className="result-header">
                <span>{party}</span>
                <span>{getPercentage(count)}% ({count} votes)</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${getPercentage(count)}%`}}
                ></div>
              </div>
            </div>
          ))}
          <div className="total-votes">Total Voters: {totalVotes}</div>
          <div style={{textAlign: 'center', marginTop: '2rem'}}>
            <button 
              onClick={() => {
                localStorage.setItem(PREVENT_DUPLICATE_KEY, crypto.randomUUID());
                setHasVoted(false);
              }}
              style={{
                padding: '0.8rem 1.5rem', 
                background: '#e5e7eb', 
                color: '#374151', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: 'bold',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#d1d5db'}
              onMouseOut={(e) => e.target.style.background = '#e5e7eb'}
            >
              Vote Again (Test Mode)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PollBoard;
