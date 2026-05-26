import React from 'react';
import { Typography, Box, Divider, List, ListItem, ListItemText, Badge } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import KeyboardIcon from '@mui/icons-material/Keyboard';

export const CityPlanner = () => (
  <Box>
    <Typography variant='h4' gutterBottom>
      City Planner Guide
    </Typography>
    <Typography component='p' variant='body1' gutterBottom>
      The City Planner is the core of ElvenAssist, allowing you to manipulate your city layout with live data. Below is
      a detailed guide to its capabilities.
    </Typography>

    <Divider sx={{ my: 2 }} />

    {/* Navigation & Views */}
    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <VisibilityIcon color='primary' fontSize='small' /> Navigation & Views
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='View Modes'
          secondary='Switch between Top-Down 2D, Isometric 2.5D, and Table View using the toolbar buttons. The Table View provides detailed stats on production and provisions per building.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Pan & Zoom'
          secondary='Click and drag anywhere on the grid to pan the view. Use the mouse wheel to zoom in and out.'
        />
      </ListItem>
    </List>

    <Box
      sx={{
        mt: 2,
      }}
    />

    {/* Building Management */}
    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <BuildIcon color='primary' fontSize='small' /> Managing Buildings
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Build Menu'
          secondary="Click the 'Build' button or press Alt+B to open the building catalog. It contains every building in the game, allowing you to plan for future chapters."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Smart Indicators'
          secondary={
            <React.Fragment>
              <Box
                component='span'
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 0.5,
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                <span>Green Check: Building is at max level for your current chapter.</span>
              </Box>
              <Box
                component='span'
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 0.5,
                }}
              >
                <BlockIcon sx={{ fontSize: 16, color: '#d32f2f' }} />
                <span>No Entry Sign: Building level exceeds your current chapter limit.</span>
              </Box>
            </React.Fragment>
          }
        />
      </ListItem>
    </List>

    <Box
      sx={{
        mt: 2,
      }}
    />

    {/* Advanced Tools */}
    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <SearchIcon color='primary' fontSize='small' /> Advanced Tools
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Search & Bulk Actions'
          secondary="Enter text to find buildings. Supports Regular Expressions (e.g. /mana|seeds/). Matching buildings are highlighted in red. You can then 'Delete Highlighted' or 'Delete Non-Highlighted' to clear space quickly."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Working State'
          secondary='The panel on the right displays the current grid coordinates and the count of highlighted buildings matching your search.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Undo / Redo'
          secondary='Mistakes happen! You can undo or redo moves, level changes, and deletions via the Move Log panel.'
        />
      </ListItem>
    </List>

    <Box
      sx={{
        mt: 2,
      }}
    />

    {/* Hotkeys */}
    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <KeyboardIcon color='primary' fontSize='small' /> Hotkeys (While Dragging)
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText primary='Plus (+)' secondary='Increase the level or chapter of the building you are holding.' />
      </ListItem>
      <ListItem>
        <ListItemText primary='Minus (-)' secondary='Decrease the level or chapter of the building you are holding.' />
      </ListItem>
      <ListItem>
        <Badge
          badgeContent='NEW'
          color='secondary'
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.6rem',
              height: 16,
              minWidth: 16,
              px: 0.5,
              ml: -2,
            },
          }}
        >
          <ListItemText primary='Shift + Plus (+)' secondary='Increase the stage of an evolving building.' />
        </Badge>
      </ListItem>
      <ListItem>
        <Badge
          badgeContent='NEW'
          color='secondary'
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.6rem',
              height: 16,
              minWidth: 16,
              px: 0.5,
              ml: -2,
            },
          }}
        >
          <ListItemText primary='Shift + Minus (-)' secondary='Decrease the stage of an evolving building.' />
        </Badge>
      </ListItem>
      <ListItem>
        <ListItemText primary='Delete (DEL)' secondary='Delete the building you are currently holding.' />
      </ListItem>
    </List>

    <Box
      sx={{
        mt: 2,
      }}
    />

    {/* Data & Saving */}
    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <SaveIcon color='primary' fontSize='small' /> Data & Saving
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Multiple Cities'
          secondary='Use the account selector in the top-right to switch between different cities or save files.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Save As'
          secondary='Save your current layout under a new name to create backups or alternate versions.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Visiting Neighbors'
          secondary="When you visit another player in-game, their city is automatically imported into a temporary slot (e.g., 'Temporary PlayerName')."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Import / Export'
          secondary='Export your layout to a JSON string compatible with ElvenArchitect.com, or import layouts shared by others.'
        />
      </ListItem>
    </List>
  </Box>
);
