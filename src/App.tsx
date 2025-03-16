import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

interface AuthCode {
  issuer: string;
  account: string;
  secret: string;
  code: string;
  timeRemaining: number;
}

function App() {
  const [authCodes, setAuthCodes] = useState<AuthCode[]>([]);
  const [newSecret, setNewSecret] = useState('');
  const [newIssuer, setNewIssuer] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);

  const updateCodes = useCallback(() => {
    // In a real app, this would generate TOTP codes
    // For now, we'll just simulate it with random codes
    const updatedCodes = authCodes.map(code => ({
      ...code,
      code: Math.floor(100000 + Math.random() * 900000).toString(),
      timeRemaining: 30,
    }));

    setAuthCodes(updatedCodes);

    // Save to Chrome storage
    chrome.storage.sync.set({ authCodes: updatedCodes });
  }, [authCodes]);

  useEffect(() => {
    // Load saved auth codes from Chrome storage
    chrome.storage.sync.get(['authCodes'], result => {
      if (result.authCodes) {
        setAuthCodes(result.authCodes);
      }
    });

    // Set up timer for TOTP codes
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = 30 - (now % 30);
      setTimeLeft(secondsRemaining);

      // Update codes every 30 seconds
      if (secondsRemaining === 30 || secondsRemaining === 0) {
        updateCodes();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [updateCodes]);

  const addNewCode = () => {
    if (!newSecret || !newIssuer) return;

    const newCode: AuthCode = {
      issuer: newIssuer,
      account: newAccount || 'default',
      secret: newSecret,
      code: Math.floor(100000 + Math.random() * 900000).toString(),
      timeRemaining: 30,
    };

    const updatedCodes = [...authCodes, newCode];
    setAuthCodes(updatedCodes);

    // Save to Chrome storage
    chrome.storage.sync.set({ authCodes: updatedCodes });

    // Reset form
    setNewSecret('');
    setNewIssuer('');
    setNewAccount('');
  };

  const removeCode = (index: number) => {
    const updatedCodes = authCodes.filter((_, i) => i !== index);
    setAuthCodes(updatedCodes);

    // Save to Chrome storage
    chrome.storage.sync.set({ authCodes: updatedCodes });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Authenticator</h1>
      </header>

      <div className="auth-container">
        {authCodes.length === 0 ? (
          <div className="empty-state">
            <p>No authentication codes added yet.</p>
          </div>
        ) : (
          <div className="auth-codes">
            {authCodes.map((code, index) => (
              <div key={index} className="auth-code-item">
                <div className="auth-code-info">
                  <div className="auth-code-issuer">{code.issuer}</div>
                  <div className="auth-code-account">{code.account}</div>
                </div>
                <div className="auth-code-display">
                  <div className="auth-code-value">{code.code}</div>
                  <div className="auth-code-timer">
                    <div className="timer-bar" style={{ width: `${(timeLeft / 30) * 100}%` }}></div>
                  </div>
                </div>
                <button className="remove-button" onClick={() => removeCode(index)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="add-new-form">
          <h2>Add New Authentication</h2>
          <div className="form-group">
            <label htmlFor="service-name">Service Name:</label>
            <input
              id="service-name"
              type="text"
              value={newIssuer}
              onChange={e => setNewIssuer(e.target.value)}
              placeholder="Google, GitHub, etc."
            />
          </div>
          <div className="form-group">
            <label htmlFor="account-name">Account (optional):</label>
            <input
              id="account-name"
              type="text"
              value={newAccount}
              onChange={e => setNewAccount(e.target.value)}
              placeholder="username or email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="secret-key">Secret Key:</label>
            <input
              id="secret-key"
              type="text"
              value={newSecret}
              onChange={e => setNewSecret(e.target.value)}
              placeholder="Enter secret key"
            />
          </div>
          <button className="add-button" onClick={addNewCode}>
            Add Authentication
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
