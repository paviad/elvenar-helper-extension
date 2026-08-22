import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
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
import { AutomationEntry, newAutomationEntryId } from './automationEntry';
import { getOverlayStore } from './overlayStore';
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
  const store = getOverlayStore();
  const entries = store((state) => state.productionAutomations);
  const setEntries = store((state) => state.setProductionAutomations);

  const [status, setStatus] = React.useState(getProductionWatchStatus);
  const [buildingIdsInput, setBuildingIdsInput] = React.useState('');
  const [optionIdInput, setOptionIdInput] = React.useState('');
  const [draftName, setDraftName] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  // The watcher outlives this component, so the log is still there after a trip to another tab -
  // and monitoring started here keeps running while you are away.
  React.useEffect(() => subscribeToProductionWatch(setStatus), []);

  React.useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // Opening the tab reads the city, which is also what checks the stored entries against it and
  // drops any building it no longer has. While monitoring, the watcher's own poll does the same
  // read, so the city is read once per interval either way.
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
  const canSave = buildingIds.length > 0 && !isNaN(optionId) && optionId > 0;
  const watchedBuildings = new Set(entries.flatMap((entry) => entry.buildingIds)).size;

  const clearDraft = () => {
    setBuildingIdsInput('');
    setOptionIdInput('');
    setDraftName('');
    setEditingId(null);
  };

  const saveDraft = () => {
    if (!canSave) {
      return;
    }
    const name = draftName || `Option ${optionId}`;
    if (editingId) {
      setEntries(entries.map((entry) => (entry.id === editingId ? { ...entry, name, buildingIds, optionId } : entry)));
    } else {
      setEntries([...entries, { id: newAutomationEntryId(), name, buildingIds, optionId }]);
    }
    clearDraft();
  };

  const editEntry = (entry: AutomationEntry) => {
    setBuildingIdsInput(entry.buildingIds.join(', '));
    setOptionIdInput(entry.optionId.toString());
    setDraftName(entry.name);
    setEditingId(entry.id);
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
    if (editingId === id) {
      clearDraft();
    }
  };

  // Clicking a production line hands its buildings to the draft, so the usual job - keep all of
  // these going - is a click and Add. The option comes from the state the game reported; a line
  // whose state carried no product leaves it empty rather than guessing at one.
  const takeGroup = (group: ProductionGroup) => {
    setBuildingIdsInput(group.buildingIds.join(', '));
    setOptionIdInput(group.optionId !== undefined ? group.optionId.toString() : '');
    setDraftName(group.name);
  };

  const toggle = () => {
    if (status.running) {
      stopProductionWatch();
    } else {
      startProductionWatch(entries.length, watchedBuildings);
    }
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
          <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
            <IconButton
              aria-label='Re-read the city'
              title='Re-read the city'
              size='small'
              onClick={() => refreshProductions()}
            >
              <RefreshIcon fontSize='small' />
            </IconButton>
            <Button
              variant='contained'
              color={status.running ? 'error' : 'primary'}
              startIcon={status.running ? <StopIcon /> : <PlayArrowIcon />}
              onClick={toggle}
              disabled={!status.running && watchedBuildings === 0}
            >
              {status.running ? 'Stop' : 'Start'}
            </Button>
          </Stack>
        </Stack>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Every {PRODUCTION_POLL_MS / 1000}s, each building in the automations below whose production is over is
          collected, and its automation&apos;s option started on it the check after that.
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
            variant='outlined'
            startIcon={editingId ? <CheckIcon /> : <AddIcon />}
            onClick={saveDraft}
            disabled={status.running || !canSave}
          >
            {editingId ? 'Save' : 'Add'}
          </Button>
          {editingId && (
            <Button variant='text' onClick={clearDraft} disabled={status.running}>
              Cancel
            </Button>
          )}
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
        <List dense subheader={<ListSubheader>Automations ({watchedBuildings} buildings)</ListSubheader>} sx={{ p: 0 }}>
          {entries.length === 0 ? (
            <ListItem>
              <ListItemText
                secondary='None yet. Pick a line below, or type ids in, then Add.'
                slotProps={{ secondary: { align: 'center' } }}
              />
            </ListItem>
          ) : (
            entries.map((entry) => (
              <ListItem
                key={entry.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge='end'
                    aria-label={`Delete ${entry.name}`}
                    onClick={() => deleteEntry(entry.id)}
                    disabled={status.running}
                  >
                    <DeleteOutlinedIcon fontSize='small' />
                  </IconButton>
                }
              >
                <ListItemButton
                  onClick={() => editEntry(entry)}
                  disabled={status.running}
                  selected={editingId === entry.id}
                >
                  <ListItemText
                    primary={entry.name}
                    secondary={`${entry.buildingIds.length} building(s) · option ${entry.optionId}`}
                    slotProps={{ secondary: { color: entry.buildingIds.length === 0 ? 'error' : undefined } }}
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>

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
