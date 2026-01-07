import React from 'react';
import { useOverlayStore } from './overlayStore';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { ensureMinWidthAndHeight } from '..';
import { ChatMessage } from '../model/socketMessages/chatPayload';

// Extend the Window interface to include forceChatRerender
declare global {
  interface Window {
    forceChatRerender?: () => void;
  }
}

export function ChatView() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chatMessages = useOverlayStore((state) => state.chatMessages);
  const userMap = useOverlayStore((state) => state.userMap);
  const forceUpdate = useOverlayStore((state) => state.forceUpdate);
  const [sortedMessages, setSortedMessages] = React.useState<ChatMessage[]>([]);

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

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [sortedMessages, forceUpdate]);

  React.useEffect(() => {
    if (sortedMessages.length > 0) {
      ensureMinWidthAndHeight(400, 600);
    }
  }, [sortedMessages]);

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
      {sortedMessages && sortedMessages.length > 0 ? (
        sortedMessages.map((msg) => {
          const { name } = getUserInfo(msg.user);
          // Parse timestamp as number (milliseconds)
          const tsNum = typeof msg.timestamp === 'string' ? parseInt(msg.timestamp, 10) : msg.timestamp;
          const date = new Date(tsNum);
          const now = new Date();
          const isToday =
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate();
          const time = isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = isToday
            ? ''
            : date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
          return (
            <Stack key={msg.uuid} direction='row' alignItems='flex-start' spacing={1} mb={1.2}>
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
        })
      ) : (
        <Box sx={{ color: '#888', textAlign: 'center', mt: 5 }}>No chat messages yet.</Box>
      )}
    </Paper>
  );
}
