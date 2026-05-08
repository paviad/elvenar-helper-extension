import React, { useEffect, useState, useMemo } from 'react';
import { Box, List, ListItem, ListItemText, Typography, Chip, Divider, CircularProgress, Tooltip } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'; // Represents enchantment
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { getEeMissingBuildings, EeMissingBuilding } from '../util/getEeMissingBuildings';
import { getAccountId, getOverlayStore } from './overlayStore';
import { loadSingleAccountFromStorage } from '../elvenar/AccountManager';

export const EeView = () => {
  const overlayStore = getOverlayStore();
  const eeUpdate = overlayStore((state) => state.eeUpdate);

  const [buildings, setBuildings] = useState<EeMissingBuilding[] | null>(null);

  useEffect(() => {
    async function Do() {
      const accountId = getAccountId();

      if (!accountId) {
        return;
      }

      await loadSingleAccountFromStorage(accountId, true);
      const missingEe = await getEeMissingBuildings(accountId);

      setBuildings(missingEe);
    }

    void Do();
  }, [eeUpdate]);

  // Sort alphabetically by name
  const sortedBuildings = useMemo(() => {
    if (!buildings) return [];
    return [...buildings].sort((a, b) => a.name.localeCompare(b.name));
  }, [buildings]);

  if (buildings === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (buildings.length === 0) {
    return (
      <Box
        display='flex'
        flexDirection='column'
        alignItems='center'
        justifyContent='center'
        height='200px'
        color='text.secondary'
        gap={1}
      >
        <SentimentSatisfiedAltIcon fontSize='large' color='success' />
        <Typography variant='body1'>All optimal buildings are enchanted!</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant='subtitle2' fontWeight='bold' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoFixHighIcon fontSize='small' color='primary' />
          {buildings.length} building{buildings.length === 1 ? '' : 's'} missing Ensorcelled Endowment
        </Typography>
      </Box>

      <List disablePadding sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {sortedBuildings.map((b, index) => (
          <React.Fragment key={b.id}>
            <ListItem
              alignItems='center'
              secondaryAction={
                <Tooltip title='Grid Coordinates'>
                  <Chip
                    label={`X: ${b.x}, Y: ${b.y}`}
                    size='small'
                    variant='outlined'
                    color='primary'
                    sx={{ fontWeight: 'bold' }}
                  />
                </Tooltip>
              }
            >
              <ListItemText
                primary={
                  <Typography variant='subtitle2' fontWeight='500' color='text.primary'>
                    {b.name}
                  </Typography>
                }
                secondary={
                  <Typography variant='caption' color='text.secondary'>
                    Size: {b.length}x{b.height}
                  </Typography>
                }
                sx={{ pr: 10 }} // Ensure text doesn't overlap the coordinate chip
              />
            </ListItem>
            {index < sortedBuildings.length - 1 && <Divider component='li' />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};
