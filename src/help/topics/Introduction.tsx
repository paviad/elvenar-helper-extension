import React from 'react';
import { Typography, Box, Paper, Button, SvgIcon, Chip } from '@mui/material';

export const Introduction = () => (
  <Box>
    <Typography variant='h4' gutterBottom>
      Welcome to ElvenAssist
    </Typography>
    <Typography component='p' variant='body1' gutterBottom>
      ElvenAssist is your companion for optimizing and planning your city in Elvenar. This guide will help you
      understand the core features and how to get the most out of the extension.
    </Typography>
    <Typography component='p' variant='body1'>
      Use the menu on the left to navigate through different topics.
    </Typography>

    {/* Discord Community Callout */}
    <Paper
      elevation={0}
      sx={{
        mt: 5,
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'rgba(88, 101, 242, 0.05)', // Discord Blurple light background
        border: '1px solid rgba(88, 101, 242, 0.3)',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Typography variant='h5' sx={{ color: '#5865F2', fontWeight: 'bold' }}>
          Join our Community!
        </Typography>
        <Chip label='NEW' size='small' color='secondary' sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
      </Box>
      <Typography variant='body1' sx={{ textAlign: 'center', mb: 3, color: 'text.secondary', maxWidth: 500 }}>
        Have questions, feature requests, or just want to share your city layouts? Join the ElvenAssist Discord server
        to chat with the developer and other players.
      </Typography>
      <Button
        variant='contained'
        href='https://discord.gg/zYzUUDcMrv'
        target='_blank'
        rel='noopener noreferrer'
        size='large'
        sx={{
          bgcolor: '#5865F2',
          color: 'white',
          textTransform: 'none',
          fontWeight: 600,
          px: 4,
          py: 1,
          borderRadius: 2,
          '&:hover': { bgcolor: '#4752C4' },
        }}
        startIcon={
          <SvgIcon viewBox='0 0 127.14 96.36' sx={{ mr: 0.5 }}>
            <path
              fill='currentColor'
              d='M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.16,46,96.06,53,91,65.69,84.69,65.69Z'
            />
          </SvgIcon>
        }
      >
        Join Discord
      </Button>
    </Paper>
  </Box>
);
