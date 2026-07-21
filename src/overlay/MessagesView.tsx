import React, { useEffect, useMemo, useRef, useState } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import HistoryIcon from '@mui/icons-material/History';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Badge,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { GameMessage, MessageFolder, MessageFolderData, MessagePostVO } from '../model/gameMessage';
import { ensureMinWidthAndHeight } from '../overlay';
import { getAccountId, getOverlayStore } from './overlayStore';

function formatSeconds(seconds: number | undefined): string {
  if (!seconds) return '';
  const date = new Date(seconds * 1000);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return `${date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })} ${time}`;
}

// Game posts use bare "\r" (and "\r\r" for blank lines) as line breaks; CSS pre-wrap only
// reliably renders "\n", so normalize carriage returns before displaying.
function normalizeLineBreaks(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

// The searchable/highlightable fields of a thread, in a single canonical order so the flat
// match list (for the counter/navigation) and the rendered <mark>s (for scroll targets) stay
// perfectly aligned: subject, then each post newest-first (author name, then post text).
const subjectText = (m: GameMessage) => m.subject || '(no subject)';
const authorName = (p: MessagePostVO) => p.author?.name || 'Unknown';
const postText = (p: MessagePostVO) => normalizeLineBreaks(p.post);
const postsNewestFirst = (m: GameMessage) => [...(m.posts ?? [])].sort((a, b) => b.created_at - a.created_at);

function lastPost(message: GameMessage) {
  if (!message.posts || message.posts.length === 0) return undefined;
  return [...message.posts].reduce((latest, p) => (p.created_at > latest.created_at ? p : latest), message.posts[0]);
}

function threadSearchText(message: GameMessage): string {
  return [subjectText(message), ...postsNewestFirst(message).flatMap((p) => [authorName(p), postText(p)])]
    .join('\n')
    .toLowerCase();
}

function countOccurrences(text: string, lowerTerm: string): number {
  if (!lowerTerm) return 0;
  const lower = text.toLowerCase();
  let count = 0;
  let i = lower.indexOf(lowerTerm);
  while (i !== -1) {
    count++;
    i = lower.indexOf(lowerTerm, i + lowerTerm.length);
  }
  return count;
}

interface HighlightCtx {
  next: () => number; // next per-thread occurrence index
  current: number; // the occurrence index to render as the "current" match (-1 = none)
  register: (index: number, el: HTMLElement | null) => void;
}

// Split text on the term (case-insensitive) and wrap matches in <mark>, assigning each an
// occurrence index from ctx so the current match can be styled and scrolled to.
function highlightNodes(text: string, lowerTerm: string, ctx: HighlightCtx): React.ReactNode {
  if (!lowerTerm) return text;
  const lower = text.toLowerCase();
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  let key = 0;
  let found = lower.indexOf(lowerTerm);
  while (found !== -1) {
    if (found > pos) nodes.push(text.slice(pos, found));
    const index = ctx.next();
    const isCurrent = index === ctx.current;
    nodes.push(
      <mark
        key={key++}
        ref={(el) => ctx.register(index, el)}
        style={{
          backgroundColor: isCurrent ? '#ff9800' : '#fff176',
          color: 'inherit',
          borderRadius: 2,
          padding: '0 1px',
        }}
      >
        {text.slice(found, found + lowerTerm.length)}
      </mark>,
    );
    pos = found + lowerTerm.length;
    found = lower.indexOf(lowerTerm, pos);
  }
  if (pos < text.length) nodes.push(text.slice(pos));
  return nodes;
}

interface Match {
  threadId: string;
  within: number; // occurrence index within that thread
}

export const MessagesView = () => {
  const overlayStore = getOverlayStore();
  const messagesUpdate = overlayStore((state) => state.messagesUpdate);
  const messagesDetailsReceived = overlayStore((state) => state.messagesDetailsReceived);

  const [folder, setFolder] = useState<MessageFolder>('inbox');
  const [folderData, setFolderData] = useState<Partial<Record<MessageFolder, MessageFolderData>> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [searchActive, setSearchActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [navigated, setNavigated] = useState(false); // true once the user cycles into a match
  const term = searchTerm.trim().toLowerCase();

  useEffect(() => {
    ensureMinWidthAndHeight(400, 600);
  }, []);

  useEffect(() => {
    async function load() {
      const accountId = getAccountId();
      if (!accountId) {
        setFolderData({});
        return;
      }
      await loadSingleAccountFromStorage(accountId, true);
      setFolderData(getAccountById(accountId)?.messagesData ?? {});
    }
    void load();
  }, [messagesUpdate]);

  const current = folderData?.[folder];

  // Message threads sorted newest-first by updated timestamp.
  const threads = useMemo(() => {
    if (!current) return [];
    return Object.entries(current.messages)
      .map(([id, message]) => ({ id, message, updatedAt: current.overview[id] ?? message.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [current]);

  // Threads that contain the term somewhere (subject / author / post text).
  const filteredThreads = useMemo(() => {
    if (!term) return threads;
    return threads.filter((t) => threadSearchText(t.message).includes(term));
  }, [threads, term]);

  // Flat, ordered list of every occurrence across the filtered threads. Built in the same
  // field order as highlightNodes renders them, so match N maps to the Nth rendered <mark>.
  const matches = useMemo<Match[]>(() => {
    if (!term) return [];
    const result: Match[] = [];
    for (const { id, message } of filteredThreads) {
      let within = 0;
      const add = (text: string) => {
        const n = countOccurrences(text, term);
        for (let k = 0; k < n; k++) result.push({ threadId: id, within: within++ });
      };
      add(subjectText(message));
      for (const p of postsNewestFirst(message)) {
        add(authorName(p));
        add(postText(p));
      }
    }
    return result;
  }, [filteredThreads, term]);

  // Reset match cursor whenever the query or folder changes.
  useEffect(() => {
    setCurrentMatchIndex(0);
    setNavigated(false);
  }, [term, folder]);

  const gotoMatch = (rawIndex: number) => {
    if (matches.length === 0) return;
    const index = ((rawIndex % matches.length) + matches.length) % matches.length;
    setNavigated(true);
    setCurrentMatchIndex(index);
    setSelectedId(matches[index].threadId); // open the thread the match lives in
  };
  const nextMatch = () => gotoMatch(navigated ? currentMatchIndex + 1 : 0);
  const prevMatch = () => gotoMatch(navigated ? currentMatchIndex - 1 : matches.length - 1);

  const unreadCount = useMemo(() => threads.filter((t) => t.message.status === 'new').length, [threads]);

  // The overview may list ids we haven't fetched details for yet.
  const overviewOnlyCount = current ? Object.keys(current.overview).length - Object.keys(current.messages).length : 0;

  const handleFolderChange = (_: React.MouseEvent<HTMLElement>, next: MessageFolder | null) => {
    if (next) {
      setFolder(next);
      setSelectedId(null);
    }
  };

  const selectedMessage = selectedId ? current?.messages[selectedId] : undefined;

  // Which occurrence in the open thread is the "current" match (for styling + scroll). Only
  // when we've actually navigated and the current match belongs to the open thread.
  const currentMatch = navigated && currentMatchIndex < matches.length ? matches[currentMatchIndex] : undefined;
  const currentWithin = currentMatch && currentMatch.threadId === selectedId ? currentMatch.within : -1;

  // Stored messages persist across sessions, but the game only re-sends them when the user
  // opens the in-game Messages window. Until a detail response arrives this session, flag the
  // view as a saved snapshot that may be out of date.
  const hasAnyStored =
    !!folderData &&
    Object.values(folderData).some(
      (f) => f && (Object.keys(f.overview).length > 0 || Object.keys(f.messages).length > 0),
    );
  const stale = !messagesDetailsReceived && hasAnyStored;

  const counterLabel =
    matches.length === 0
      ? term
        ? 'No matches'
        : ''
      : navigated
        ? `${currentMatchIndex + 1} / ${matches.length}`
        : `${matches.length} match${matches.length === 1 ? '' : 'es'}`;

  if (folderData === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Folder switch + search toggle */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <ToggleButtonGroup
          value={folder}
          exclusive
          size='small'
          onChange={handleFolderChange}
          aria-label='Message folder'
          sx={{ flex: 1 }}
        >
          <ToggleButton value='inbox' aria-label='Inbox'>
            <Badge color='primary' badgeContent={folder === 'inbox' ? unreadCount : 0} sx={{ mr: unreadCount ? 1.5 : 0 }}>
              <MailOutlineIcon fontSize='small' sx={{ mr: 0.75 }} />
            </Badge>
            Inbox
          </ToggleButton>
          <ToggleButton value='outbox' aria-label='Outbox'>
            <ForumOutlinedIcon fontSize='small' sx={{ mr: 0.75 }} />
            Outbox
          </ToggleButton>
        </ToggleButtonGroup>
        <IconButton
          size='small'
          aria-label='Search messages'
          color={searchActive ? 'primary' : 'default'}
          onClick={() => setSearchActive((a) => !a)}
        >
          <SearchIcon fontSize='small' />
        </IconButton>
      </Box>

      {searchActive && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.75,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <TextField
            autoFocus
            size='small'
            fullWidth
            placeholder='Search messages…'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) prevMatch();
                else nextMatch();
              }
              e.stopPropagation();
            }}
            onKeyUp={(e) => e.stopPropagation()}
          />
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', whiteSpace: 'nowrap', minWidth: 56, textAlign: 'center' }}
          >
            {counterLabel}
          </Typography>
          <IconButton size='small' aria-label='Previous match' disabled={matches.length === 0} onClick={prevMatch}>
            <KeyboardArrowUpIcon fontSize='small' />
          </IconButton>
          <IconButton size='small' aria-label='Next match' disabled={matches.length === 0} onClick={nextMatch}>
            <KeyboardArrowDownIcon fontSize='small' />
          </IconButton>
          <IconButton
            size='small'
            aria-label='Close search'
            onClick={() => {
              setSearchActive(false);
              setSearchTerm('');
            }}
          >
            <CloseIcon fontSize='small' />
          </IconButton>
        </Box>
      )}

      {stale && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.75,
            bgcolor: '#fff8e1',
            color: '#8a6d00',
            borderBottom: '1px solid',
            borderColor: '#f0e0a0',
          }}
        >
          <HistoryIcon fontSize='small' />
          <Typography variant='caption' sx={{ lineHeight: 1.3 }}>
            Saved view — may be out of date. Open Messages in the game to refresh.
          </Typography>
        </Box>
      )}

      {selectedMessage ? (
        <MessageDetail
          message={selectedMessage}
          onBack={() => setSelectedId(null)}
          term={term}
          currentWithin={currentWithin}
        />
      ) : threads.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            color: 'text.secondary',
            gap: 1,
            p: 4,
            textAlign: 'center',
          }}
        >
          <MailOutlineIcon fontSize='large' />
          <Typography variant='body2'>
            No messages captured yet. Open the Messages window in the game to load your {folder}.
          </Typography>
        </Box>
      ) : term && filteredThreads.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            color: 'text.secondary',
            gap: 1,
            p: 4,
            textAlign: 'center',
          }}
        >
          <SearchIcon fontSize='large' />
          <Typography variant='body2'>No messages match “{searchTerm.trim()}”.</Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
          {filteredThreads.map(({ id, message }, index) => {
            const preview = lastPost(message);
            const unread = message.status === 'new';
            return (
              <React.Fragment key={id}>
                <ListItemButton
                  alignItems='flex-start'
                  onClick={() => {
                    setSelectedId(id);
                    setNavigated(false); // manual browse: don't point the match cursor here
                  }}
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary={
                      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                        {unread && (
                          <Box
                            sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }}
                          />
                        )}
                        <Typography
                          variant='subtitle2'
                          sx={{ fontWeight: unread ? 700 : 500, flex: 1, minWidth: 0 }}
                          noWrap
                        >
                          {message.subject || '(no subject)'}
                        </Typography>
                        <Typography variant='caption' sx={{ color: 'text.secondary', flexShrink: 0 }}>
                          {formatSeconds(message.updatedAt)}
                        </Typography>
                      </Stack>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                          {message.guild?.name || message.initiator?.name}
                          {message.posts?.length ? ` · ${message.posts.length} post${message.posts.length === 1 ? '' : 's'}` : ''}
                        </Typography>
                        {preview && (
                          <Typography
                            variant='body2'
                            sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            <b>{preview.author?.name}:</b> {preview.post}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
                {index < filteredThreads.length - 1 && <Divider component='li' />}
              </React.Fragment>
            );
          })}
          {!term && overviewOnlyCount > 0 && (
            <Box sx={{ textAlign: 'center', p: 1.5, color: 'text.disabled' }}>
              <Typography variant='caption'>
                {overviewOnlyCount} more message{overviewOnlyCount === 1 ? '' : 's'} — scroll the in-game window to load
              </Typography>
            </Box>
          )}
        </List>
      )}
    </Box>
  );
};

