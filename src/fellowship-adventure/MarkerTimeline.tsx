import React, { useMemo, useState, useEffect } from 'react';

// --- Types & Interfaces ---

export interface MarkerData {
  id: string;
  title: string;
  value: number;
  time: string | Date;
  // New props for the icon
  spriteX?: number;
  spriteY?: number;
}

interface TimelineProps {
  startTime?: Date | string;
  markers: MarkerData[];
  spriteUrl: string; // New prop for the icon source
}

interface LayoutMarker extends MarkerData {
  percent: number;
  isTop: boolean;
  level: number;
}

// --- Constants ---
const HOURS_SPAN = 48;
const LABEL_WIDTH_PERCENT = 12;
const LEVEL_HEIGHT = 70;
// Card Dimensions
const CARD_WIDTH = 140; // Increased from 120
const CARD_HEIGHT = 60;

// --- CSS Animation ---
const pulseAnimationStyles = `
  @keyframes dangerousPulse {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); border-color: #f87171; }
    70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); border-color: #dc2626; }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: #f87171; }
  }
`;

// --- Helper Functions ---

const formatTime = (dateInput: Date | string): string => {
  const date = new Date(dateInput);
  const now = new Date();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffTime = checkDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return timeStr;
  else if (diffDays === 1) return `Tmrw ${timeStr}`;
  else if (diffDays === -1) return `Yest ${timeStr}`;
  else {
    const dayName = date.toLocaleDateString([], { weekday: 'short' });
    return `${dayName} ${timeStr}`;
  }
};

const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getRelativeDelta = (dateStr: string | Date, nowTime: number): string => {
  const diffMs = new Date(dateStr).getTime() - nowTime;
  const isFuture = diffMs >= 0;
  const absMs = Math.abs(diffMs);

  const totalMinutes = absMs / (1000 * 60);

  if (totalMinutes < 1) return 'Just now';

  if (totalMinutes < 60) {
    const roundedMinutes = Math.round(totalMinutes);
    const unit = roundedMinutes === 1 ? 'minute' : 'minutes';
    if (isFuture) return `In ${roundedMinutes} ${unit}`;
    return `${roundedMinutes} ${unit} ago`;
  }

  const totalHours = absMs / (1000 * 60 * 60);
  const roundedHours = Math.round(totalHours * 2) / 2;
  const unit = roundedHours === 1 ? 'hour' : 'hours';

  if (isFuture) return `In ${roundedHours} ${unit}`;
  return `${roundedHours} ${unit} ago`;
};

// --- CORE LAYOUT LOGIC ---
const calculateLayout = (markers: MarkerData[], startTime: Date, totalDuration: number): LayoutMarker[] => {
  const sorted = [...markers].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const positioned = sorted.map((marker) => {
    const diff = new Date(marker.time).getTime() - startTime.getTime();
    const percent = (diff / totalDuration) * 100;
    return { ...marker, percent };
  });

  const topTracks: number[] = [];
  const bottomTracks: number[] = [];

  return positioned.map((marker, index) => {
    const isTop = index % 2 === 0;
    const tracks = isTop ? topTracks : bottomTracks;
    let level = -1;

    for (let i = 0; i < tracks.length; i++) {
      if (marker.percent >= tracks[i] + 1) {
        level = i;
        break;
      }
    }

    if (level === -1) {
      level = tracks.length;
      tracks.push(0);
    }
    tracks[level] = Math.max(tracks[level], marker.percent + LABEL_WIDTH_PERCENT);

    return { ...marker, isTop, level };
  });
};

