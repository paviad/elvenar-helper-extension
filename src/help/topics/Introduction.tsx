import React from 'react';
import { Typography, Box } from '@mui/material';

export const Introduction = () => (
  <Box>
    <Typography variant='h4' gutterBottom>
      Welcome to ElvenAssist
    </Typography>
    <Typography paragraph>
      ElvenAssist is your companion for optimizing and planning your city in Elvenar. This guide will help you
      understand the core features and how to get the most out of the extension.
    </Typography>
    <Typography paragraph>Use the menu on the left to navigate through different topics.</Typography>
  </Box>
);
