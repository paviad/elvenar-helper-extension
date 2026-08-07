import React from 'react';
import { HELPER_MESSAGES, HelperMessageId } from './helperMessages';

// Options interface
interface ShowMessageOptions {
  force?: boolean;
  params?: string[];
}

// New History Structure
interface HistoryEntry {
  timestamp: number;
  params?: string[];
}

interface HelperContextType {
  message: React.ReactNode | null;
  showMessage: (id: HelperMessageId, options?: ShowMessageOptions) => void;
  hideMessage: () => void;
  showThrottledMessages: () => void;
}

const HelperContext = React.createContext<HelperContextType | undefined>(undefined);

const STORAGE_KEY = 'helper_msg_history';
const THROTTLE_LIMIT = 60 * 60 * 1000;

// --- Helper: Simple String Format ---
const formatString = (template: string, args?: string[]) => {
  if (!args || args.length === 0) return template;
  return template.replace(/{(\d+)}/g, (match, number) => {
    return typeof args[number] !== 'undefined' ? args[number] : match;
  });
};

export const HelperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = React.useState<React.ReactNode | null>(null);

  // Nothing renders the history — it is only ever read at the moment a message is shown,
  // to decide whether the throttle has expired. Holding it in a ref rather than state
  // keeps showMessage and showThrottledMessages referentially stable, which is what lets
  // the context value below stay memoised across a message change.
  const historyRef = React.useRef<Record<string, HistoryEntry>>({});

  // 1. Load History (with migration support)
  React.useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        const rawData = result[STORAGE_KEY] as Record<string, HistoryEntry | number> | undefined;
        if (rawData) {
          // Normalize data: Convert old number format to new object format if needed
          const normalized: Record<string, HistoryEntry> = {};

          Object.keys(rawData).forEach((key) => {
            const val = rawData[key];
            if (typeof val === 'number') {
              // Legacy format support
              normalized[key] = { timestamp: val };
            } else {
              // New format
              normalized[key] = val;
            }
          });

          historyRef.current = normalized;
        }
      });
    }
  }, []);

  // 2. Show Message
  const showMessage = React.useCallback((id: HelperMessageId, options: ShowMessageOptions = {}) => {
    const rawText = HELPER_MESSAGES[id];
    if (!rawText) return;

    const { force = false, params = [] } = options;

    const now = Date.now();
    const lastEntry = historyRef.current[id];
    const lastShown = lastEntry ? lastEntry.timestamp : 0;

    // Check Throttle
    if (!force && now - lastShown < THROTTLE_LIMIT) {
      return;
    }

    // Format the text with params
    const finalMessage = formatString(rawText, params);
    setMessage(finalMessage);

    // Save new entry with params
    const newEntry: HistoryEntry = { timestamp: now, params };
    const newHistory = { ...historyRef.current, [id]: newEntry };

    historyRef.current = newHistory;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: newHistory }).catch((err) => {
        console.warn('ElvenAssist: Failed to save helper message history:', err);
      });
    }
  }, []);

  // 3. Show History (Updated to use stored params)
  const showThrottledMessages = React.useCallback(() => {
    const now = Date.now();
    const history = historyRef.current;

    // Filter active IDs
    const activeIds = Object.keys(history).filter((id) => {
      return now - history[id].timestamp < THROTTLE_LIMIT;
    });

    if (activeIds.length === 0) {
      setMessage("I haven't given you any tips recently!");
      return;
    }

    const listContent = (
      <div style={{ textAlign: 'left' }}>
        <div
          style={{ fontWeight: '700', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}
        >
          Recent Tips
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', maxHeight: '200px', overflowY: 'auto' }}>
          {activeIds.map((id) => {
            const rawText = HELPER_MESSAGES[id as HelperMessageId];
            const entry = history[id];

            // Format using the stored params for this specific instance
            const displayText = formatString(rawText, entry.params);

            return (
              <li key={id} style={{ marginBottom: '6px', fontSize: '13px' }}>
                {displayText}
              </li>
            );
          })}
        </ul>
      </div>
    );
    setMessage(listContent);
  }, []);

  const hideMessage = React.useCallback(() => {
    setMessage(null);
  }, []);

  // Memoised because every consumer of useHelper re-renders when this object changes
  // identity, and the three callbacks are stable, so only a new message is a real change.
  // Handing out a fresh literal each render also made `helper` unusable as an effect
  // dependency — callers had to stash it in a ref to stop their effects re-firing.
  const value: HelperContextType = React.useMemo(
    () => ({ message, showMessage, hideMessage, showThrottledMessages }),
    [message, showMessage, hideMessage, showThrottledMessages],
  );

  return <HelperContext.Provider value={value}>{children}</HelperContext.Provider>;
};

export const useHelper = () => {
  const context = React.useContext(HelperContext);
  if (!context) throw new Error('useHelper must be used within a HelperProvider');
  return context;
};
