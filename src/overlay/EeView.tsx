import React, { useEffect, useMemo, useState } from 'react';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'; // Represents enchantment
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { relayToGame } from '../inject/relayToGame';
import { formatTimeLeft } from '../util/formatTimeLeft';
import { EeMissingBuilding, getEeMissingBuildings } from '../util/getEeMissingBuildings';
import { getAccountId, getOverlayStore } from './overlayStore';

export const EeView = () => {
  const overlayStore = getOverlayStore();
  const eeUpdate = overlayStore((state) => state.eeUpdate);

  const [buildings, setBuildings] = useState<EeMissingBuilding[] | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Refresh the component every minute to update the "time left" counters automatically
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  // Sort by help received first (descending time left), then alphabetically by name
  const sortedBuildings = useMemo(() => {
    if (!buildings) return [];
    return [...buildings].sort((a, b) => {
      const aEndTime = a.helpEndTime;
      const bEndTime = b.helpEndTime;

      const aHasHelp = aEndTime && aEndTime > now ? 1 : 0;
      const bHasHelp = bEndTime && bEndTime > now ? 1 : 0;

      if (aHasHelp !== bHasHelp) {
        return bHasHelp - aHasHelp; // Buildings with active help come first
      }

      // Both have help: sort by descending time left (largest end time first)
      if (aHasHelp && bHasHelp && aEndTime && bEndTime) {
        return bEndTime - aEndTime;
      }

      return a.name.localeCompare(b.name);
    });
  }, [buildings, now]);

  const handleCastClick = (building: EeMissingBuilding) => {
    relayToGame('CAST_EE', [building.id]);
  };

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
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: 'text.secondary',
          gap: 1,
        }}
      >
        <SentimentSatisfiedAltIcon fontSize='large' color='success' />
        <Typography variant='body1'>All optimal buildings are enchanted!</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant='subtitle2' sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title='Grid Coordinates'>
                    <Chip
                      label={`X: ${b.x}, Y: ${b.y}`}
                      size='small'
                      variant='outlined'
                      color='primary'
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Tooltip>
                  <Button
                    variant='contained'
                    size='small'
                    color='secondary'
                    onClick={() => handleCastClick(b)}
                    sx={{ textTransform: 'none', px: 1.5, minWidth: 'auto' }}
                  >
                    Cast
                  </Button>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Typography
                    variant='subtitle2'
                    sx={{
                      color: 'text.primary',
                      fontWeight: 500,
                    }}
                  >
                    {b.name}
                  </Typography>
                }
                secondary={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                    <Typography
                      variant='caption'
                      sx={{
                        color: 'text.secondary',
                      }}
                    >
                      Size: {b.length}x{b.height}
                    </Typography>
                    {b.helpEndTime && b.helpEndTime > now && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <VolunteerActivismIcon sx={{ fontSize: 14, color: 'success.main' }} />
                        <Typography
                          variant='caption'
                          sx={{
                            color: 'success.main',
                            fontWeight: 'medium',
                          }}
                        >
                          Help received: {formatTimeLeft(b.helpEndTime, now)} left
                        </Typography>
                      </Box>
                    )}
                  </Box>
                }
                sx={{ pr: 14 }} // Ensure text doesn't overlap the new secondaryAction width
              />
            </ListItem>
            {index < sortedBuildings.length - 1 && <Divider component='li' />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};
