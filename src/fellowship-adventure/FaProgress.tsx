import React from 'react';

// --- Types ---

export interface ProgressItem {
  id: string;
  name: string;
  value: number; 
  displayValue?: string;
  
  futureValue?: number;
  displayFutureValue?: string;
  
  spriteX: number; 
  spriteY: number; 
}

interface FaProgressProps {
  title?: string;
  subtitle?: string; // New: To match Timeline header structure
  badge?: string | number; // New: To match Timeline badge
  items: ProgressItem[];
  spriteUrl: string;
  iconSize?: number; 
}

const FaProgress: React.FC<FaProgressProps> = ({ 
  title = "Production Progress", 
  subtitle,
  badge,
  items, 
  spriteUrl,
  iconSize = 24 
}) => {
  return (
    <div style={styles.card}>
      {/* Header - Styled to match Timeline component */}
      <div style={styles.header}>
        <div style={styles.headerTitleGroup}>
          <h3 style={styles.headerTitle}>{title}</h3>
          {badge !== undefined && (
            <span style={styles.headerBadge}>{badge}</span>
          )}
        </div>
        {subtitle && (
          <div style={styles.headerSubtitle}>{subtitle}</div>
        )}
      </div>

      {/* List */}
      <div style={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasFuture = item.futureValue !== undefined;
          
          return (
            <div 
              key={item.id} 
              style={{
                ...styles.listItem,
                borderBottom: isLast ? 'none' : '1px solid #f0f0f0'
              }}
            >
              {/* Sprite Image */}
              <div style={{ ...styles.avatarContainer, width: iconSize, height: iconSize }}>
                <div 
                  style={{
                    ...styles.spriteImage,
                    width: iconSize,
                    height: iconSize,
                    backgroundImage: `url(${spriteUrl})`,
                    backgroundPosition: `-${item.spriteX}px -${item.spriteY}px`,
                  }} 
                />
              </div>

              {/* Content */}
              <div style={styles.content}>
                <div style={styles.rowTop}>
                  <span style={styles.itemName} title={item.name}>
                    {item.name}
                  </span>
                  
                  {/* Values Group */}
                  <div style={styles.valuesContainer}>
                    {/* Current Value (Secondary) */}
                    <span style={styles.itemValue}>
                      {item.displayValue || `${item.value}%`}
                    </span>
                    
                    {hasFuture && (
                      <span style={styles.futureValueWrapper}>
                        <span style={styles.arrow}>→</span>
                        {/* Future Value (Primary) */}
                        <span style={styles.futureValue}>
                          {item.displayFutureValue || `${item.futureValue}%`}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div style={styles.progressTrack}>
                  <div 
                    style={{ 
                      ...styles.progressBar, 
                      width: `${Math.min(100, Math.max(0, item.value))}%` 
                    }} 
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- CSS Styles ---
const styles: Record<string, React.CSSProperties> = {
  card: {
    fontFamily: 'system-ui, -apple-system, sans-serif', // Updated to match Timeline font
    backgroundColor: '#fff',
    borderRadius: '12px', // Updated to match Timeline radius
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Updated shadow
    border: '1px solid #e2e8f0', // Added border to match Timeline
    overflow: 'hidden',
    width: '100%',
    maxWidth: '400px', 
    margin: '0 auto',
  },
  
  // --- Header Styles (Matched to Timeline) ---
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc', // Light slate background
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '18px', // Matched Timeline
    fontWeight: '700', // Matched Timeline
    color: '#0f172a', // Matched Timeline
  },
  headerBadge: {
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '20px',
    border: '1px solid #bae6fd',
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 500,
  },
  // -------------------------------------------

  list: {
    paddingBottom: '8px',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px', // Increased side padding to match header alignment
    transition: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'default',
  },
  avatarContainer: {
    flexShrink: 0,
    marginRight: '16px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteImage: {
    backgroundRepeat: 'no-repeat',
  },
  content: {
    flexGrow: 1,
    minWidth: 0,
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '6px',
  },
  itemName: {
    fontSize: '14px', // Adjusted to match scale
    fontWeight: 600,
    color: '#1e293b', // Slate-800
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginRight: '8px',
  },
  valuesContainer: {
    display: 'flex',
    alignItems: 'baseline',
    whiteSpace: 'nowrap',
  },
  itemValue: {
    fontSize: '12px',
    fontWeight: 400,
    color: '#64748b', // Slate-500
  },
  futureValueWrapper: {
    marginLeft: '6px',
    display: 'flex',
    alignItems: 'baseline',
  },
  futureValue: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#3b82f6', // Blue-500
  },
  arrow: {
    marginRight: '4px',
    fontSize: '0.9em',
    color: '#94a3b8', 
  },
  progressTrack: {
    height: '4px',
    width: '100%',
    backgroundColor: '#e2e8f0', // Slate-200
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6', // Blue-500
    borderRadius: '2px',
    transition: 'width 0.4s ease-in-out',
  },
};

export default FaProgress;