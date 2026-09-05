import React from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SellIcon from '@mui/icons-material/Sell';
import StopIcon from '@mui/icons-material/Stop';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  COLUMN_VIEW_MARKER,
  ColumnCapture,
  ColumnDirection,
  ColumnRefund,
  ColumnState,
} from '../inject/local/columnPlan';
import { getColumnState, sendColumn, subscribeToColumn } from './columnWatch';

const formatClock = (at: number) => new Date(at).toLocaleTimeString();

/** The game's resource ids, as they read on the refund line. Anything else keeps its id. */
const RESOURCE_NAMES: Record<string, string> = { money: 'coins', supplies: 'supplies' };

const describeRefund = (refund: ColumnRefund[]) =>
  refund
    .filter((resource) => resource.amount > 0)
    .map((resource) => `${resource.amount.toLocaleString()} ${RESOURCE_NAMES[resource.id] ?? resource.id}`)
    .join(', ');

/** The phase, as the status chip reads it. */
const describePhase = (state: ColumnState) => {
  switch (state.phase) {
    case 'idle':
      return 'Off';
    case 'armed':
      return state.mode === 'sell' ? 'Armed: sell one building' : 'Armed: place one building';
    case 'captured':
      return state.mode === 'sell' ? 'Ready to sell' : 'Ready to fill';
    case 'running':
      return `${state.mode === 'sell' ? 'Selling' : 'Filling'}: ${state.done} of ${state.target ?? '?'}`;
  }
};

/** What was picked up and what lies in line from it, on one line. */
const describeCapture = (capture: ColumnCapture) => {
  const building = `${capture.name} level ${capture.level} at ${capture.x},${capture.y}`;
  const where = capture.direction === 'down' ? 'below' : 'to the right';
  if (capture.mode === 'fill') {
    return `${building} · ${capture.width}×${capture.length} · ${capture.available} more fit ${where}`;
  }
  const producing = capture.producing ? `, ${capture.producing} producing` : '';
  const refund = capture.refund && capture.refund.length > 0 ? ` · each refunds ${describeRefund(capture.refund)}` : '';
  return `${building} · ${capture.available} more ${where}${producing}${refund}`;
};

export const ColumnView = () => {
  const [state, setState] = React.useState(getColumnState);
  const [countInput, setCountInput] = React.useState('5');
  // The whole run is the usual case; a count is for stopping short of it.
  const [wholeRun, setWholeRun] = React.useState(true);
  const [sellProducing, setSellProducing] = React.useState(false);

  // The run lives in the page; this only shows what it last said. Asking on mount covers a
  // panel built after the page had already spoken.
  React.useEffect(() => {
    const unsubscribe = subscribeToColumn(setState);
    sendColumn({ action: 'query' });
    return unsubscribe;
  }, []);

  const { phase, capture } = state;
  const selling = state.mode === 'sell';
  const running = phase === 'running';
  const armed = phase !== 'idle';
  const count = parseInt(countInput, 10);
  const validCount = !isNaN(count) && count > 0;
  const available = capture?.available ?? 0;
  const canRun = phase === 'captured' && available > 0 && (wholeRun || validCount);
  // What the button will do, so the one click says what it does.
  const planned = wholeRun ? available : Math.min(Math.max(0, count || 0), available);

  // The marker is what the page checks before every step: leaving this tab unmounts it, and
  // collapsing the panel hides it, and either one ends the run (see column.ts).
  return (
    <Box {...{ [COLUMN_VIEW_MARKER]: 'true' }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Paper
        elevation={0}
        sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', position: 'sticky', top: 0 }}
      >
        <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
            Build/Sell
          </Typography>
          {/* Arming is over once a run starts: the only button then is Stop, below. */}
          {!running &&
            (armed ? (
              <Button variant='outlined' color='error' onClick={() => sendColumn({ action: 'disarm' })}>
                Disarm
              </Button>
            ) : (
              <Stack direction='row' spacing={1}>
                <Button variant='contained' onClick={() => sendColumn({ action: 'arm', mode: 'fill' })}>
                  Arm to fill
                </Button>
                <Button variant='contained' color='warning' onClick={() => sendColumn({ action: 'arm', mode: 'sell' })}>
                  Arm to sell
                </Button>
              </Stack>
            ))}
        </Stack>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 2 }}>
          Arm, then do one by hand: place a workshop or manufactory from the build menu, or sell a building through the
          game&apos;s sell window. Fill puts more of the same in a straight line from it, down or across, waiting for a
          builder before each. Sell takes the identical buildings in a straight line from it, one a second, and refuses
          anything premium, under construction, or producing. It stops on its own if you leave this tab or close the
          panel, the city leaves the screen, the game refuses a step, or you start doing something in the city yourself.
          However it ends, the tab is off again: Arm once per line.
        </Typography>

        <Stack direction='row' spacing={1} useFlexGap sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={describePhase(state)}
            size='small'
            color={running ? 'primary' : armed ? 'info' : 'default'}
            variant={armed ? 'filled' : 'outlined'}
          />
          {capture && <Chip label={describeCapture(capture)} size='small' variant='outlined' />}
        </Stack>

        <Stack direction='row' spacing={2} useFlexGap sx={{ mt: 2, gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Held by the page, so the pick-up count and the run agree on it; starts from the city's race. */}
          <ToggleButtonGroup
            size='small'
            exclusive
            value={state.direction}
            disabled={running}
            onChange={(_event, direction: ColumnDirection | null) => {
              if (direction) {
                sendColumn({ action: 'direction', direction });
              }
            }}
          >
            <ToggleButton value='down'>Down</ToggleButton>
            <ToggleButton value='across'>Across</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            label='How many'
            type='number'
            size='small'
            value={countInput}
            onChange={(e) => setCountInput(e.target.value)}
            disabled={wholeRun || running}
            slotProps={{ htmlInput: { min: 1 } }}
            sx={{ width: 120 }}
          />
          <FormControlLabel
            control={<Switch checked={wholeRun} onChange={(e) => setWholeRun(e.target.checked)} disabled={running} />}
            label={selling ? 'Every one in the row' : 'As far as possible'}
          />
          {selling && (
            <FormControlLabel
              control={
                <Switch
                  checked={sellProducing}
                  onChange={(e) => setSellProducing(e.target.checked)}
                  disabled={running}
                />
              }
              label='Sell even if producing'
            />
          )}
          {running ? (
            <Button
              variant='contained'
              color='error'
              startIcon={<StopIcon />}
              onClick={() => sendColumn({ action: 'stop' })}
            >
              Stop
            </Button>
          ) : (
            <Button
              variant='contained'
              color={selling ? 'warning' : 'primary'}
              startIcon={selling ? <SellIcon /> : <PlayArrowIcon />}
              onClick={() =>
                sendColumn({
                  action: 'run',
                  count: wholeRun ? undefined : count,
                  sellProducing: selling && sellProducing,
                })
              }
              disabled={!canRun}
            >
              {selling ? 'Sell' : 'Fill'}
              {canRun ? ` ${planned}` : ''}
            </Button>
          )}
        </Stack>

        {state.reason && !running && (
          <Alert severity='info' sx={{ mt: 2 }}>
            {state.reason}
          </Alert>
        )}
      </Paper>

      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <List dense subheader={<ListSubheader>Activity</ListSubheader>} sx={{ p: 0 }}>
          {state.log.length === 0 ? (
            <ListItem>
              <ListItemText secondary='Nothing yet.' slotProps={{ secondary: { align: 'center' } }} />
            </ListItem>
          ) : (
            state.log.map((entry, index) => (
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
