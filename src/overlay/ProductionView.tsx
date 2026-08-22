import React from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import StopIcon from '@mui/icons-material/Stop';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  getProductionWatchStatus,
  PRODUCTION_POLL_MS,
  ProductionGroup,
  refreshProductions,
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

/**
 * Ids are typed as a list, so anything that is not a digit separates one from the next. Repeats
 * are dropped: the same building twice would be collected twice and paid for twice.
 */
const parseBuildingIds = (input: string) => [
  ...new Set(
    input
      .split(/[^\d]+/)
      .filter(Boolean)
      .map((part) => parseInt(part, 10)),
  ),
];

/** What a production line says about itself under its name. */
const describeGroup = (group: ProductionGroup, now: number) => {
  const ready = group.finished > 0 ? `${group.finished} ready` : '';
  const running = group.producing > 0 ? `${group.producing} producing` : '';
  const due =
    group.nextEndsAt !== undefined ? `next in ${formatSeconds(Math.round((group.nextEndsAt - now) / 1000))}` : '';
  const option = group.optionId !== undefined ? `option ${group.optionId}` : 'option unknown';
  return [ready, running, due, option, group.buildingKinds.join(', ')].filter(Boolean).join(' · ');
};

export const ProductionView = () => {
  const [status, setStatus] = React.useState(getProductionWatchStatus);
  const [buildingIdsInput, setBuildingIdsInput] = React.useState(() => status.buildingIds.join(', '));
  const [optionIdInput, setOptionIdInput] = React.useState(() => status.optionId?.toString() ?? '');
  const [now, setNow] = React.useState(() => Date.now());

  // The watcher outlives this component, so the fields refill and the log is still there after a
  // trip to another tab - and monitoring started here keeps running while you are away.
  React.useEffect(() => subscribeToProductionWatch(setStatus), []);

  React.useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // While monitoring, the watcher's own poll keeps the list current; this only covers the rest of
  // the time, so the city is read once per interval either way.
  React.useEffect(() => {
    const refresh = () => {
      if (!getProductionWatchStatus().running) {
        refreshProductions();
      }
    };
    refresh();
    const poller = setInterval(refresh, PRODUCTION_POLL_MS);
    return () => clearInterval(poller);
  }, []);

  const buildingIds = parseBuildingIds(buildingIdsInput);
  const optionId = parseInt(optionIdInput, 10);
  const canStart = buildingIds.length > 0 && !isNaN(optionId) && optionId > 0;

  const toggle = () => {
    if (status.running) {
      stopProductionWatch();
      return;
    }
    if (canStart) {
      startProductionWatch(buildingIds, optionId);
    }
  };

  // Clicking a line hands its buildings to the fields, so the usual job - keep all of these going -
  // is one click and Start. The option is only filled in when the reported state carried one.
  const takeGroup = (group: ProductionGroup) => {
    setBuildingIdsInput(group.buildingIds.join(', '));
    setOptionIdInput(group.optionId !== undefined ? group.optionId.toString() : '');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Paper
        elevation={0}
        sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', position: 'sticky', top: 0 }}
      >
        <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
            Production
          </Typography>
          <IconButton
            aria-label='Re-read the city'
            title='Re-read the city'
            size='small'
            onClick={() => refreshProductions()}
          >
            <RefreshIcon fontSize='small' />
          </IconButton>
        </Stack>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Checks the stored city every {PRODUCTION_POLL_MS / 1000}s. Each building whose production is over is
          collected, and the option below started on it the check after that.
        </Typography>

        <Stack direction='row' spacing={2} useFlexGap sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label='Building ids'
            size='small'
            value={buildingIdsInput}
            onChange={(e) => setBuildingIdsInput(e.target.value)}
            disabled={status.running}
            placeholder='17020, 17021'
            helperText={buildingIds.length > 0 ? `${buildingIds.length} building(s)` : 'One or more, comma separated'}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <TextField
            label='Option id'
            type='number'
            size='small'
            value={optionIdInput}
            onChange={(e) => setOptionIdInput(e.target.value)}
            disabled={status.running}
            slotProps={{ htmlInput: { min: 1 } }}
            sx={{ width: 110 }}
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
          {status.nextEndsAt !== undefined && (
            <Chip
              label={`Next in ${formatSeconds(Math.round((status.nextEndsAt - now) / 1000))}`}
              size='small'
              color='info'
            />
          )}
          {status.groupsAt !== undefined && (
            <Chip
              label={`City read ${formatSeconds(Math.round((now - status.groupsAt) / 1000))} ago`}
              size='small'
              variant='outlined'
            />
          )}
        </Stack>
      </Paper>

      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <List dense subheader={<ListSubheader>In production</ListSubheader>} sx={{ p: 0 }}>
          {status.groups.length === 0 ? (
            <ListItem>
              <ListItemText
                secondary='Nothing is in production, or the city has not been read yet.'
                slotProps={{ secondary: { align: 'center' } }}
              />
            </ListItem>
          ) : (
            status.groups.map((group, index) => (
              <React.Fragment key={group.key}>
                <ListItemButton onClick={() => takeGroup(group)} disabled={status.running}>
                  <ListItemText
                    primary={`${group.name} — ${group.buildingIds.length}`}
                    secondary={describeGroup(group, now)}
                  />
                </ListItemButton>
                {index < status.groups.length - 1 && <Divider component='li' />}
              </React.Fragment>
            ))
          )}
        </List>

        <List dense subheader={<ListSubheader>Activity</ListSubheader>} sx={{ p: 0 }}>
          {status.log.length === 0 ? (
            <ListItem>
              <ListItemText secondary='Nothing sent to the game yet.' slotProps={{ secondary: { align: 'center' } }} />
            </ListItem>
          ) : (
            status.log.map((entry, index) => (
              <ListItem key={`${entry.at}-${index}`}>
                <ListItemText primary={entry.text} secondary={formatClock(entry.at)} />
              </ListItem>
            ))
          )}
        </List>
      </Box>
    </Box>
  );
};
