import React from 'react';
import { Typography, Box, Divider, List, ListItem, ListItemText, Alert, Link, Paper } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SyncIcon from '@mui/icons-material/Sync';
import HandshakeIcon from '@mui/icons-material/Handshake';
import SecurityIcon from '@mui/icons-material/Security';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

export const SpireWizardIntegration = () => {
  const splitViewSrc =
    typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
      ? chrome.runtime.getURL('splitview.jpg')
      : 'splitview.jpg';

  return (
    <Box>
      <Typography variant='h4' gutterBottom>
        Spire Wizard Integration
      </Typography>
      <Typography component="p" variant="body1" gutterBottom>
        ElvenAssist integrates seamlessly with the{' '}
        <Link href='https://javascriptorian.com/spire-wizard-mobile' target='_blank' rel='noopener'>
          Spire Wizard
        </Link>
        , a popular external tool for solving Spire of Eternity negotiations.
      </Typography>
      <Typography component="p" variant="body1" gutterBottom>
        The extension is active on the Spire Wizard website as well as the game, allowing it to bridge data between the
        two in real-time.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <PlayCircleOutlineIcon color='primary' />
        <Link href='https://youtu.be/hKTn6fkTWMs' target='_blank' rel='noopener' sx={{ fontWeight: 'bold' }}>
          Watch Video Demonstration
        </Link>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Setup */}
      <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoFixHighIcon color='primary' fontSize='small' /> Automated Setup
      </Typography>
      <Typography component="p" variant="body1" gutterBottom>
        When you initiate a negotiation encounter in the Spire (diplomacy option), ElvenAssist detects the available
        resources and context. It automatically updates the Spire Wizard tab, selecting the correct set of resources for
        the current encounter so you don't have to manually input them.
      </Typography>

      <Box mt={2} />

      {/* Syncing */}
      <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SyncIcon color='primary' fontSize='small' /> Live Status Sync
      </Typography>
      <Typography component="p" variant="body1" gutterBottom>
        As you play the negotiation minigame, the extension tracks your results:
      </Typography>
      <List dense disablePadding>
        <ListItem>
          <ListItemText
            primary='Automatic Feedback'
            secondary='When you submit a negotiation round, the extension reads the status of every slot (Red: Wrong person, Orange: Wrong slot, Green: Correct) and automatically feeds this data into the Spire Wizard.'
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary='Instant Solver Updates'
            secondary='The Spire Wizard immediately calculates the best possible next move based on this live data, streamlining the negotiation process.'
          />
        </ListItem>
      </List>

      <Box mt={2} />

      {/* Recommended Setup */}
      <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ViewSidebarIcon color='primary' fontSize='small' /> Recommended Setup: Split View
      </Typography>
      <Typography component="p" variant="body1" gutterBottom>
        For the most efficient workflow, we recommend arranging your browser tabs side-by-side using Chrome's split view
        capabilities (or separate windows). This allows you to see the game and the wizard simultaneously.
      </Typography>

      <Paper
        variant='outlined'
        sx={{
          p: 2,
          my: 2,
          bgcolor: 'background.default',
          borderStyle: 'dashed',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box
          component='img'
          src={splitViewSrc}
          alt='Split View Setup'
          sx={{
            maxWidth: '100%',
            height: 'auto',
            maxHeight: 300,
            borderRadius: 1,
            bgcolor: '#eee',
            minHeight: 150,
          }}
        />
        <Typography variant='caption' color='text.secondary' sx={{ mt: 1 }}>
          Game on the left, Spire Wizard on the right
        </Typography>
      </Paper>

      <Box mt={3} />

      {/* Safety Alert */}
      <Alert severity='info' icon={<SecurityIcon fontSize='inherit' />}>
        <strong>Fair Play & Safety:</strong> The extension <em>never</em> performs automatic clicks inside the Elvenar
        game itself. It only automates the input on the external Spire Wizard website. You remain in full control of the
        game actions.
      </Alert>

      <Box mt={2} />

      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ display: 'flex', alignItems: 'center', gap: 1, fontStyle: 'italic' }}
      >
        <HandshakeIcon fontSize='small' />
        This integration was developed in complete cooperation and agreement with the developer of Spire Wizard.
      </Typography>
    </Box>
  );
};