interface MessageDetailProps {
  message: GameMessage;
  onBack: () => void;
  term?: string; // lowercased search term to highlight ('' = none)
  currentWithin?: number; // occurrence index of the current match within this thread (-1 = none)
}

const MessageDetail = ({ message, onBack, term = '', currentWithin = -1 }: MessageDetailProps) => {
  const posts = useMemo(() => postsNewestFirst(message), [message]);

  const [recipientsOpen, setRecipientsOpen] = useState(false);

  // Collapse recipients again whenever a different message is opened.
  useEffect(() => {
    setRecipientsOpen(false);
  }, [message.id]);

  // Refs to each rendered <mark>, keyed by per-thread occurrence index, so we can scroll to
  // the current match. Reset on every render; refs are re-registered during commit below.
  const markRefs = useRef<Record<number, HTMLElement | null>>({});
  markRefs.current = {};
  let markCounter = 0;
  const ctx: HighlightCtx = {
    next: () => markCounter++,
    current: currentWithin,
    register: (index, el) => {
      markRefs.current[index] = el;
    },
  };
  const hl = (text: string): React.ReactNode => (term ? highlightNodes(text, term, ctx) : text);

  useEffect(() => {
    if (currentWithin < 0) return;
    const el = markRefs.current[currentWithin];
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [currentWithin, message.id, term]);

  const recipientCount = message.recipients?.length ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box
        role='button'
        onClick={onBack}
        aria-label='Back to list'
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <IconButton size='small' aria-label='Back to list' tabIndex={-1}>
          <ArrowBackIcon fontSize='small' />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='subtitle2' sx={{ fontWeight: 700 }} noWrap>
            {hl(subjectText(message))}
          </Typography>
          {message.guild?.name && (
            <Typography variant='caption' sx={{ color: 'text.secondary' }} noWrap>
              {message.guild.name}
            </Typography>
          )}
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0, p: 1.5, bgcolor: '#f9f9fb', display: 'flex', flexDirection: 'column', gap: 1.2 }}
      >
        {posts.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}>
            This message has no posts.
          </Typography>
        ) : (
          posts.map((post) => {
            const name = authorName(post);
            return (
              <Stack key={post.post_id} direction='row' spacing={1} sx={{ alignItems: 'flex-start' }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#e0e0e0', color: '#888', fontWeight: 600, fontSize: 16 }} title={name}>
                  {name[0]}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction='row' spacing={1} sx={{ alignItems: 'baseline' }}>
                    <Typography component='span' sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {hl(name)}
                    </Typography>
                    <Typography component='span' sx={{ color: 'text.secondary', fontSize: 12 }}>
                      {formatSeconds(post.created_at)}
                    </Typography>
                  </Stack>
                  <Typography
                    align='left'
                    sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'left' }}
                  >
                    {hl(postText(post))}
                  </Typography>
                </Box>
              </Stack>
            );
          })
        )}
      </Paper>

      {recipientCount > 0 && (
        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          <Box
            role='button'
            onClick={() => setRecipientsOpen((o) => !o)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 1,
              cursor: 'pointer',
              userSelect: 'none',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ExpandMoreIcon
              fontSize='small'
              sx={{ transform: recipientsOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
            />
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {recipientCount} recipient{recipientCount === 1 ? '' : 's'}
            </Typography>
          </Box>
          <Collapse in={recipientsOpen} unmountOnExit>
            <Box sx={{ px: 1.5, pb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {message.recipients?.map((r) => (
                <Chip key={r} label={r} size='small' variant='outlined' />
              ))}
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );
};
