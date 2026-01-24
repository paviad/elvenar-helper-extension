import React from 'react';
import { useHelper } from './HelperContext';

interface HelperAvatarProps {
  onAvatarClick?: () => void;
}

const HelperAvatar: React.FC<HelperAvatarProps> = ({ onAvatarClick }) => {
  const avatarUrl = chrome.runtime.getURL('helper.png');
  // Destructure the new function from context
  const { message, hideMessage, showThrottledMessages } = useHelper();
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (message) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [message]);

  const handleAvatarClick = () => {
    // 1. Execute external prop if exists
    if (onAvatarClick) {
      onAvatarClick();
      return;
    }

    // 2. Default behavior: Toggle History
    if (isVisible) {
      // If a message is already showing, clicking the avatar closes it
      hideMessage();
    } else {
      // If closed, show the list of recent tips
      showThrottledMessages();
    }
  };

  return (
    <div style={styles.container}>
      {/* Speech Bubble */}
      <div
        style={{
          ...styles.bubbleWrapper,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(10px)',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        <div style={styles.bubble}>
          <button onClick={hideMessage} style={styles.closeButton}>
            ×
          </button>

          {/* We simply render {message} directly. 
              Since it can now be a String OR a React Component (List), 
              this works automatically. */}
          <div style={styles.messageContent}>{message}</div>

          <div style={styles.arrow} />
        </div>
      </div>

      {/* Avatar Circle */}
      <div
        onClick={handleAvatarClick}
        style={styles.avatarCircle}
        role='button'
        tabIndex={0}
        title='Click to see recent tips'
      >
        <img src={avatarUrl} alt='Helper' style={styles.avatarImage} />
      </div>
    </div>
  );
};

// --- CSS Styles ---
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 2000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    pointerEvents: 'none',
  },

  avatarCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 0 0 4px rgba(255,255,255,0.4), inset 0 0 0 1px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    pointerEvents: 'auto',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    overflow: 'hidden',
    border: '2px solid #ffffff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },

  bubbleWrapper: {
    marginBottom: '16px',
    marginRight: '8px',
    transition: 'opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    transformOrigin: 'bottom right',
    maxWidth: '300px', // Widened slightly to accommodate lists better
  },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    borderTopRightRadius: '4px',
    padding: '12px 16px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    position: 'relative',
    color: '#334155',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  // Container for text/list content
  messageContent: {
    fontSize: '14px',
    lineHeight: '1.5',
    paddingRight: '12px',
    wordBreak: 'break-word',
  },
  closeButton: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    lineHeight: 1,
    padding: '4px',
    borderRadius: '4px',
    zIndex: 10,
  },
  arrow: {
    position: 'absolute',
    bottom: '-8px',
    right: '16px',
    width: '0',
    height: '0',
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid #fff',
    filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.05))',
  },
};

export default HelperAvatar;
