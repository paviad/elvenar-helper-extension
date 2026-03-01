import React from 'react';
import { Box, Paper } from '@mui/material';

interface HelpTopicProps {
  content: React.ReactNode;
}

export const HelpTopic: React.FC<HelpTopicProps> = ({ content }) => {
  return (
    <Paper elevation={0} sx={{ p: 4, height: '100%', overflowY: 'auto', bgcolor: 'transparent' }}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>{content}</Box>
    </Paper>
  );
};
