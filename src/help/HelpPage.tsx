import React, { useState } from 'react';
import { Box, List, ListItemButton, ListItemText, Typography, Divider, Drawer, Chip } from '@mui/material';
import { HELP_SECTIONS } from './helpData';
import { HelpTopic } from './HelpTopic';

const DRAWER_WIDTH = 280;

export const HelpPage = () => {
  const [selectedId, setSelectedId] = useState(HELP_SECTIONS[0].id);

  const activeSection = HELP_SECTIONS.find((s) => s.id === selectedId) || HELP_SECTIONS[0];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant='h6' fontWeight='bold' color='primary.main'>
          Help Center
        </Typography>
      </Box>
      <Divider />
      <List component='nav' sx={{ flexGrow: 1, pt: 0 }}>
        {HELP_SECTIONS.map((section) => (
          <ListItemButton
            key={section.id}
            selected={selectedId === section.id}
            onClick={() => setSelectedId(section.id)}
            sx={{
              '&.Mui-selected': {
                bgcolor: 'primary.lighter',
                borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
                '&:hover': { bgcolor: 'primary.lighter' },
              },
              borderLeft: '4px solid transparent',
              py: 1.5,
            }}
          >
            <ListItemText
              primary={section.title}
              slotProps={{
                primary: {
                  fontWeight: selectedId === section.id ? 600 : 400,
                  color: selectedId === section.id ? 'primary.main' : 'text.primary',
                },
              }}
            />
            {section.isNew && (
              <Chip
                label='NEW'
                size='small'
                color='secondary'
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  ml: 1,
                }}
              />
            )}
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar - Always Visible */}
      <Box component='nav' sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}>
        <Drawer
          variant='permanent'
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              position: 'relative', // Keeps it inside the flex container
              height: '100%',
              borderRight: '1px solid rgba(0, 0, 0, 0.12)',
              zIndex: 1,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component='main'
        sx={{
          flexGrow: 1,
          height: '100%',
          overflow: 'hidden',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <HelpTopic content={activeSection.content} />
      </Box>
    </Box>
  );
};
