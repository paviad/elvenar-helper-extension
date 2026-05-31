import React from 'react';
import { Typography, Box, Divider, List, ListItem, ListItemText, ListItemIcon, Chip } from '@mui/material';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import ChatIcon from '@mui/icons-material/Chat';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AssignmentIcon from '@mui/icons-material/Assignment';

export const InGameAssistant = () => (
  <Box>
    <Typography variant='h4' gutterBottom>
      In-Game Assistant
    </Typography>
    <Typography component='p' variant='body1' gutterBottom>
      The In-Game Assistant runs an overlay directly over Elvenar, giving you quick access to tools without having to
      switch tabs. You can control the overlay using two-step keyboard shortcuts.
    </Typography>

    <Divider sx={{ my: 2 }} />

    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <KeyboardIcon color='primary' fontSize='small' /> Hotkey Sequences
    </Typography>
    <Typography component='p' variant='body2' sx={{ mb: 2, color: 'text.secondary' }}>
      To open a specific tab, first press and release <Chip label='Alt + C' size='small' sx={{ fontWeight: 'bold' }} />,
      then press the corresponding letter. If the tab is already open, pressing the sequence again will collapse the
      overlay.
    </Typography>

    <List dense disablePadding>
      <ListItem>
        <ListItemIcon sx={{ minWidth: 40 }}>
          <ChatIcon color='action' />
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label='Alt + C' size='small' /> <Typography variant='caption'>then</Typography>{' '}
              <Chip label='C' size='small' />
            </Box>
          }
          secondary='Opens the Chat tab.'
          sx={{ my: 1 }}
        />
      </ListItem>

      <ListItem>
        <ListItemIcon sx={{ minWidth: 40 }}>
          <AutoFixHighIcon color='action' />
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label='Alt + C' size='small' /> <Typography variant='caption'>then</Typography>{' '}
              <Chip label='E' size='small' />
            </Box>
          }
          secondary='Opens the Ensorcelled Endowment (EE) tab.'
          sx={{ my: 1 }}
        />
      </ListItem>

      <ListItem>
        <ListItemIcon sx={{ minWidth: 40 }}>
          <AssignmentIcon color='action' />
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label='Alt + C' size='small' /> <Typography variant='caption'>then</Typography>{' '}
              <Chip label='Q' size='small' />
            </Box>
          }
          secondary='Opens the Quest Journal tab.'
          sx={{ my: 1 }}
        />
      </ListItem>
    </List>
  </Box>
);
