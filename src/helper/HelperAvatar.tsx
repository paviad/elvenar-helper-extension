import React from 'react';
import { useTabStore } from '../util/tabStore';
import { useHelper } from './HelperContext';

interface HelperAvatarProps {
  onAvatarClick?: () => void;
}

const HelperAvatar: React.FC<HelperAvatarProps> = ({ onAvatarClick }) => {
  const avatarUrl = chrome.runtime.getURL('helper.png');
  const { message, hideMessage, showThrottledMessages } = useHelper();
  // The bubble is shown exactly when there is a message, so this is a read of the message
  // rather than a copy of it kept in step by an effect - which showed the bubble a render
  // late and, on the way out, animated it away a render after the text had already gone.
  const isVisible = !!message;

  // Zustand Tab Store Integration
  const savedPosition = useTabStore((state) => state.avatarPosition);
  const setSavedPosition = useTabStore((state) => state.setAvatarPosition);

  // --- Dragging State ---
  const [position, setPosition] = React.useState(savedPosition || { x: 0, y: 0 });
  // The ref is what the pointer and click handlers read, since a click arrives before any
  // re-render would land and it has to know whether the gesture was a drag. The cursor is
  // rendered, though, and a ref does not trigger a render - it only appeared to work
  // because dragging sets the position on every move. Hence the pair.
  const isDraggingRef = React.useRef(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const initialMousePos = React.useRef({ x: 0, y: 0 });

  // Calculate if the avatar is on the left side of the screen
  const isLeftSide = React.useMemo(() => {
    // 24 (right spacing) + 56 (avatar width) = 80px from right edge initially
    const currentX = window.innerWidth - 80 + position.x;
    return currentX < window.innerWidth / 2;
  }, [position.x]);

  React.useEffect(() => {
    if (savedPosition) {
      setPosition(savedPosition);
    }
  }, [savedPosition]);

  const handleAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick();
      return;
    }

    if (isVisible) {
      hideMessage();
    } else {
      showThrottledMessages();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = false;
    initialMousePos.current = { x: e.clientX, y: e.clientY };
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      const dx = Math.abs(e.clientX - initialMousePos.current.x);
      const dy = Math.abs(e.clientY - initialMousePos.current.y);

      if (dx > 5 || dy > 5) {
        isDraggingRef.current = true;
        setIsDragging(true);
      }

      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);

    if (isDraggingRef.current) {
      setSavedPosition(position);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    handleAvatarClick();
  };

  return (
    <div
      style={{
        ...styles.container,
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <div
        style={{
          ...styles.bubbleWrapper,
          ...(isLeftSide ? { left: '-8px' } : { right: '-8px' }),
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(10px)',
          transformOrigin: isLeftSide ? 'bottom left' : 'bottom right',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            ...styles.bubble,
            borderBottomLeftRadius: isLeftSide ? '4px' : '12px',
            borderBottomRightRadius: isLeftSide ? '12px' : '4px',
          }}
        >
          <button onClick={hideMessage} style={styles.closeButton}>
            ×
          </button>
          <div style={styles.messageContent}>{message}</div>
          <div
            style={{
              ...styles.arrow,
              ...(isLeftSide ? { left: '28px' } : { right: '28px' }),
            }}
          />
        </div>
      </div>

      <div
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          ...styles.avatarCircle,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        role='button'
        tabIndex={0}
        title='Click to see recent tips, drag to move'
      >
        <img src={avatarUrl} alt='Helper' style={styles.avatarImage} draggable={false} />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 2000,
    width: '56px',
    height: '56px',
    pointerEvents: 'none',
  },
  avatarCircle: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 0 0 4px rgba(255,255,255,0.4), inset 0 0 0 1px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    transition: 'box-shadow 0.2s ease',
    overflow: 'hidden',
    border: '2px solid #ffffff',
    boxSizing: 'border-box',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    userSelect: 'none',
  },
  bubbleWrapper: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: '16px',
    width: 'max-content',
    maxWidth: '300px',
    transition: 'opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    position: 'relative',
    color: '#334155',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
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
    width: '0',
    height: '0',
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid #fff',
    filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.05))',
  },
};

export default HelperAvatar;
