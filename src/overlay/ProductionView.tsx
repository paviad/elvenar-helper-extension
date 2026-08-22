import React from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  getProductionWatchStatus,
  PRODUCTION_POLL_MS,
  startProductionWatch,
  stopProductionWatch,
  subscribeToProductionWatch,
} from './productionWatcher';

/** Seconds as `1h 04m 12s` - a minute's resolution is no use next to a five second check. */
const formatSeconds = (seconds: number) => {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const rest = clamped % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return hours > 0 ? `${hours}h ${pad(minutes)}m ${pad(rest)}s` : `${minutes}m ${pad(rest)}s`;
};

const formatClock = (at: number) => new Date(at).toLocaleTimeString();

export const ProductionView = () => {
  const [status, setStatus] = React.useState(getProductionWatchStatus);
  const [buildingIdInput, setBuildingIdInput] = React.useState(() => status.buildingId?.toString() ?? '');
  const [optionIdInput, setOptionIdInput] = React.useState(() => status.optionId?.toString() ?? '');
  const [now, setNow] = React.useState(() => Date.now());

  // The watcher outlives this component, so the fields refill and the log is still there after a
  // trip to another tab - and monitoring started here keeps running while you are away.
  React.useEffect(() => subscribeToProductionWatch(setStatus), []);

  React.useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  const buildingId = parseInt(buildingIdInput, 10);
  const optionId = parseInt(optionIdInput, 10);
  const canStart = !isNaN(buildingId) && buildingId > 0 && !isNaN(optionId) && optionId > 0;

  const toggle = () => {
    if (status.running) {
      stopProductionWatch();
      return;
    }
    if (canStart) {
      startProductionWatch(buildingId, optionId);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Paper
        elevation={0}
        sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', position: 'sticky', top: 0 }}
      >
        <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
          Production
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Checks the stored city data every {PRODUCTION_POLL_MS / 1000}s. When the building&apos;s production is over it
          is collected, and the option below is started on the check after that.
        </Typography>

        <Stack direction='row' spacing={2} useFlexGap sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label='Building id'
            type='number'
            size='small'
            value={buildingIdInput}
            onChange={(e) => setBuildingIdInput(e.target.value)}
            disabled={status.running}
            slotProps={{ htmlInput: { min: 1 } }}
            sx={{ width: 130 }}
          />
          <TextField
            label='Option id'
            type='number'
            size='small'
            value={optionIdInput}
            onChange={(e) => setOptionIdInput(e.target.value)}
            disabled={status.running}
            slotProps={{ htmlInput: { min: 1 } }}
            sx={{ width: 130 }}
          />
          <Button
            variant='contained'
            color={status.running ? 'error' : 'primary'}
            startIcon={status.running ? <StopIcon /> : <PlayArrowIcon />}
            onClick={toggle}
            disabled={!status.running && !canStart}
          >
            {status.running ? 'Stop' : 'Start'}
          </Button>
        </Stack>

        <Stack direction='row' spacing={1} sx={{ mt: 2, gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={status.summary}
            size='small'
            color={status.running ? 'primary' : 'default'}
            variant={status.running ? 'filled' : 'outlined'}
          />
          {status.endsAt !== undefined && (
            <Chip
              label={`Ends in ${formatSeconds(Math.round((status.endsAt - now) / 1000))}`}
              size='small'
              color='info'
            />
          )}
          {status.cityEntityId && <Chip label={status.cityEntityId} size='small' variant='outlined' />}
          {status.currentOptionId !== undefined && (
            <Chip label={`Running option ${status.currentOptionId}`} size='small' variant='outlined' />
          )}
          {status.dataAt !== undefined && (
            // The countdown is only as good as the report it came from, so say how old that is.
            <Chip
              label={`Reported ${formatSeconds(Math.round((now - status.dataAt) / 1000))} ago`}
              size='small'
              variant='outlined'
            />
          )}
        </Stack>
      </Paper>

      <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
        {status.log.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color='text.secondary'>Nothing sent to the game yet.</Typography>
          </Box>
        ) : (
          status.log.map((entry, index) => (
            <React.Fragment key={`${entry.at}-${index}`}>
              <ListItem>
                <ListItemText primary={entry.text} secondary={formatClock(entry.at)} />
              </ListItem>
              {index < status.log.length - 1 && <Divider component='li' />}
            </React.Fragment>
          ))
        )}
      </List>
    </Box>
  );
};
