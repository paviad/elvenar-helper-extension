import React from 'react';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import MapIcon from '@mui/icons-material/Map';
import SyncIcon from '@mui/icons-material/Sync';
import { Box, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';

export const WorldMap = () => (
  <Box>
    <Typography variant='h4' gutterBottom>
      World Map Guide
    </Typography>
    <Typography component='p' variant='body1' gutterBottom>
      The World Map page shows every province you have scouted or can scout: how many of each good you have completed,
      which are incomplete, and which the scout can go to next.
    </Typography>

    <Divider sx={{ my: 2 }} />

    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <SyncIcon color='primary' fontSize='small' /> Where the data comes from
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Open the world map in the game'
          secondary='That is all the page needs to draw your provinces. It reads what the game shows you and never asks the game for anything itself.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Incomplete provinces'
          secondary='The game says which provinces are incomplete when you open the Incomplete tab of its Province Overview, or move the map over them. Until then they are shown as completed, and a notice at the top says how many are affected. The helper window in the game says so too: a bell with a count appears in its title bar.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Staying current'
          secondary='Sending the scout, winning an encounter by auto-fight or negotiation, and completing a province all show up as you do them. A fight you play by hand shows up the next time the game lists the province.'
        />
      </ListItem>
    </List>

    <Box sx={{ mt: 2 }} />

    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <FilterAltIcon color='primary' fontSize='small' /> Summary and filters
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Provinces by good'
          secondary='The table at the top counts the provinces of each good in each state: completed, incomplete, being scouted, scoutable, and locked until bordering provinces are completed. Your boosted goods are in bold, and the goods of the current and the next tournament are marked.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Filtering'
          secondary='Click a good, a state or a single count to show only those provinces in the map and the table. Click it again, or Show all, to clear the filter.'
        />
      </ListItem>
    </List>

    <Box sx={{ mt: 2 }} />

    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <MapIcon color='primary' fontSize='small' /> Map and table
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Map'
          secondary="Each province is a hex in its good's colour, laid out as in the game with your city in the middle. Solid hexes are completed, pale ones show the encounters done, white ones are scoutable and grey ones are locked. Hover a hex for its details. Drag to move, scroll to zoom, double-click to fit."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Table'
          secondary='The same provinces as rows, each with its distance and an arrow for the direction from your city, and the scouting cost, time and difficulty of the ones not scouted yet. Click a column header to sort.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Find in game'
          secondary="Right-click a province on the map or a row of the table and choose Find in game. On the game's own world map the province is then outlined, with an arrow at the edge of the screen while it is out of view. Open the world map in the game to see it; if it was open already and nothing shows, leave it and open it again. Opening the province, or clicking the notice under the bell in the helper window, ends it."
        />
      </ListItem>
    </List>
  </Box>
);