export const MarkerTimeline: React.FC<TimelineProps> = ({ startTime, markers, spriteUrl }) => {
  const [now, setNow] = useState(() => (startTime ? new Date(startTime).getTime() : Date.now()));

  const start = useMemo(() => new Date(now), [now]);
  const totalDuration = HOURS_SPAN * 60 * 60 * 1000;

  const allCalculatedMarkers = useMemo(() => {
    return calculateLayout(markers, start, totalDuration);
  }, [markers, start, totalDuration]);

  const { pastDueMarkers, upcomingMarkers, hasPastDue } = useMemo(() => {
    const past: LayoutMarker[] = [];
    const future: LayoutMarker[] = [];

    allCalculatedMarkers.forEach((m) => {
      if (m.percent < 0) {
        past.push(m);
      } else if (m.percent <= 100) {
        future.push(m);
      }
    });

    past.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return {
      pastDueMarkers: past,
      upcomingMarkers: future,
      hasPastDue: past.length > 0,
    };
  }, [allCalculatedMarkers]);

  useEffect(() => {
    const updateTime = () => setNow(Date.now());

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const nextMarkerTimestamp = markers
      .map((m) => new Date(m.time).getTime())
      .filter((t) => t > now)
      .sort((a, b) => a - b)[0];

    let delay = 60000;
    if (nextMarkerTimestamp) {
      const timeUntilMarker = nextMarkerTimestamp - now;
      delay = Math.min(delay, timeUntilMarker + 500);
    }
    delay = Math.max(1000, delay);

    const timerId = setTimeout(updateTime, delay);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [now, markers]);

  const maxTopLevel = Math.max(...upcomingMarkers.filter((m) => m.isTop).map((m) => m.level), -1);
  const maxBottomLevel = Math.max(...upcomingMarkers.filter((m) => !m.isTop).map((m) => m.level), -1);

  const paddingTop = (maxTopLevel + 1) * LEVEL_HEIGHT + 20;
  const paddingBottom = (maxBottomLevel + 1) * LEVEL_HEIGHT + 20;

  const renderTicks = () => {
    const ticks = [];
    const intervalHours = 6;
    const totalTicks = HOURS_SPAN / intervalHours;

    for (let i = 0; i <= totalTicks; i++) {
      const isMajor = i % 2 === 0;
      const percent = (i / totalTicks) * 100;
      const tickTime = new Date(start.getTime() + i * intervalHours * 60 * 60 * 1000);

      ticks.push(
        <div key={i} style={{ ...styles.tickWrapper, left: `${percent}%` }}>
          <div
            style={{
              ...styles.tickLine,
              height: isMajor ? '16px' : '8px',
              backgroundColor: isMajor ? '#94a3b8' : '#cbd5e1',
              top: paddingTop - (isMajor ? 8 : 4),
            }}
          />
          {isMajor && (
            <div style={{ ...styles.tickLabel, top: paddingTop + 15 }}>
              <div>{formatTime(tickTime)}</div>
            </div>
          )}
        </div>,
      );
    }
    return ticks;
  };

  const frameStyle = {
    ...styles.frame,
    ...(hasPastDue ? styles.frameDanger : {}),
    animation: hasPastDue ? 'dangerousPulse 2s infinite' : 'none',
  };

  const headerStyle = {
    ...styles.frameHeader,
    ...(hasPastDue ? styles.headerDanger : {}),
  };

  return (
    <>
      <style>{pulseAnimationStyles}</style>

      <div style={frameStyle}>
        <div style={headerStyle}>
          <div style={styles.headerTitleGroup}>
            <h2 style={styles.headerTitle}>Badge Production Timeline</h2>
            {hasPastDue ? (
              <span style={styles.urgentBadge}>{pastDueMarkers.length} Past Due</span>
            ) : (
              <span style={styles.headerBadge}>{HOURS_SPAN} Hours</span>
            )}
          </div>
          <div style={styles.headerSubtitle}>
            Current Window: {formatDate(start)} {formatTime(start)}
          </div>
        </div>

        <div style={styles.mainContentFlex}>
          {/* Left Sidebar - Past Due */}
          {hasPastDue && (
            <div style={styles.pastDueSidebar}>
              <h3 style={styles.sidebarTitle}>OVERDUE ITEMS</h3>
              <div style={styles.pastDueList}>
                {pastDueMarkers.map((marker) => (
                  <div key={marker.id} style={styles.largeCard} title={getRelativeDelta(marker.time, now)}>
                    <div style={styles.largeCardHeader}>
                      {/* Icon added to sidebar cards too */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            ...styles.icon,
                            backgroundImage: `url(${spriteUrl})`,
                            backgroundPosition: `-${marker.spriteX || 0}px -${marker.spriteY || 0}px`,
                          }}
                        />
                        <span style={styles.largeCardTitle} title={marker.title}>
                          {marker.title}
                        </span>
                      </div>
                      <span style={styles.largeCardValue}>{marker.value}</span>
                    </div>
                    <div style={styles.largeCardTime}>
                      Due: {formatDate(marker.time)} at {formatTime(marker.time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right Scroll Area - Upcoming */}
          <div style={styles.scrollContainer}>
            <div style={{ ...styles.wrapper, height: paddingTop + paddingBottom }}>
              {renderTicks()}
              <div style={{ ...styles.line, top: paddingTop }} />

              {upcomingMarkers.map((marker) => {
                const verticalOffset = (marker.level + 1) * LEVEL_HEIGHT;
                const topPos = marker.isTop ? paddingTop - verticalOffset : paddingTop + verticalOffset - CARD_HEIGHT;

                return (
                  <div key={marker.id} style={{ ...styles.markerWrapper, left: `${marker.percent}%` }}>
                    <div
                      style={{
                        ...styles.connector,
                        top: marker.isTop ? topPos + CARD_HEIGHT : paddingTop,
                        height: Math.abs(
                          marker.isTop ? paddingTop - (topPos + CARD_HEIGHT) : verticalOffset - CARD_HEIGHT,
                        ),
                      }}
                    />
                    <div style={{ ...styles.dot, top: paddingTop - 5 }} />
                    <div
                      style={{
                        ...styles.card,
                        top: topPos,
                        // Unified color for all cards (Blue)
                        borderColor: '#3b82f6',
                      }}
                      title={getRelativeDelta(marker.time, now)}
                    >
                      <div style={styles.cardHeader}>
                        {/* Title Group with Icon */}
                        <div style={styles.cardTitleGroup}>
                          <div
                            style={{
                              ...styles.icon,
                              backgroundImage: `url(${spriteUrl})`,
                              backgroundPosition: `-${marker.spriteX || 0}px -${marker.spriteY || 0}px`,
                            }}
                          />
                          <span style={styles.cardTitle}>{marker.title}</span>
                        </div>
                        <span style={styles.cardValue}>{marker.value}</span>
                      </div>
                      <div style={styles.cardTime}>{formatTime(marker.time)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// --- CSS Styles ---
const styles: Record<string, React.CSSProperties> = {
  frame: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '2px solid #e2e8f0',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '1300px',
    margin: '0 auto',
    transition: 'border-color 0.3s ease',
  },
  frameDanger: {
    borderColor: '#ef4444',
  },
  frameHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 0.3s ease',
  },
  headerDanger: {
    backgroundColor: '#fef2f2',
    borderBottomColor: '#fecaca',
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a',
  },
  headerBadge: {
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '20px',
  },
  urgentBadge: {
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 12px',
    borderRadius: '20px',
    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 500,
  },
  mainContentFlex: {
    display: 'flex',
    height: '100%',
    alignItems: 'stretch',
  },
  pastDueSidebar: {
    width: '300px',
    minWidth: '300px',
    backgroundColor: '#fef2f2',
    borderRight: '2px solid #fee2e2',
    padding: '20px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    maxHeight: '500px',
  },
  sidebarTitle: {
    margin: '0 0 15px 0',
    color: '#991b1b',
    fontSize: '14px',
    fontWeight: '800',
    letterSpacing: '0.05em',
  },
  pastDueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  largeCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    borderLeft: '6px solid #dc2626',
    boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)',
    padding: '16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'help',
  },
  largeCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
    gap: '10px',
  },
  largeCardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#7f1d1d',
    wordBreak: 'break-word',
  },
  largeCardValue: {
    fontWeight: '800',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '14px',
  },
  largeCardTime: {
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: 600,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: '24px',
    boxSizing: 'border-box',
    overflowX: 'auto',
    backgroundColor: '#ffffff',
  },
  wrapper: {
    position: 'relative',
    width: '90%',
    left: '5%',
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: '#cbd5e1',
    zIndex: 1,
  },
  tickWrapper: {
    position: 'absolute',
    height: '100%',
    width: '1px',
    zIndex: 0,
  },
  tickLine: {
    position: 'absolute',
    width: '2px',
    left: '-1px',
    borderRadius: '2px',
    zIndex: 1,
  },
  tickLabel: {
    position: 'absolute',
    left: '-50px',
    width: '100px',
    textAlign: 'center',
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 600,
  },
  markerWrapper: {
    position: 'absolute',
    width: '1px',
    height: '100%',
    zIndex: 10,
  },
  dot: {
    position: 'absolute',
    left: '-5px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#334155',
    border: '2px solid white',
    boxShadow: '0 0 0 1px #cbd5e1',
    zIndex: 2,
  },
  connector: {
    position: 'absolute',
    left: '-1px',
    width: '2px',
    borderLeft: '2px dashed #cbd5e1',
    zIndex: 1,
  },
  // --- Updated Card Styles ---
  card: {
    position: 'absolute',
    left: `-${CARD_WIDTH / 2}px`, // Centered using new width constant
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    backgroundColor: 'white',
    borderRadius: '8px',
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '8px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    fontSize: '12px',
    transition: 'transform 0.2s ease',
    zIndex: 10,
    cursor: 'help',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
  },
  cardTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    overflow: 'hidden', // Ensures title doesn't break layout
  },
  icon: {
    width: '24px',
    height: '24px',
    backgroundRepeat: 'no-repeat',
    flexShrink: 0,
  },
  cardTitle: {
    fontWeight: '700',
    color: '#1e293b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '75px', // Adjusted for icon presence
  },
  cardValue: {
    fontWeight: '700',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    flexShrink: 0,
  },
  cardTime: {
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 500,
  },
};
