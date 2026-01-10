import React, { useState, useEffect, useRef } from 'react';

// --- Types ---
interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (name: string, data: string) => void;
  existingCities?: string[];
}

const ImportDialog: React.FC<ImportDialogProps> = ({ 
  isOpen, 
  onClose, 
  onImport, 
  existingCities = []
}) => {
  const [dataString, setDataString] = useState('');
  const [name, setName] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isValid, setIsValid] = useState(false); 
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // --- Validation Logic ---
  const validateInput = (str: string): boolean => {
    if (!str || !str.trim()) return false;
    try {
      // 1. Check if Base64
      const decoded = atob(str.trim());
      // 2. Check if JSON
      JSON.parse(decoded);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Re-validate whenever dataString changes
  useEffect(() => {
    setIsValid(validateInput(dataString));
  }, [dataString]);

  // Reset state & Check Clipboard when dialog opens
  useEffect(() => {
    if (isOpen) {
      // 1. Reset State
      setDataString('');
      setName('');
      setIsConfirming(false);
      setIsValid(false);

      // 2. Attempt to read clipboard automatically
      const checkClipboard = async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (validateInput(text)) {
              setDataString(text);
            }
          }
        } catch (err) {
          // Silent fail: Browser denied permission or clipboard is empty/inaccessible
          // We don't want to annoy the user with an alert here.
          console.debug("Clipboard auto-read failed or denied", err);
        }
      };
      
      checkClipboard();

      // 3. Focus Textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleInitialSubmit = () => {
    const trimmedName = name.trim();
    const trimmedData = dataString.trim();

    if (!trimmedName || !isValid) return;

    if (existingCities.includes(trimmedName)) {
      setIsConfirming(true);
    } else {
      onImport(trimmedName, trimmedData);
      onClose();
    }
  };

  const handleConfirmOverwrite = () => {
    onImport(name.trim(), dataString.trim());
    onClose();
  };

  const handleCancelConfirmation = () => {
    setIsConfirming(false);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  // Determine input styles based on validation status
  const showValidationError = dataString.trim().length > 0 && !isValid;

  return (
    <div style={styles.overlay} onClick={handleBackdropClick}>
      <div style={styles.dialog}>
        
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>
            {isConfirming ? 'Confirm Import Overwrite' : 'Import City Data'}
          </h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {/* Content Switcher */}
        {!isConfirming ? (
          // --- STANDARD IMPORT VIEW ---
          <>
            <div style={styles.body}>
              
              {/* 1. Data Input */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Paste Data String 
                  {showValidationError && <span style={styles.errorLabel}> (Invalid Format)</span>}
                </label>
                <textarea
                  ref={textareaRef}
                  value={dataString}
                  onChange={(e) => setDataString(e.target.value)}
                  style={{
                    ...styles.textarea,
                    borderColor: showValidationError ? '#ef4444' : '#cbd5e1',
                    backgroundColor: showValidationError ? '#fef2f2' : '#fff'
                  }}
                  placeholder="Paste your base64 string here..."
                />
              </div>

              {/* 2. Name Input */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Save As</label>
                <input 
                  ref={nameInputRef}
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                  placeholder="Enter a name for this city..."
                  autoComplete="off"
                />
                
                {/* Existing Cities List */}
                {existingCities.length > 0 && (
                  <div style={styles.suggestionsContainer}>
                    <p style={styles.suggestionsLabel}>Or overwrite existing:</p>
                    <div style={styles.listWrapper}>
                      {existingCities.map((city) => {
                        const isSelected = city === name;
                        return (
                          <button 
                            key={city} 
                            style={{
                              ...styles.suggestionItem,
                              backgroundColor: isSelected ? '#e0f2fe' : 'transparent',
                              color: isSelected ? '#0284c7' : '#334155',
                              fontWeight: isSelected ? 600 : 400,
                            }}
                            onClick={() => setName(city)}
                          >
                            {city}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={styles.footer}>
              <button onClick={onClose} style={styles.secondaryButton}>Cancel</button>
              <button 
                onClick={handleInitialSubmit} 
                // Disable if name is empty OR data is invalid
                disabled={!name.trim() || !isValid}
                style={{
                  ...styles.primaryButton,
                  backgroundColor: (name.trim() && isValid) ? '#1976d2' : '#94a3b8',
                  cursor: (name.trim() && isValid) ? 'pointer' : 'not-allowed',
                }}
              >
                Import
              </button>
            </div>
          </>
        ) : (
          // --- CONFIRMATION VIEW ---
          <>
            <div style={styles.body}>
              <div style={styles.warningBox}>
                <div style={styles.warningIcon}>⚠️</div>
                <p style={styles.warningText}>
                  A city named <strong>"{name}"</strong> already exists.
                </p>
              </div>
              <p style={styles.confirmText}>
                Importing this data will overwrite the existing city layout. 
                Are you sure?
              </p>
            </div>

            <div style={styles.footer}>
              <button onClick={handleCancelConfirmation} style={styles.secondaryButton}>
                Back
              </button>
              <button 
                onClick={handleConfirmOverwrite} 
                style={{
                  ...styles.primaryButton,
                  backgroundColor: '#d32f2f', // Red for danger
                }}
              >
                Overwrite & Import
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

// --- CSS Styles ---
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '500px',
    maxWidth: '90vw',
    maxHeight: '85vh', 
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease-out',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#0f172a',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    lineHeight: 1,
    color: '#64748b',
    cursor: 'pointer',
    padding: '0 4px',
  },
  body: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#334155',
  },
  errorLabel: {
    color: '#ef4444',
    fontSize: '12px',
    fontWeight: 600,
  },
  textarea: {
    width: '100%',
    height: '80px',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    color: '#1e293b',
    fontFamily: 'monospace',
    fontSize: '12px',
    resize: 'none',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s, background-color 0.2s',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '16px',
    color: '#1e293b',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  
  // --- List Styles ---
  suggestionsContainer: {
    marginTop: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  suggestionsLabel: {
    margin: 0,
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 600,
  },
  listWrapper: {
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    maxHeight: '140px',
    overflowY: 'auto',
    backgroundColor: '#f8fafc',
  },
  suggestionItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 12px',
    border: 'none',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.1s',
  },

  // --- Confirmation Styles ---
  warningBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  warningIcon: {
    fontSize: '24px',
  },
  warningText: {
    margin: 0,
    fontSize: '14px',
    color: '#991b1b',
    lineHeight: 1.5,
  },
  confirmText: {
    margin: 0,
    fontSize: '14px',
    color: '#374151',
  },

  // --- Footer ---
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    backgroundColor: '#fff',
    marginTop: 'auto', 
  },
  secondaryButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    color: '#475569',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  primaryButton: {
    padding: '8px 24px',
    borderRadius: '6px',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
};

export default ImportDialog;