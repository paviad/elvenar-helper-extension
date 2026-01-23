import React from 'react';
import { getAccountId, getOverlayStore } from './overlayStore';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { ensureMinWidthAndHeight, expandPanel } from '../overlay';
import { ChatMessage } from '../model/socketMessages/chatPayload';
import { IconButton } from '@mui/material';
import { getAccountById } from '../elvenar/AccountManager';
import { SendWebsocketMessage } from '../inject/websocketMessages';

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
  // Ref for jumping to first unread
  const firstUnreadRef = React.useRef<HTMLDivElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const useOverlayStore = getOverlayStore();
  const chatMessages = useOverlayStore((state) => state.chatMessages);
  const [sortedMessages, setSortedMessages] = React.useState<ChatMessage[]>([]);
  const userMap = useOverlayStore((state) => state.userMap);
  const forceUpdate = useOverlayStore((state) => state.forceUpdate);
  const overlayExpanded = useOverlayStore((state) => state.overlayExpanded);
  const lastSeenChat = useOverlayStore((state) => state.lastSeenChat);
  const setLastSeenChat = useOverlayStore((state) => state.setLastSeenChat);
  const [visibleCount, setVisibleCount] = React.useState(30);
  // Used to preserve scroll position when showing more
  const prevScrollHeightRef = React.useRef<number | null>(null);
  // Array of refs for each message
  const messageRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const [firstActivated, setFirstActivated] = React.useState(false);

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
          const aNum = parseInt(a.timestamp, 10);
          const bNum = parseInt(b.timestamp, 10);
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
    }
  }, [sortedMessages, forceUpdate, visibleCount]);

  React.useEffect(() => {
    if (sortedMessages.length > 0) {
      ensureMinWidthAndHeight(400, 600);
    }
  }, [sortedMessages]);

  React.useLayoutEffect(() => {
    if (!firstActivated) {
      const el = containerRef.current;
      setTimeout(() => {
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      }, 0);
      setFirstActivated(true);
    }
  }, [sortedMessages]);

  React.useEffect(() => {
    if (setSearchActive && !overlayExpanded) {
      setSearchActive(false);
    }
    // Scroll to end only when overlay is expanded
    if (overlayExpanded) {
      const el = containerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [overlayExpanded]);

  const [unreadUuid, setUnreadUuid] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (searchActive || !lastSeenChat) {
      setUnreadUuid(undefined);
      return;
    }
    // Update last seen chat timestamp
    const firstUnread = sortedMessages.find((msg) => {
      const tsNum = parseInt(msg.timestamp, 10);
      return tsNum > lastSeenChat;
    });
    setUnreadUuid(firstUnread?.uuid);
  }, [sortedMessages, lastSeenChat, searchActive]);

  // Determine which messages to show
  const total = sortedMessages.length;
  let firstUnreadIdx = total;
  let visMsg: ChatMessage[];
  if (searchActive && searchTerm) {
    visMsg = sortedMessages;
  } else if (lastSeenChat && !searchActive) {
    // Show messages since last seen
    firstUnreadIdx = sortedMessages.findIndex((msg) => {
      const tsNum = parseInt(msg.timestamp, 10);
      return tsNum > lastSeenChat;
    });

    if (firstUnreadIdx === -1) firstUnreadIdx = total; // all read
    const realVisibleCount = total - firstUnreadIdx + visibleCount;
    const startIdx = total > realVisibleCount ? total - realVisibleCount : 0;
    visMsg = sortedMessages.slice(startIdx);
  } else {
    const startIdx = total > visibleCount ? total - visibleCount : 0;
    visMsg = sortedMessages.slice(startIdx);
  }
  const visibleMessages = visMsg;
  let unreadIdx = visibleMessages.findIndex((msg) => msg.uuid === unreadUuid);
  if (unreadIdx === -1) {
    unreadIdx = visibleMessages.length + 1; // not in visible messages
  }

  // Handler for jump to first unread
  function handleJumpToFirstUnread(e: React.MouseEvent) {
    e.preventDefault();
    if (firstUnreadRef.current) {
      firstUnreadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function sendMarkAsReadMessage() {
    const accountId = getAccountId();
    if (!accountId) {
      return;
    }

    const accountData = getAccountById(accountId);
    if (!accountData) {
      return;
    }

    const playerId = accountData.cityQuery?.userData.player_id;
    if (!playerId) {
      return;
    }

    const guildId = accountData.cityQuery?.userData.guild_info?.id;
    if (!guildId) {
      return;
    }

    window.postMessage(
      {
        type: 'SEND_WEBSOCKET_MESSAGE',
        payload: {
          type: 'MARK_AS_READ',
          playerId,
          guildId,
        },
      } satisfies SendWebsocketMessage,
      '*',
    );
  }

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
      {!searchActive && sortedMessages.length > visibleCount + total - firstUnreadIdx && (
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
            const tsNum = parseInt(msg.timestamp, 10);
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

            // Insert unread separator if needed
            const showUnreadSeparator = idx === unreadIdx;
            const isUnread = idx >= unreadIdx;

            return (
              <React.Fragment key={msg.uuid}>
                {showUnreadSeparator && (
                  <Box
                    ref={firstUnreadRef}
                    sx={{
                      textAlign: 'center',
                      my: 1.5,
                      py: 0.5,
                      background: '#e3f2fd',
                      color: '#1976d2',
                      borderRadius: 2,
                      fontWeight: 600,
                      fontSize: 13,
                      letterSpacing: 1,
                      boxShadow: '0 1px 4px rgba(25, 118, 210, 0.08)',
                    }}
                  >
                    Unread messages{' '}
                    <a
                      href='#'
                      style={{
                        color: '#1976d2',
                        textDecoration: 'underline',
                        marginLeft: 8,
                        fontWeight: 400,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        // Mark all as read
                        if (sortedMessages.length > 0) {
                          const lastMsg = sortedMessages[sortedMessages.length - 1];
                          setLastSeenChat(parseInt(lastMsg.timestamp, 10));
                          expandPanel(false);
                          sendMarkAsReadMessage();
                        }
                      }}
                    >
                      Mark all as read
                    </a>
                  </Box>
                )}
                <Stack
                  ref={(el) => {
                    messageRefs.current[idx] = el;
                  }}
                  direction='row'
                  alignItems='flex-start'
                  spacing={1}
                  mb={1.2}
                  sx={
                    isCurrent
                      ? { background: '#ffe082' }
                      : isMatch
                      ? { background: '#fffde7' }
                      : isUnread
                      ? { background: '#39d53646' }
                      : {}
                  }
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
              </React.Fragment>
            );
          })}
          {/* Show less link */}
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
          {/* Jump to first unread link at bottom */}
          {!searchActive && unreadUuid && (
            <Box sx={{ textAlign: 'center', mt: 2, mb: 1 }}>
              <a
                href='#'
                style={{
                  color: '#1976d2',
                  fontSize: 14,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
                onClick={handleJumpToFirstUnread}
              >
                Jump to first unread
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
