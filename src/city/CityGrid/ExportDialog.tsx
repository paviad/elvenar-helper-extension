import React, { useState, useEffect } from 'react';

// --- Types ---
interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exportString: string; 
}

const ExportDialog: React.FC<ExportDialogProps> = ({ 
  isOpen, 
  onClose, 
  exportString 
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) setCopied(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleBackdropClick}>
      <div style={styles.dialog}>
        
        {/* Header */}
        <div style={styles.header}>
          {/* UPDATED HEADING */}
          <h3 style={styles.title}>Export City Data</h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* UPDATED HINT */}
          <p style={styles.hint}>
            Copy the code below to export your city configuration. <br/>
            This data format is compatible with <strong>ElvenArchitect.com</strong>.
          </p>
          
          <div style={styles.codeContainer}>
            <textarea 
              readOnly 
              value={exportString} 
              style={styles.textarea}
              onClick={(e) => e.currentTarget.select()} 
            />
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button 
            onClick={onClose} 
            style={styles.secondaryButton}
          >
            Close
          </button>
          
          <button 
            onClick={handleCopy} 
            style={{
              ...styles.primaryButton,
              backgroundColor: copied ? '#10b981' : '#1976d2', 
            }}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>

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
    // Fixed Dimensions & Flex Layout
    width: '600px',
    height: '400px',
    maxWidth: '90vw', 
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column', 
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease-out',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flexShrink: 0, 
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
    flexGrow: 1, 
    overflow: 'hidden', 
  },
  hint: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.5,
    flexShrink: 0,
  },
  codeContainer: {
    flexGrow: 1, 
    display: 'flex',
    flexDirection: 'column',
  },
  textarea: {
    width: '100%',
    height: '100%', 
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f1f5f9',
    color: '#64748b', 
    fontFamily: 'monospace',
    fontSize: '12px',
    resize: 'none', 
    boxSizing: 'border-box',
    outline: 'none',
    wordBreak: 'break-all',
    overflowY: 'auto', 
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    backgroundColor: '#fff',
    flexShrink: 0, 
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
    padding: '8px 20px',
    borderRadius: '6px',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    minWidth: '140px',
  },
};

export default ExportDialog;