import React from 'react';
import { IconButton } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ChatMessage } from '../model/socketMessages/chatPayload';
import { ensureMinWidthAndHeight, expandPanel } from '../overlay';
import {
  authorType,
  bodyType,
  defaultFace,
  engravedRule,
  gild,
  gildedAvatar,
  goldLink,
  plaqueBand,
  plaqueFace,
  plaqueTail,
  timestampType,
} from './gild';
import { getOverlayStore } from './overlayStore';

// Chat rows carry three states at once, so each is encoded on a different part of the plaque:
// the face colour marks search hits, and an inset stripe on the left marks unread.
const currentMatchFace = 'linear-gradient(180deg, #ffe9a8 0%, #f7d98a 100%)';
const matchFace = 'linear-gradient(180deg, #fffbe6 0%, #fbf1cd 100%)';
const unreadStripe = 'inset 3px 0 0 #4c8a3f';

/** Stable empty result, so an unsearched view does not hand out a fresh array each render. */
const NO_MATCHES: number[] = [];

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

  // Scrolling to the newest message is a one-off on open, so it is tracked with a ref -
  // as state it forced a second render on mount for something nothing renders.
  const hasScrolledToEnd = React.useRef(false);

  React.useEffect(() => {
    const handler = () => setSearchActive(true);
    window.addEventListener('chat-search-activate', handler);
    return () => window.removeEventListener('chat-search-activate', handler);
  }, [setSearchActive]);

  // Helper to get user display name and avatar
  function getUserInfo(userId: string) {
    return {
      name: userMap[userId] || userId,
      // avatar: ...
    };
  }

  // Sort messages by timestamp ascending (ensure numeric sort)
  const sortedMessages = React.useMemo(
    () =>
      chatMessages
        ? [...chatMessages].sort((a, b) => {
            const aNum = parseInt(a.timestamp, 10);
            const bNum = parseInt(b.timestamp, 10);
            return aNum - bNum;
          })
        : [],
    [chatMessages],
  );

  // Search logic
  const searchMatches = React.useMemo(() => {
    if (!searchTerm) return NO_MATCHES;
    const term = searchTerm.toLowerCase();
    return sortedMessages
      .map((msg, idx) =>
        msg.text.toLowerCase().includes(term) || (userMap[msg.user] || msg.user).toLowerCase().includes(term)
          ? idx
          : -1,
      )
      .filter((idx) => idx !== -1);
  }, [searchTerm, sortedMessages, userMap]);

  // Where the ▲/▼ buttons have moved to, tagged with the match list it was chosen from.
  // When a new list comes along - a different query, or a message arriving mid-search -
  // the tag no longer matches and the cursor falls back to the newest hit, which is what
  // the effect that used to reset searchIndex did.
  const [searchCursor, setSearchCursor] = React.useState<{ matches: number[]; index: number } | null>(null);
  const searchIndex =
    searchCursor && searchCursor.matches === searchMatches ? searchCursor.index : Math.max(0, searchMatches.length - 1);
  const moveSearchIndex = (next: (i: number) => number) =>
    setSearchCursor({ matches: searchMatches, index: next(searchIndex) });

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

  // Open at the newest message, once. This used to fire on mount against the empty initial
  // state - the sort had not landed yet - so it scrolled a container with nothing in it and
  // then marked itself done, and the chat opened at the top. Waiting for the first non-empty
  // render is what makes it land on the bottom. A layout effect already runs after the rows
  // are in the DOM, so scrollHeight is final here and the deferring setTimeout is not needed.
  React.useLayoutEffect(() => {
    if (hasScrolledToEnd.current || sortedMessages.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    hasScrolledToEnd.current = true;
    el.scrollTop = el.scrollHeight;
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
  }, [overlayExpanded, setSearchActive]);

  // Determine which messages to show
  const total = sortedMessages.length;

  // Where the unread run starts, or `total` when there is nothing unread to mark. Both the
  // separator and the size of the visible window are cut from this, and it used to be
  // computed twice - once here, and once in state a render behind, which is how the marker
  // and the window they are meant to agree on could disagree.
  const firstUnreadIdx = (() => {
    if (searchActive || !lastSeenChat) return total;
    const idx = sortedMessages.findIndex((msg) => parseInt(msg.timestamp, 10) > lastSeenChat);
    return idx === -1 ? total : idx; // all read
  })();
  const unreadUuid = firstUnreadIdx < total ? sortedMessages[firstUnreadIdx].uuid : undefined;

  let visMsg: ChatMessage[];
  if (searchActive && searchTerm) {
    visMsg = sortedMessages;
  } else if (lastSeenChat && !searchActive) {
    // Show messages since last seen
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

  return (
    <Paper
      elevation={2}
      sx={{
        background: gild.parchment,
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
            // Above the scrolling messages, but under the panel header at z-index 2: the header
            // traps its own menus in its stacking context, so a higher value here occludes them.
            zIndex: 1,
            background: `linear-gradient(180deg, ${gild.cardTop}, ${gild.cardBottom})`,
            pr: 2,
            pl: 2,
            border: `2px solid ${gild.mid}`,
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(58, 46, 20, 0.25)',
            alignSelf: 'end',
          }}
        >
          <Box sx={{ ...timestampType, fontSize: 11 }}>
            {searchMatches.length > 0 ? `${searchIndex + 1} of ${searchMatches.length}` : '0 matches'}
          </Box>
          <IconButton
            aria-label='Previous match'
            size='small'
            sx={{ ml: 1, color: gild.bronze }}
            disabled={searchMatches.length === 0}
            onClick={() => moveSearchIndex((i) => (i - 1 + searchMatches.length) % searchMatches.length)}
          >
            <span style={{ fontSize: 16 }}>▲</span>
          </IconButton>
          <IconButton
            aria-label='Next match'
            size='small'
            sx={{ ml: 0.5, color: gild.bronze }}
            disabled={searchMatches.length === 0}
            onClick={() => moveSearchIndex((i) => (i + 1) % searchMatches.length)}
          >
            <span style={{ fontSize: 16 }}>▼</span>
          </IconButton>
          <IconButton
            aria-label='Close search'
            size='small'
            sx={{ ml: 1, color: gild.bronze }}
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
            style={goldLink}
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
                      background: 'linear-gradient(180deg, #eef6e6, #e2efd6)',
                      color: '#3f6b34',
                      borderTop: '1px solid #b6cfa6',
                      borderBottom: '1px solid #b6cfa6',
                      fontFamily: gild.serif,
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Unread messages{' '}
                    <a
                      href='#'
                      style={{
                        ...goldLink,
                        color: '#3f6b34',
                        marginLeft: 8,
                        fontWeight: 400,
                        fontSize: 12,
                        textTransform: 'none',
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        // Mark all as read
                        if (sortedMessages.length > 0) {
                          const lastMsg = sortedMessages[sortedMessages.length - 1];
                          setLastSeenChat(parseInt(lastMsg.timestamp, 10));
                          expandPanel(false);
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
                  spacing={1.25}
                  sx={{ alignItems: 'flex-start', mb: 1.5 }}
                >
                  <Avatar sx={{ ...gildedAvatar }} title={name}>
                    {name[0]}
                  </Avatar>
                  <Box
                    sx={{
                      ...plaqueBand,
                      flex: 1,
                      minWidth: 0,
                      ...(isCurrent ? { boxShadow: `0 0 0 2px rgba(255, 152, 0, 0.55), ${plaqueBand.boxShadow}` } : {}),
                    }}
                  >
                    <Box aria-hidden sx={{ ...plaqueTail }} />
                    <Box
                      sx={{
                        ...plaqueFace(
                          isCurrent ? currentMatchFace : isMatch ? matchFace : defaultFace,
                          isUnread ? unreadStripe : undefined,
                        ),
                      }}
                    >
                      <Stack direction='row' spacing={1} sx={{ alignItems: 'baseline' }}>
                        <Typography component='span' sx={{ ...authorType }}>
                          {name}
                        </Typography>
                        <Typography component='span' sx={{ ...timestampType }}>
                          {time}
                          {dateStr && (
                            <>
                              {' '}
                              <span style={{ color: gild.bronzeSoft, opacity: 0.8 }}>({dateStr})</span>
                            </>
                          )}
                        </Typography>
                      </Stack>
                      <Box aria-hidden sx={{ ...engravedRule }} />
                      <Typography align='left' sx={{ ...bodyType }}>
                        {msg.text}
                      </Typography>
                    </Box>
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
                style={goldLink}
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
              <a href='#' style={{ ...goldLink, fontSize: 14, fontWeight: 500 }} onClick={handleJumpToFirstUnread}>
                Jump to first unread
              </a>
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ color: gild.bronzeSoft, textAlign: 'center', mt: 5 }}>No chat messages yet.</Box>
      )}
    </Paper>
  );
}
