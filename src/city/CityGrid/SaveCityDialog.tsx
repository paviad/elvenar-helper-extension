import React from 'react';

// --- Types ---
interface SaveCityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName?: string;
  existingCities?: string[];
}

const SaveCityDialog: React.FC<SaveCityDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultName = 'My City Layout',
  existingCities = [],
}) => {
  const [name, setName] = React.useState(defaultName);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setIsConfirming(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleInitialSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (existingCities.includes(trimmedName)) {
      setIsConfirming(true);
    } else {
      onSave(trimmedName);
      onClose();
    }
  };

  const handleConfirmOverwrite = () => {
    onSave(name.trim());
    onClose();
  };

  const handleCancelConfirmation = () => {
    setIsConfirming(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInitialSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleBackdropClick}>
      <div style={styles.dialog}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>{isConfirming ? 'Confirm Overwrite' : 'Save City Layout'}</h3>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        {/* Content Switcher */}
        {!isConfirming ? (
          // --- STANDARD SAVE VIEW ---
          <>
            <div style={styles.body}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Layout Name</label>
                <input
                  ref={inputRef}
                  type='text'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={styles.input}
                  placeholder='Enter a name...'
                  autoComplete='off'
                />

                {/* Full Unfiltered List */}
                {existingCities.length > 0 && (
                  <div style={styles.suggestionsContainer}>
                    <p style={styles.suggestionsLabel}>Existing saves:</p>
                    <div style={styles.listWrapper}>
                      {existingCities.map((city) => {
                        // Highlight if current input matches this city
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

            <div style={styles.footer}>
              <button onClick={onClose} style={styles.secondaryButton}>
                Cancel
              </button>
              <button
                onClick={handleInitialSubmit}
                disabled={!name.trim()}
                style={{
                  ...styles.primaryButton,
                  backgroundColor: name.trim() ? '#1976d2' : '#94a3b8',
                  cursor: name.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Save
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
                  A city layout named <strong>"{name}"</strong> already exists.
                </p>
              </div>
              <p style={styles.confirmText}>Do you want to overwrite it? This action cannot be undone.</p>
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
                Overwrite
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
    width: '480px',
    maxWidth: '90vw',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease-out',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '80vh',
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
    marginTop: '12px',
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
    maxHeight: '180px', // Slightly larger height for the list
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
    marginBottom: '16px',
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
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default SaveCityDialog;
