import React, { useState, useEffect } from 'react';
import { validatePassword, encryptData } from '../utils/encryption';
import './PasswordManager.css';

interface PasswordManagerProps {
  isPasswordSet: boolean;
  passwordTestString: string | null;
  onPasswordSet: (password: string) => void;
  onPasswordVerified: (password: string) => void;
}

const PasswordManager: React.FC<PasswordManagerProps> = ({
  isPasswordSet,
  passwordTestString,
  onPasswordSet,
  onPasswordVerified,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);

  useEffect(() => {
    if (!isPasswordSet && chrome?.storage?.sync) {
      chrome.storage.sync.get(['authCodes'], result => {
        if (result.authCodes && Array.isArray(result.authCodes)) {
          setHasExistingData(true);
        }
      });
    }
  }, [isPasswordSet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPasswordSet && passwordTestString) {
      if (validatePassword(passwordTestString, password)) {
        onPasswordVerified(password);
        setError('');
      } else {
        setError('Incorrect password. Please try again.');
      }
    } else {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (hasExistingData) {
        try {
          const result = await new Promise<{ authCodes?: any[] }>(resolve => {
            chrome.storage.sync.get(['authCodes'], resolve);
          });

          if (result.authCodes && Array.isArray(result.authCodes)) {
            const encryptedCodes = encryptData(result.authCodes, password);

            // Fix: Remove the resolve parameter from chrome.storage.sync.set
            await new Promise<void>(resolve => {
              chrome.storage.sync.set({ authCodes: encryptedCodes });
              resolve();
            });
          }
        } catch (error) {
          setError('Failed to migrate existing data. Please try again.');
          return;
        }
      }

      onPasswordSet(password);
      setError('');
    }
  };

  return (
    <div className="password-manager-container">
      <div className="password-manager">
        <h2>{isPasswordSet ? 'Enter Password' : 'Set Up Password'}</h2>
        <p className="password-info">
          {isPasswordSet
            ? 'Enter your password to decrypt your TOTP secrets'
            : hasExistingData
              ? 'Create a password to encrypt your existing TOTP secrets. This password will be required each time you use the extension.'
              : 'Create a password to encrypt your TOTP secrets. This password will be required each time you use the extension.'}
        </p>

        {hasExistingData && !isPasswordSet && (
          <div className="migration-notice">
            <p>Existing TOTP codes found! They will be encrypted with your new password.</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {!isPasswordSet && (
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirm-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="primary-button">
            {isPasswordSet ? 'Unlock' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordManager;
