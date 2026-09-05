import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Alert, Box, Button, Divider, IconButton, Tooltip, Typography } from '@mui/material';
import { archiveIntervals, averageInterval, EventChestArrival, formatInterval } from '../inject/local/eventChestTiming';
import { getLatestEventChest, subscribeToEventChests } from './eventChestWatch';
import { getOverlayStore } from './overlayStore';

const pad = (n: number) => String(n).padStart(2, '0');

const time = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const day = (at: number) => {
  const d = new Date(at);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const clockStatus = (latest: EventChestArrival | undefined) => {
  if (!latest) {
    return 'No chest since the page loaded. The next one starts the clock.';
  }
  if (latest.outcome === 'atLoad') {
    return `A chest was already there at load (${time(latest.at)}) and does not count. The next one starts the clock.`;
  }
  return `Timing from the chest at ${time(latest.at)}.`;
};

/**
 * How often event currency chests turn up: the gaps measured in the running event, their
 * average, and earlier events' figures put aside with Archive to compare against.
 */
export const EventChestsView = () => {
  const store = getOverlayStore();
  const intervals = store((state) => state.eventChestIntervals);
  const setIntervals = store((state) => state.setEventChestIntervals);
  const archive = store((state) => state.eventChestArchive);
  const setArchive = store((state) => state.setEventChestArchive);

  const [latest, setLatest] = React.useState(getLatestEventChest);
  React.useEffect(() => subscribeToEventChests(setLatest), []);

  const average = averageInterval(intervals);

  const onArchive = () => {
    const entry = archiveIntervals(intervals);
    if (entry) {
      setArchive([entry, ...archive]);
      setIntervals([]);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, p: 1, gap: 1 }}>
      <Alert severity='info'>{clockStatus(latest)}</Alert>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant='body1' sx={{ flexGrow: 1 }}>
          {average === undefined ? (
            'No intervals yet.'
          ) : (
            <>
              <strong>{intervals.length}</strong> interval{intervals.length === 1 ? '' : 's'}, average{' '}
              <strong>{formatInterval(average)}</strong>
            </>
          )}
        </Typography>
        <Tooltip title='Put this event’s figures aside and start the next from nothing'>
          <span>
            <Button size='small' variant='outlined' disabled={!intervals.length} onClick={onArchive}>
              Archive
            </Button>
          </span>
        </Tooltip>
      </Box>
      <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
        {[...intervals].reverse().map((interval) => (
          <Box
            key={interval.at}
            sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}
          >
            <Typography variant='body2' sx={{ flexGrow: 1 }}>
              {day(interval.at)} {time(interval.at)} · {formatInterval(interval.ms)}
            </Typography>
            <Tooltip title='Leave this one out'>
              <IconButton
                size='small'
                onClick={() => setIntervals(intervals.filter((other) => other.at !== interval.at))}
              >
                <CloseIcon fontSize='inherit' />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
        {archive.length > 0 && (
          <>
            <Divider sx={{ my: 1 }}>Archived</Divider>
            {archive.map((entry) => (
              <Box
                key={entry.archivedAt}
                sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}
              >
                <Typography variant='body2' sx={{ flexGrow: 1 }}>
                  {day(entry.from)} – {day(entry.to)} · <strong>{entry.count}</strong> intervals, average{' '}
                  <strong>{formatInterval(entry.averageMs)}</strong>
                </Typography>
                <Tooltip title='Delete'>
                  <IconButton
                    size='small'
                    onClick={() => setArchive(archive.filter((other) => other.archivedAt !== entry.archivedAt))}
                  >
                    <CloseIcon fontSize='inherit' />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </>
        )}
      </Box>
    </Box>
  );
};
