import React from 'react';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ChatIcon from '@mui/icons-material/Chat';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Box, Chip, Divider, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';

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

      <ListItem>
        <ListItemIcon sx={{ minWidth: 40 }}>
          <MailOutlineIcon color='action' />
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label='Alt + C' size='small' /> <Typography variant='caption'>then</Typography>{' '}
              <Chip label='M' size='small' />
            </Box>
          }
          secondary='Opens the Messages tab.'
          sx={{ my: 1 }}
        />
      </ListItem>
    </List>

    <Divider sx={{ my: 2 }} />

    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <SwapHorizIcon color='primary' fontSize='small' /> Swaps — knowledge point tally
    </Typography>
    <Typography component='p' variant='body2' gutterBottom>
      Knowledge point swap threads run as a chain: you give KP to whoever posted last, then post the wonder you would
      like next. The <strong>Swaps</strong> button in the Messages tab, next to Inbox and Outbox, keeps track of who you
      owe, so you can work through every thread first and repay afterwards.
    </Typography>
    <Typography component='p' variant='body2' gutterBottom>
      It keys off <strong>your own post</strong>. Post exactly{' '}
      <Chip label='<Ancient Wonder> please' size='small' sx={{ fontFamily: 'monospace' }} /> — the wonder&apos;s full
      in-game name followed by the word &ldquo;please&rdquo;, nothing before or after it — and whoever posted before you
      appears in the list, along with the amount taken from the thread&apos;s title and the wonder they asked for.
    </Typography>
    <Typography component='p' variant='body2' gutterBottom>
      Because the wording has to match exactly, the bank icon in the Swaps header lists the ancient wonders standing in
      your city. Pick one and the request text goes on your clipboard ready to paste, so a typo cannot leave you
      wondering why nothing was tallied.
    </Typography>
    <Typography component='p' variant='body2' gutterBottom>
      Each wonder in that list shows how much knowledge it can still take, so you can pick a thread it has room for.
      Requests you have already posted and are still waiting on come off that figure, since the game counts the wonder
      as needing knowledge that is already on its way to you. Copying a request starts a count for that wonder, shown
      above the debts and reduced by every request you post afterwards — when it reaches <em>full</em>, stop asking for
      that one. The count comes down per request rather than being read afresh, because the knowledge you have asked for
      has not arrived yet; asking twice for the same room leaves the giver&apos;s points to overflow. Dismiss a count
      with the cross on it, or copy the request again to start over from what the game reports.
    </Typography>
    <Typography component='p' variant='body2' gutterBottom>
      Debts are grouped by the player you owe, because you repay a person rather than a thread. Each card totals what
      that player is due and breaks it down per thread, since the amount and the wonder they asked for can differ
      between them.
    </Typography>
    <Typography component='p' variant='body2' gutterBottom>
      The list starts empty and only fills as you post — rounds you did before first opening it are left alone. Tick
      rows off as you donate to keep your place, then press <strong>Clear all</strong> once you have repaid everybody.
      Clearing is manual because the extension cannot see your donations, only your posts.
    </Typography>
    <Typography component='p' variant='body2' gutterBottom sx={{ color: 'text.secondary' }}>
      The amount comes from the number next to &ldquo;KP&rdquo; in the thread title, so <em>60 KP Thread</em>,{' '}
      <em>40 KP AW swap (give to get)</em> and <em>10KP SWAP THREAD - AUGUST</em> all read correctly. If a title has no
      readable amount, or names two of them, the thread is listed separately at the bottom rather than counted, so you
      can still see you owe somebody there.
    </Typography>
    <Typography component='p' variant='body2' sx={{ color: 'text.secondary' }}>
      Swaps reads the threads Inbox and Outbox have captured, so open the in-game Messages window to bring it up to
      date.
    </Typography>
  </Box>
);
