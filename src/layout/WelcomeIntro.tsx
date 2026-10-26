import React from 'react';
import ForumIcon from '@mui/icons-material/Forum';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import MapIcon from '@mui/icons-material/Map';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { NavLink } from 'react-router';

interface Step {
  icon: React.ReactNode;
  title: string;
  text: React.ReactNode;
  action?: React.ReactNode;
}

const STEPS: Step[] = [
  {
    icon: <SportsEsportsIcon />,
    title: 'Open Elvenar',
    text: 'Log in to your city in this browser. ElvenAssist reads your city as the game loads - there is nothing to set up or paste.',
    action: (
      <Button
        variant='contained'
        href='https://www.elvenar.com'
        target='_blank'
        rel='noopener noreferrer'
        endIcon={<OpenInNewIcon />}
      >
        Open Elvenar
      </Button>
    ),
  },
  {
    icon: <MapIcon />,
    title: 'Come back here',
    text: 'This page fills in by itself once your city has loaded. Later, open it from the ElvenAssist icon in the in-game overlay or in the browser toolbar.',
  },
  {
    icon: <HelpOutlineIcon />,
    title: 'Find your way around',
    text: 'Help walks through the City Planner, the in-game overlay, the Inventory and the Fellowship Adventure tracker.',
    action: (
      <Button variant='outlined' component={NavLink} to='/help' startIcon={<HelpOutlineIcon />}>
        Help
      </Button>
    ),
  },
];

/** What the pages show before the extension has seen any city: what it is, and how to get one in. */
export function WelcomeIntro() {
  const bannerUrl = chrome.runtime.getURL('marquee.jpg');

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 2, py: 4 }}>
      <Box
        component='img'
        src={bannerUrl}
        alt='ElvenAssist - Modern City Planner & Helper'
        sx={{ display: 'block', width: '100%', borderRadius: 3, boxShadow: 6 }}
      />

      <Box sx={{ textAlign: 'center', mt: 5, mb: 4 }}>
        <Typography variant='h4' gutterBottom sx={{ fontWeight: 600 }}>
          Welcome to ElvenAssist
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          No city here yet. ElvenAssist learns your city from the game itself - three steps to get going:
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {STEPS.map((step, i) => (
          <Paper
            key={step.title}
            variant='outlined'
            sx={{ flex: 1, p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}
          >
            <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </Box>
              <Box sx={{ color: 'primary.main', display: 'flex' }}>{step.icon}</Box>
              <Typography variant='h6'>{step.title}</Typography>
            </Stack>
            <Typography variant='body2' color='text.secondary' sx={{ flexGrow: 1 }}>
              {step.text}
            </Typography>
            {step.action && <Box>{step.action}</Box>}
          </Paper>
        ))}
      </Stack>

      <Stack direction='row' spacing={1} sx={{ justifyContent: 'center', alignItems: 'center', mt: 4 }}>
        <ForumIcon fontSize='small' color='action' />
        <Typography variant='body2' color='text.secondary'>
          Questions or ideas? Join us on{' '}
          <a href='https://discord.gg/zYzUUDcMrv' target='_blank' rel='noopener noreferrer'>
            Discord
          </a>
          .
        </Typography>
      </Stack>
    </Box>
  );
}
