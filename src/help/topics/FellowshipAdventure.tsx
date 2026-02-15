import React from 'react';
import { Typography, Box, Divider, List, ListItem, ListItemText } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export const FellowshipAdventure = () => (
  <Box>
    <Typography variant="h4" gutterBottom>Fellowship Adventure Tracker</Typography>
    <Typography paragraph>
      During a Fellowship Adventure, this tab becomes your command center. It helps you track your progress and plan your collections efficiently.
    </Typography>

    <Divider sx={{ my: 2 }} />

    {/* Production Timeline */}
    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TimelineIcon color="primary" fontSize="small" /> Production Timeline
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText 
          primary="Future Badge Completion" 
          secondary="The timeline visualizes your current city production queues. It shows exactly which badges (and how many) will be finished at specific times in the future based on your workshops and manufactories." 
        />
      </ListItem>
      <ListItem>
        <ListItemText 
          primary="Planning Collections" 
          secondary="Use the timeline to coordinate your login times and collections to maximize badge output." 
        />
      </ListItem>
    </List>

    <Box mt={2} />

    {/* Badge Status */}
    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <CheckCircleIcon color="primary" fontSize="small" /> Badge Tracking
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText 
          primary="Ready to Collect" 
          secondary="Badges that are fully produced and ready for collection are highlighted with a strong visual indication, so you never miss a finished production." 
        />
      </ListItem>
      <ListItem>
        <ListItemText 
          primary="Live Progress" 
          secondary="Track the exact progress of every badge type in real-time as your city produces resources." 
        />
      </ListItem>
    </List>
  </Box>
);