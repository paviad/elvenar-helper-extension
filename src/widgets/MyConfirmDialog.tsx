import React, { useEffect } from 'react';

// --- Types ---
type Severity = 'info' | 'success' | 'warning' | 'error';

interface MyConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void; // Triggered by Cancel, Backdrop, or Escape
  onConfirm: () => void;
  title: string;
  message: string;
  severity?: Severity;
  confirmLabel?: string;
  cancelLabel?: string;
}

const MyConfirmDialog: React.FC<MyConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  severity = 'info',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
}) => {

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Configuration map for styling based on severity
  const config = {
    info: {
      color: '#3b82f6', // Blue
      bg: '#eff6ff',
      icon: 'ℹ️',
    },
    success: {
      color: '#10b981', // Green
      bg: '#ecfdf5',
      icon: '✅',
    },
    warning: {
      color: '#f59e0b', // Amber
      bg: '#fffbeb',
      icon: '⚠️',
    },
    error: {
      color: '#ef4444', // Red
      bg: '#fef2f2',
      icon: '🛑',
    },
  };

  const theme = config[severity];

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
          <div style={styles.titleGroup}>
            {/* Severity Icon Wrapper */}
            <div style={{
              ...styles.iconWrapper,
              backgroundColor: theme.bg,
              color: theme.color,
            }}>
              {theme.icon}
            </div>
            <h3 style={styles.title}>{title}</h3>
          </div>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <p style={styles.message}>{message}</p>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button 
            onClick={onClose} 
            style={styles.secondaryButton}
          >
            {cancelLabel}
          </button>
          
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              ...styles.primaryButton,
              backgroundColor: theme.color,
            }}
          >
            {confirmLabel}
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
    zIndex: 1100, // Higher than other dialogs if nested
    backdropFilter: 'blur(2px)',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '400px',
    maxWidth: '90vw',
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
    backgroundColor: '#fff', // Cleaner look for alerts to have white header
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
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
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0 4px',
  },
  body: {
    padding: '24px',
  },
  message: {
    margin: 0,
    fontSize: '15px',
    lineHeight: 1.5,
    color: '#475569',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    backgroundColor: '#f8fafc',
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
    transition: 'filter 0.2s',
  },
};

export default MyConfirmDialog;