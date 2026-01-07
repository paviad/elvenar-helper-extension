import React from 'react';
import { getOverlayStore } from './overlayStore';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { ensureMinWidthAndHeight } from '../overlay';
import { ChatMessage } from '../model/socketMessages/chatPayload';
import { IconButton } from '@mui/material';

// Extend the Window interface to include forceChatRerender
declare global {
  interface Window {
    forceChatRerender?: () => void;
  }
}

interface ChatViewProps {
  searchActive?: boolean;
  searchTerm?: string;
  setSearchActive: (v: boolean) => void;
}

export function ChatView({ searchActive = false, searchTerm = '', setSearchActive }: ChatViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const useOverlayStore = getOverlayStore();
  const chatMessages = useOverlayStore((state) => state.chatMessages);
  const userMap = useOverlayStore((state) => state.userMap);
  const forceUpdate = useOverlayStore((state) => state.forceUpdate);
  const overlayExpanded = useOverlayStore((state) => state.overlayExpanded);
  const [sortedMessages, setSortedMessages] = React.useState<ChatMessage[]>([]);
  const [visibleCount, setVisibleCount] = React.useState(30);
  // Used to preserve scroll position when showing more
  const prevScrollHeightRef = React.useRef<number | null>(null);
  // Array of refs for each message
  const messageRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  // Search state
  // searchActive and searchTerm now come from props
  const [searchMatches, setSearchMatches] = React.useState<number[]>([]); // indices in sortedMessages
  const [searchIndex, setSearchIndex] = React.useState(0);

  React.useEffect(() => {
    const handler = () => setSearchActive(true);
    window.addEventListener('chat-search-activate', handler);
    return () => window.removeEventListener('chat-search-activate', handler);
  }, []);

  // Helper to get user display name and avatar
  function getUserInfo(userId: string) {
    return {
      name: userMap[userId] || userId,
      // avatar: ...
    };
  }

  // Sort messages by timestamp ascending (ensure numeric sort)
  React.useEffect(() => {
    const sortedMessages = chatMessages
      ? [...chatMessages].sort((a, b) => {
          const aNum = typeof a.timestamp === 'string' ? parseInt(a.timestamp, 10) : a.timestamp;
          const bNum = typeof b.timestamp === 'string' ? parseInt(b.timestamp, 10) : b.timestamp;
          return aNum - bNum;
        })
      : [];
    setSortedMessages(sortedMessages);
  }, [chatMessages]);

  // Search logic
  React.useEffect(() => {
    if (!searchTerm) {
      setSearchMatches([]);
      setSearchIndex(0);
      return;
    }
    const term = searchTerm.toLowerCase();
    const matches = sortedMessages
      .map((msg, idx) =>
        msg.text.toLowerCase().includes(term) || (userMap[msg.user] || msg.user).toLowerCase().includes(term)
          ? idx
          : -1,
      )
      .filter((idx) => idx !== -1);
    setSearchMatches(matches);
    setSearchIndex(matches.length > 0 ? matches.length - 1 : 0);
  }, [searchTerm, sortedMessages, userMap]);

  // Scroll highlighted match into view
  React.useEffect(() => {
    if (!searchActive || searchMatches.length === 0) return;
    const currentIdx = searchMatches[searchIndex];
    const el = messageRefs.current[currentIdx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchActive, searchIndex, searchMatches]);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (prevScrollHeightRef.current !== null) {
      // After showing more, keep scroll at the same message
      let adjustment = 0;
      if (visibleCount > 30 && visibleCount <= 60) {
        adjustment = 22; // tweak this value as needed
      }
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current - adjustment;
      prevScrollHeightRef.current = null;
    } else {
      // On new messages, scroll to bottom
      el.scrollTop = el.scrollHeight;
    }
  }, [sortedMessages, forceUpdate, visibleCount]);

  React.useEffect(() => {
    if (sortedMessages.length > 0) {
      ensureMinWidthAndHeight(400, 600);
    }
  }, [sortedMessages]);

  React.useEffect(() => {
    if (setSearchActive && !overlayExpanded) {
      setSearchActive(false);
    }
  }, [overlayExpanded]);

  // Determine which messages to show
  const total = sortedMessages.length;
  const startIdx = total > visibleCount ? total - visibleCount : 0;
  const visibleMessages =
    searchActive && searchTerm
      ? sortedMessages // show all for search
      : sortedMessages.slice(startIdx);

  return (
    <Paper
      elevation={2}
      sx={{
        background: '#f9f9fb',
        borderRadius: 2,
        p: 1.5,
        height: '100%',
        overflowY: 'auto',
        fontSize: 14,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 2,
        flex: 1,
      }}
      ref={containerRef}
    >
      {searchActive && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 1,
            mt: 1,
            position: 'sticky',
            top: 0,
            zIndex: 2,
            background: '#f9f9fb',
            pr: 2,
            pl: 2,
            border: '2px solid #222',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            alignSelf: 'end',
          }}
        >
          <Box sx={{ fontSize: 13, color: '#555' }}>
            {searchMatches.length > 0 ? `${searchIndex + 1} of ${searchMatches.length}` : '0 matches'}
          </Box>
          <IconButton
            aria-label='Previous match'
            size='small'
            sx={{ ml: 1 }}
            disabled={searchMatches.length === 0}
            onClick={() => setSearchIndex((i) => (i - 1 + searchMatches.length) % searchMatches.length)}
          >
            <span style={{ fontSize: 16 }}>▲</span>
          </IconButton>
          <IconButton
            aria-label='Next match'
            size='small'
            sx={{ ml: 0.5 }}
            disabled={searchMatches.length === 0}
            onClick={() => setSearchIndex((i) => (i + 1) % searchMatches.length)}
          >
            <span style={{ fontSize: 16 }}>▼</span>
          </IconButton>
          <IconButton
            aria-label='Close search'
            size='small'
            sx={{ ml: 1 }}
            onClick={() => {
              if (setSearchActive) setSearchActive(false);
            }}
          >
            ×
          </IconButton>
        </Box>
      )}
      {!searchActive && total > visibleCount && (
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <a
            href='#'
            style={{ color: '#1976d2', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
            onClick={(e) => {
              e.preventDefault();
              const el = containerRef.current;
              if (el) {
                prevScrollHeightRef.current = el.scrollHeight - el.scrollTop;
              }
              setVisibleCount((v) => v + 30);
            }}
          >
            Show more...
          </a>
        </Box>
      )}
      {visibleMessages && visibleMessages.length > 0 ? (
        <>
          {visibleMessages.map((msg, idx) => {
            const { name } = getUserInfo(msg.user);
            // Parse timestamp as number (milliseconds)
            const tsNum = typeof msg.timestamp === 'string' ? parseInt(msg.timestamp, 10) : msg.timestamp;
            const date = new Date(tsNum);
            const now = new Date();
            const isToday =
              date.getFullYear() === now.getFullYear() &&
              date.getMonth() === now.getMonth() &&
              date.getDate() === now.getDate();
            const time = isNaN(date.getTime())
              ? ''
              : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = isToday
              ? ''
              : date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
            // Highlight match
            const isMatch = searchActive && searchMatches.includes(idx);
            const isCurrent = isMatch && searchMatches[searchIndex] === idx;
            // (No useEffect here)
            return (
              <Stack
                key={msg.uuid}
                ref={(el) => {
                  messageRefs.current[idx] = el;
                }}
                direction='row'
                alignItems='flex-start'
                spacing={1}
                mb={1.2}
                sx={isCurrent ? { background: '#ffe082' } : isMatch ? { background: '#fffde7' } : {}}
              >
                <Avatar
                  sx={{ width: 32, height: 32, bgcolor: '#e0e0e0', color: '#888', fontWeight: 600, fontSize: 16 }}
                  title={name}
                >
                  {name[0]}
                </Avatar>
                <Box flex={1}>
                  <Stack direction='row' alignItems='baseline' spacing={1}>
                    <Typography fontWeight={600} color='text.primary' component='span'>
                      {name}
                    </Typography>
                    <Typography color='text.secondary' fontSize={12} component='span'>
                      {time}
                      {dateStr && (
                        <>
                          {' '}
                          <span style={{ fontSize: 11, color: '#aaa' }}>({dateStr})</span>
                        </>
                      )}
                    </Typography>
                  </Stack>
                  <Typography
                    color='text.primary'
                    align='left'
                    sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'left', pl: 0 }}
                  >
                    {msg.text}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
          {!searchActive && visibleCount > 30 && (
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <a
                href='#'
                style={{ color: '#1976d2', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
                onClick={(e) => {
                  e.preventDefault();
                  setVisibleCount(30);
                }}
              >
                Show less...
              </a>
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ color: '#888', textAlign: 'center', mt: 5 }}>No chat messages yet.</Box>
      )}
    </Paper>
  );
}
