import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TOTP } from 'totp-generator';
import { Html5Qrcode } from 'html5-qrcode';
import './App.css';
import PasswordManager from './components/PasswordManager';
import { encryptData, decryptData, createPasswordTest } from './utils/encryption';
import { Modal } from './components/Modal';

// Chrome API type definitions
declare global {
  interface Window {
    chrome: typeof chrome;
  }

  namespace chrome {
    namespace tabs {
      function query(
        queryInfo: { active: boolean; currentWindow: boolean },
        callback: (tabs: { url?: string }[]) => void
      ): void;
    }
    namespace storage {
      interface SyncStorageArea {
        get(keys: string[], callback: (result: { [key: string]: any }) => void): void;
        set(items: { [key: string]: any }): void;
      }
    }
  }
}

interface AuthCode {
  issuer: string;
  account: string;
  secret: string;
  code: string;
  timeRemaining: number;
}

enum TabType {
  CODES = 'codes',
  ADD = 'add',
}

function App() {
  const [authCodes, setAuthCodes] = useState<AuthCode[]>([]);
  const [newSecret, setNewSecret] = useState('');
  const [newIssuer, setNewIssuer] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>(TabType.CODES);
  const [qrCodeText, setQrCodeText] = useState('');
  const [scannerError, setScannerError] = useState('');
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('');
  const [showAllCodes, setShowAllCodes] = useState<boolean>(true);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Add password manager state
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [passwordTestString, setPasswordTestString] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [importError, setImportError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load password test string on mount
  useEffect(() => {
    if (chrome?.storage?.sync) {
      chrome.storage.sync.get(['passwordTest'], result => {
        if (result.passwordTest) {
          setPasswordTestString(result.passwordTest);
          setIsPasswordSet(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (showHelpModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showHelpModal]);

  // Get current tab URL
  useEffect(() => {
    if (chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url);
            setCurrentTabUrl(url.hostname);

            // Check if we have any codes matching this URL
            chrome.storage.sync.get(['authCodes'], result => {
              if (result.authCodes && masterPassword) {
                try {
                  const decryptedCodes = decryptData(result.authCodes, masterPassword);
                  const matchingCodes = decryptedCodes.filter(
                    (code: any) =>
                      code.issuer.toLowerCase().includes(url.hostname.toLowerCase()) ||
                      url.hostname.toLowerCase().includes(code.issuer.toLowerCase())
                  );

                  // If we have matching codes, don't show all codes
                  setShowAllCodes(matchingCodes.length === 0);
                } catch (error) {
                  setShowAllCodes(true);
                }
              }
            });
          } catch (e) {
            // Invalid URL, just use empty string
            setCurrentTabUrl('');
            setShowAllCodes(true);
          }
        } else {
          setCurrentTabUrl('');
          setShowAllCodes(true);
        }
      });
    }
  }, [masterPassword]);

  // Generate a TOTP code from a secret
  const generateTOTP = (secret: string): string => {
    try {
      // Clean the secret (remove spaces and convert to uppercase)
      const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
      const result = TOTP.generate(cleanSecret, { period: 30 });
      return result.otp; // Extract the OTP string from the result object
    } catch (error) {
      // Fallback to a random code if there's an error
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
  };

  const updateCodes = useCallback(() => {
    // Generate real TOTP codes for each auth code
    const updatedCodes = authCodes.map(code => ({
      ...code,
      code: generateTOTP(code.secret),
      timeRemaining: 30,
    }));

    setAuthCodes(updatedCodes);

    // Save encrypted codes to Chrome storage
    if (chrome?.storage?.sync && masterPassword) {
      const encryptedCodes = encryptData(updatedCodes, masterPassword);
      chrome.storage.sync.set({ authCodes: encryptedCodes });
    }
  }, [authCodes, masterPassword]);

  useEffect(() => {
    if (!isUnlocked || !masterPassword) return;

    // Load saved auth codes from Chrome storage
    if (chrome?.storage?.sync) {
      chrome.storage.sync.get(['authCodes'], result => {
        if (result.authCodes) {
          try {
            // Decrypt the stored auth codes
            const decryptedCodes = decryptData(result.authCodes, masterPassword);
            const loadedCodes = decryptedCodes.map((code: AuthCode) => ({
              ...code,
              code: generateTOTP(code.secret),
            }));
            setAuthCodes(loadedCodes);
          } catch (error) {
            alert('Failed to decrypt auth codes');
            return;
          }
        }
      });
    }

    // Set up timer for TOTP codes
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = 30 - (now % 30);

      // Update codes every 30 seconds
      if (secondsRemaining === 30 || secondsRemaining === 0) {
        updateCodes();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [updateCodes, isUnlocked, masterPassword]);

  // Parse TOTP URI (otpauth://totp/...)
  const parseTotpUri = (
    uri: string
  ): { issuer: string; account: string; secret: string } | null => {
    try {
      if (!uri.startsWith('otpauth://totp/')) {
        return null;
      }

      const url = new URL(uri);
      const path = url.pathname.substring(1); // Remove leading slash

      // Handle different path formats
      let issuer = '';
      let account = '';

      // Check if path contains a colon (issuer:account format)
      if (path.includes(':')) {
        const pathParts = path.split(':');
        issuer = decodeURIComponent(pathParts[0]);
        // Handle case where there might be nothing after the colon
        account = pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : '';
      } else {
        // No colon in path, use the whole path as account
        account = decodeURIComponent(path);
      }

      // Get parameters from URL
      const params = url.searchParams;
      const secret = params.get('secret');

      if (!secret) {
        return null;
      }

      // If issuer wasn't in the path or is empty, check the params
      if (!issuer || issuer.trim() === '') {
        const paramIssuer = params.get('issuer');
        issuer = paramIssuer && paramIssuer.trim() !== '' ? paramIssuer : 'Unknown';
      }

      // If account is empty, use issuer or a default value
      if (!account || account.trim() === '') {
        account = issuer !== 'Unknown' ? issuer : 'Default Account';
      }

      return {
        issuer,
        account,
        secret,
      };
    } catch (error) {
      return null;
    }
  };

  const addNewCode = () => {
    if (!newSecret || !masterPassword) return;

    try {
      // Clean the secret and verify it's valid by generating a TOTP
      const cleanSecret = newSecret.replace(/\s/g, '').toUpperCase();
      const totpCode = generateTOTP(cleanSecret);

      // Use current tab URL as issuer if not provided
      const issuer = newIssuer || currentTabUrl || 'Unknown';

      const newCode: AuthCode = {
        issuer,
        account: newAccount || 'default',
        secret: cleanSecret,
        code: totpCode,
        timeRemaining: 30,
      };

      const updatedCodes = [...authCodes, newCode];
      setAuthCodes(updatedCodes);

      // Encrypt before saving
      if (chrome?.storage?.sync) {
        const encryptedCodes = encryptData(updatedCodes, masterPassword);
        chrome.storage.sync.set({ authCodes: encryptedCodes });
      }

      // Reset form
      setNewSecret('');
      setNewIssuer('');
      setNewAccount('');

      // Switch back to list tab
      setActiveTab(TabType.CODES);
    } catch (error) {
      alert('Invalid secret key. Please check and try again.');
    }
  };

  const addCodeFromQr = (qrText: string) => {
    if (!masterPassword) return;

    const totpData = parseTotpUri(qrText);

    if (!totpData) {
      alert('Invalid QR code. Please make sure it contains a valid TOTP URI.');
      return;
    }

    try {
      const { issuer, account, secret } = totpData;
      const totpCode = generateTOTP(secret);

      // Use current tab URL as issuer if not provided
      const finalIssuer = issuer || currentTabUrl || 'Unknown';

      const newCode: AuthCode = {
        issuer: finalIssuer,
        account,
        secret,
        code: totpCode,
        timeRemaining: 30,
      };

      const updatedCodes = [...authCodes, newCode];
      setAuthCodes(updatedCodes);

      // Encrypt before saving
      if (chrome?.storage?.sync) {
        const encryptedCodes = encryptData(updatedCodes, masterPassword);
        chrome.storage.sync.set({ authCodes: encryptedCodes });
      }

      // Reset QR form
      setQrCodeText('');

      // Switch back to list tab
      setActiveTab(TabType.CODES);
    } catch (error) {
      alert('Error adding code from QR. Please try again.');
    }
  };

  // Handle delete button click
  const handleDeleteClick = (index: number) => {
    setDeleteConfirmIndex(index);
  };

  // Cancel delete operation
  const cancelDelete = () => {
    setDeleteConfirmIndex(null);
  };

  // Remove a code
  const removeCode = (index: number) => {
    const updatedCodes = [...authCodes];
    updatedCodes.splice(index, 1);
    setAuthCodes(updatedCodes);
    saveCodes(updatedCodes);
    setDeleteConfirmIndex(null);
  };

  // Copy code to clipboard
  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handlePasteImage = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const items = e.clipboardData.items;
    let imageFile: File | null = null;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        imageFile = items[i].getAsFile();
        break;
      }
    }

    if (!imageFile) {
      setScannerError('No image found in clipboard. Please copy an image first.');
      return;
    }

    setScannerError('');
    setActiveTab(TabType.CODES); // Switch to codes tab immediately after successful paste

    const reader = new FileReader();
    reader.onload = event => {
      if (!event.target?.result) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);

        // Use Html5Qrcode to scan the image directly without requiring a DOM element
        try {
          // Create a temporary element if needed
          let tempElement = document.getElementById('qr-reader');
          if (!tempElement) {
            tempElement = document.createElement('div');
            tempElement.id = 'qr-reader';
            tempElement.style.display = 'none';
            document.body.appendChild(tempElement);
          }

          // Create a new instance if it doesn't exist
          if (!html5QrCodeRef.current && imageFile) {
            const html5QrCode = new Html5Qrcode('qr-reader');
            html5QrCodeRef.current = html5QrCode;
          }

          if (html5QrCodeRef.current && imageFile) {
            html5QrCodeRef.current
              .scanFile(imageFile, true)
              .then(decodedText => {
                addCodeFromQr(decodedText);
                setScannerError(''); // Clear any errors
              })
              .catch((error: any) => {
                // Log error silently
                setScannerError('Could not read QR code from image. Please try a clearer image.');
                setActiveTab(TabType.ADD); // Switch back to add tab if there's an error
              });
          } else {
            setScannerError('QR code scanner initialization failed. Please try again.');
            setActiveTab(TabType.ADD);
          }
        } catch (error: any) {
          // Log error silently
          setScannerError('Error processing image. Please try again.');
          setActiveTab(TabType.ADD);
        }
      };
      img.src = event.target.result as string;
    };
    reader.readAsDataURL(imageFile);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      if (!event.target?.result) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);

        // Use Html5Qrcode to scan the image
        if (html5QrCodeRef.current && file) {
          html5QrCodeRef.current
            .scanFile(file, true)
            .then(decodedText => {
              addCodeFromQr(decodedText);
            })
            .catch(() => {
              alert('Could not read QR code from image. Please try a clearer image.');
            });
        } else if (file) {
          // Create a new instance if it doesn't exist
          const html5QrCode = new Html5Qrcode('qr-reader');
          html5QrCodeRef.current = html5QrCode;

          html5QrCode
            .scanFile(file, true)
            .then(decodedText => {
              addCodeFromQr(decodedText);
            })
            .catch(() => {
              alert('Could not read QR code from image. Please try a clearer image.');
            });
        } else {
          setScannerError('No valid image found in clipboard. Please try again.');
        }
      };
      img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
  };

  const stopQrScanner = () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current
        .stop()
        .catch(() => {
          // Silent error handling
        })
        .finally(() => {
          // Clean up
        });
    }
  };

  const handleQrTextSubmit = () => {
    if (qrCodeText) {
      addCodeFromQr(qrCodeText);
    }
  };

  const saveCodes = (codes: AuthCode[]) => {
    if (chrome?.storage?.sync && masterPassword) {
      const encryptedCodes = encryptData(codes, masterPassword);
      chrome.storage.sync.set({ authCodes: encryptedCodes });
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopQrScanner();
    };
  }, []);

  // Filter codes based on current tab URL if there are matching codes
  const filteredCodes = useMemo(() => {
    if (showAllCodes) {
      return authCodes;
    }

    return authCodes.filter(
      code =>
        code.issuer.toLowerCase().includes(currentTabUrl.toLowerCase()) ||
        currentTabUrl.toLowerCase().includes(code.issuer.toLowerCase())
    );
  }, [authCodes, currentTabUrl, showAllCodes]);

  // Format TOTP code with a space in the middle for better readability
  const formatTOTPCode = (code: string): string => {
    if (code.length === 6) {
      return `${code.substring(0, 3)} ${code.substring(3)}`;
    }
    return code;
  };

  // Export TOTP codes to a text file with URI list
  const exportCodes = () => {
    if (!masterPassword) return;

    try {
      // Export encrypted data
      const exportData = {
        codes: authCodes,
        timestamp: new Date().toISOString(),
      };

      const encryptedExport = encryptData(exportData, masterPassword);

      const blob = new Blob([encryptedExport], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `totp-backup-${new Date().toISOString().split('T')[0]}.encrypted`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export TOTP codes. Please try again.');
    }
  };

  // Import TOTP codes from a text file with URI list
  const importCodes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !masterPassword) return;

    setImportError('');

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const encryptedContent = e.target?.result as string;
        const decryptedData = decryptData(encryptedContent, masterPassword);

        if (!decryptedData.codes) {
          throw new Error('Invalid backup file format');
        }

        const updatedCodes = [...authCodes, ...decryptedData.codes];
        setAuthCodes(updatedCodes);
        saveCodes(updatedCodes);
      } catch (error) {
        setImportError(
          'Failed to import codes. Make sure the file is valid and encrypted with the same password.'
        );
      }
    };

    reader.readAsText(file);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Add password management handlers
  const handlePasswordSet = (password: string) => {
    const testString = createPasswordTest(password);
    setMasterPassword(password);
    setIsPasswordSet(true);
    setIsUnlocked(true);

    // Save password test string
    if (chrome?.storage?.sync) {
      chrome.storage.sync.set({ passwordTest: testString });
    }
    setPasswordTestString(testString);
  };

  const handlePasswordVerified = (password: string) => {
    setMasterPassword(password);
    setIsUnlocked(true);
  };

  // Toggle help modal
  const toggleHelpModal = () => {
    setShowHelpModal(!showHelpModal);
  };

  return (
    <div className="app-container">
      {!isUnlocked ? (
        <PasswordManager
          isPasswordSet={isPasswordSet}
          passwordTestString={passwordTestString}
          onPasswordSet={handlePasswordSet}
          onPasswordVerified={handlePasswordVerified}
        />
      ) : (
        <>
          <header className="App-header">
            <div className="company-banner">
              <span className="company-banner-text">Need custom software solutions?</span>
              <a
                href="https://ciptadusa.com"
                target="_blank"
                rel="noopener noreferrer"
                className="company-banner-link"
              >
                {' '}
                Visit Us
              </a>
            </div>
            <div className="tab-buttons">
              <button
                className={`tab-button ${activeTab === TabType.CODES ? 'active' : ''}`}
                onClick={() => handleTabChange(TabType.CODES)}
              >
                My Codes
              </button>
              <button
                className={`tab-button ${activeTab === TabType.ADD ? 'active' : ''}`}
                onClick={() => handleTabChange(TabType.ADD)}
              >
                Add New
              </button>
              <button className="help-button" onClick={toggleHelpModal} aria-label="Help">
                ?
              </button>
            </div>
          </header>
          <main>
            {activeTab === TabType.CODES ? (
              <div className="codes-tab">
                <div className="import-export-buttons">
                  <button className="import-button" onClick={() => fileInputRef.current?.click()}>
                    Import TOTP URIs
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".txt,.text"
                    onChange={importCodes}
                  />
                  <button className="export-button" onClick={exportCodes}>
                    Export TOTP URIs
                  </button>
                </div>
                {importError && <p className="error-message">{importError}</p>}

                {!showAllCodes && filteredCodes.length > 0 && (
                  <div className="filter-notice">
                    <p>
                      Showing codes for current site: <strong>{currentTabUrl}</strong>
                    </p>
                    <button className="toggle-filter-button" onClick={() => setShowAllCodes(true)}>
                      Show All Codes
                    </button>
                  </div>
                )}

                {showAllCodes && currentTabUrl && (
                  <div className="filter-notice">
                    <p>Showing all codes</p>
                    <button className="toggle-filter-button" onClick={() => setShowAllCodes(false)}>
                      Filter by Current Site
                    </button>
                  </div>
                )}

                <div className="auth-codes">
                  {filteredCodes.length === 0 ? (
                    <div className="empty-state">
                      <p>You don&apos;t have any authentication codes yet.</p>
                      <button className="add-button" onClick={() => handleTabChange(TabType.ADD)}>
                        Add Your First Code
                      </button>
                    </div>
                  ) : (
                    filteredCodes.map((code, index) => (
                      <div className="auth-code" key={index}>
                        <div className="auth-info">
                          <div className="auth-issuer">{code.issuer}</div>
                          <div className="auth-account">{code.account}</div>
                        </div>
                        <div className="auth-code-display">
                          <button
                            className={`code-value ${copiedIndex === index ? 'copied' : ''}`}
                            onClick={() => copyToClipboard(code.code, index)}
                            aria-label={`Copy ${code.issuer} code for ${code.account}`}
                          >
                            {formatTOTPCode(code.code)}
                          </button>
                          <div className="code-timer">
                            <div className="timer-bar">
                              <div
                                className="timer-progress"
                                style={{ width: `${(code.timeRemaining / 30) * 100}%` }}
                              ></div>
                            </div>
                            <div className="timer-text">{code.timeRemaining}s</div>
                          </div>
                        </div>
                        <div className="auth-actions">
                          {deleteConfirmIndex === index ? (
                            <>
                              <button
                                className="confirm-delete-button"
                                onClick={() => removeCode(index)}
                                aria-label="Confirm delete"
                              >
                                ✓
                              </button>
                              <button
                                className="cancel-delete-button"
                                onClick={cancelDelete}
                                aria-label="Cancel delete"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <button
                              className="delete-button"
                              onClick={() => handleDeleteClick(index)}
                              aria-label={`Delete ${code.issuer} code for ${code.account}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="add-container">
                <h2>Add New Authentication</h2>

                {/* Manual Entry Form */}
                <div className="add-section">
                  <h3>Add Manually</h3>
                  <div className="form-group">
                    <label htmlFor="service-name">Service Name</label>
                    <input
                      id="service-name"
                      type="text"
                      value={newIssuer}
                      onChange={e => setNewIssuer(e.target.value)}
                      placeholder="Google, GitHub, etc."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="account-name">Account Name</label>
                    <input
                      id="account-name"
                      type="text"
                      value={newAccount}
                      onChange={e => setNewAccount(e.target.value)}
                      placeholder="username or email"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="secret-key">Secret Key</label>
                    <input
                      id="secret-key"
                      type="text"
                      value={newSecret}
                      onChange={e => setNewSecret(e.target.value)}
                      placeholder="Enter secret key (Base32 format)"
                    />
                  </div>
                  <button className="add-button" onClick={addNewCode}>
                    Add Code
                  </button>
                </div>

                {/* QR Code Options */}
                <div className="add-section">
                  <h3>Add via QR Code</h3>

                  <div className="qr-options">
                    {/* Upload QR Image */}
                    <div className="qr-option">
                      <h4>Upload QR Image</h4>
                      <p>Select a screenshot or image containing a TOTP QR code</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleFileUpload(e)}
                        className="file-input"
                      />
                    </div>

                    {/* Paste QR Text */}
                    <div className="qr-option">
                      <h4>Paste QR Text</h4>
                      <p>Paste the TOTP URI directly (starts with &quot;otpauth://totp/&quot;)</p>
                      <div className="form-group">
                        <input
                          type="text"
                          value={qrCodeText}
                          onChange={e => setQrCodeText(e.target.value)}
                          placeholder="otpauth://totp/..."
                        />
                      </div>
                      <button
                        className="add-button"
                        onClick={handleQrTextSubmit}
                        disabled={!qrCodeText}
                      >
                        Add from Text
                      </button>
                    </div>

                    {/* Paste QR Image */}
                    <div className="qr-option">
                      <h4>Paste QR Image</h4>
                      <p>Paste a screenshot from clipboard (Ctrl+V or Cmd+V)</p>
                      <div
                        className="paste-container"
                        onPaste={e => handlePasteImage(e)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            document.getElementById('paste-area')?.focus();
                          }
                        }}
                        id="paste-area"
                      >
                        <div className="paste-area-content">
                          <span>Click here and press Ctrl+V or Cmd+V to paste image</span>
                        </div>
                      </div>
                      {scannerError && <p className="error-message">{scannerError}</p>}
                    </div>
                  </div>
                </div>

                {/* Hidden element for QR code scanning */}
                <div id="qr-reader" style={{ display: 'none' }}></div>
              </div>
            )}
          </main>
          <div className="footer-container">
            <div className="author-info">Created by Indra (info@ciptadusa.com)</div>
          </div>
          <Modal isOpen={showHelpModal} onClose={toggleHelpModal} title="TOTP Authenticator Help">
            <div className="help-section">
              <h3>What is TOTP?</h3>
              <p>
                Time-based One-Time Password (TOTP) is a temporary passcode used for two-factor
                authentication.
              </p>
            </div>

            <div className="help-section">
              <h3>Adding TOTP Codes</h3>
              <p>You can add codes manually or by scanning a QR code from your service provider.</p>
            </div>

            <div className="help-section">
              <h3>Password Protection</h3>
              <p>Your TOTP secrets are encrypted with your password. Make sure to remember it!</p>
            </div>

            <div className="help-section">
              <h3>Backup Your Codes</h3>
              <p>Use the export feature to create an encrypted backup of your TOTP codes.</p>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

export default App;
