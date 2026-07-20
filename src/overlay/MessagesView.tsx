import React, { useEffect, useMemo, useState } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import HistoryIcon from '@mui/icons-material/History';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { GameMessage, MessageFolder, MessageFolderData } from '../model/gameMessage';
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

function lastPost(message: GameMessage) {
  if (!message.posts || message.posts.length === 0) return undefined;
  return [...message.posts].reduce((latest, p) => (p.created_at > latest.created_at ? p : latest), message.posts[0]);
}

export const MessagesView = () => {
  const overlayStore = getOverlayStore();
  const messagesUpdate = overlayStore((state) => state.messagesUpdate);
  const messagesDetailsReceived = overlayStore((state) => state.messagesDetailsReceived);

  const [folder, setFolder] = useState<MessageFolder>('inbox');
  const [folderData, setFolderData] = useState<Partial<Record<MessageFolder, MessageFolderData>> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const unreadCount = useMemo(
    () => threads.filter((t) => t.message.status === 'new').length,
    [threads],
  );

  // The overview may list ids we haven't fetched details for yet.
  const overviewOnlyCount = current ? Object.keys(current.overview).length - Object.keys(current.messages).length : 0;

  const handleFolderChange = (_: React.MouseEvent<HTMLElement>, next: MessageFolder | null) => {
    if (next) {
      setFolder(next);
      setSelectedId(null);
    }
  };

  const selectedMessage = selectedId ? current?.messages[selectedId] : undefined;

  // Stored messages persist across sessions, but the game only re-sends them when the user
  // opens the in-game Messages window. Until a detail response arrives this session, flag the
  // view as a saved snapshot that may be out of date.
  const hasAnyStored =
    !!folderData &&
    Object.values(folderData).some(
      (f) => f && (Object.keys(f.overview).length > 0 || Object.keys(f.messages).length > 0),
    );
  const stale = !messagesDetailsReceived && hasAnyStored;

  if (folderData === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Folder switch */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
        <ToggleButtonGroup
          value={folder}
          exclusive
          size='small'
          onChange={handleFolderChange}
          aria-label='Message folder'
          fullWidth
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
      </Box>

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
        <MessageDetail message={selectedMessage} onBack={() => setSelectedId(null)} />
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
      ) : (
        <List disablePadding sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
          {threads.map(({ id, message }, index) => {
            const preview = lastPost(message);
            const unread = message.status === 'new';
            return (
              <React.Fragment key={id}>
                <ListItemButton alignItems='flex-start' onClick={() => setSelectedId(id)} sx={{ py: 1 }}>
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
                {index < threads.length - 1 && <Divider component='li' />}
              </React.Fragment>
            );
          })}
          {overviewOnlyCount > 0 && (
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
}

const MessageDetail = ({ message, onBack }: MessageDetailProps) => {
  // Posts newest-first, most recent at the top.
  const posts = useMemo(() => [...(message.posts ?? [])].sort((a, b) => b.created_at - a.created_at), [message]);

  const [recipientsOpen, setRecipientsOpen] = useState(false);

  // Collapse recipients again whenever a different message is opened.
  useEffect(() => {
    setRecipientsOpen(false);
  }, [message.id]);

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
            {message.subject || '(no subject)'}
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
            const name = post.author?.name || 'Unknown';
            return (
              <Stack key={post.post_id} direction='row' spacing={1} sx={{ alignItems: 'flex-start' }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#e0e0e0', color: '#888', fontWeight: 600, fontSize: 16 }} title={name}>
                  {name[0]}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction='row' spacing={1} sx={{ alignItems: 'baseline' }}>
                    <Typography component='span' sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {name}
                    </Typography>
                    <Typography component='span' sx={{ color: 'text.secondary', fontSize: 12 }}>
                      {formatSeconds(post.created_at)}
                    </Typography>
                  </Stack>
                  <Typography
                    align='left'
                    sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'left' }}
                  >
                    {normalizeLineBreaks(post.post)}
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
