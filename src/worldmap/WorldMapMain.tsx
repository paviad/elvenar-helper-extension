import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { getGoodsNames } from '../elvenar/getGoodsNames';
import { useAccount } from '../elvenar/useAccount';
import { useTabStore } from '../util/tabStore';
import {
  countByGood,
  deriveWorldMap,
  Province,
  PROVINCE_STATUS_LABELS,
  PROVINCE_STATUSES,
  ProvinceStatus,
} from './deriveWorldMap';
import { tournamentMarks } from './tournamentMarks';
import { GOODS_BY_TIER, ProvinceGood } from './worldMapGeometry';
import { WorldMapHexes } from './WorldMapHexes';
import { GOOD_COLOURS, goodName, hexStyle } from './worldMapStyle';
import { WorldMapTable } from './WorldMapTable';

const toggled = <T,>(set: ReadonlySet<T>, value: T) => {
  const next = new Set(set);
  if (!next.delete(value)) {
    next.add(value);
  }
  return next;
};

/** How often the scout's time left is brought up to date. */
const CLOCK_TICK_MS = 61_000;

const filterCellSx = (selected: boolean) => ({
  cursor: 'pointer',
  bgcolor: selected ? 'action.selected' : undefined,
  '&:hover': { bgcolor: 'action.hover' },
});

export const WorldMapMain = () => {
  const accountId = useTabStore((state) => state.accountId);
  const account = useAccount(accountId);
  const worldMap = account?.worldMap;
  const boostedGoods = account?.cityQuery?.boostedGoods;

  const [goodsNames, setGoodsNames] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    void getGoodsNames().then(setGoodsNames);
  }, []);

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const [mode, setMode] = React.useState<'map' | 'table'>('map');
  // An empty set filters nothing.
  const [goods, setGoods] = React.useState<ReadonlySet<ProvinceGood>>(new Set());
  const [statuses, setStatuses] = React.useState<ReadonlySet<ProvinceStatus>>(new Set());

  const view = React.useMemo(() => deriveWorldMap(worldMap, now), [worldMap, now]);
  const cityQuery = account?.cityQuery;
  const tournaments = tournamentMarks(cityQuery?.tournaments, cityQuery?.timestamp, now);
  const counts = React.useMemo(() => countByGood(view?.provinces ?? []), [view]);

  const matches = React.useCallback(
    (province: Province) =>
      (goods.size === 0 || goods.has(province.good)) && (statuses.size === 0 || statuses.has(province.status)),
    [goods, statuses],
  );
  const matching = React.useMemo(() => view?.provinces.filter(matches) ?? [], [view, matches]);

  if (!view) {
    return (
      <Box sx={{ p: 3, mx: '10%' }}>
        <Typography variant='h4' sx={{ mb: 2, fontWeight: 'bold' }}>
          World Map
        </Typography>
        <Alert severity='info'>
          Nothing is known of this city's world map yet. Open the world map in the game and this page fills in.
        </Alert>
      </Box>
    );
  }

  const filtered = goods.size > 0 || statuses.size > 0;
  const statusTotal = (status: ProvinceStatus) => Object.values(counts).reduce((sum, c) => sum + c[status], 0);

  /** A cell's count picks out exactly its provinces; clicking it again shows everything. */
  const isOnly = (good: ProvinceGood, status: ProvinceStatus) =>
    goods.size === 1 && goods.has(good) && statuses.size === 1 && statuses.has(status);
  const pickOnly = (good: ProvinceGood, status: ProvinceStatus) => {
    const clear = isOnly(good, status);
    setGoods(clear ? new Set() : new Set([good]));
    setStatuses(clear ? new Set() : new Set([status]));
  };

  return (
    <Box sx={{ p: 3, mx: '5%' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 2 }}>
        <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
          World Map
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          As of {new Date(worldMap?.frontierAt ?? now).toLocaleString()}
        </Typography>
      </Box>

      {view.unlocated === undefined && (
        <Alert severity='info' sx={{ mb: 2 }}>
          Reload the game once so the count of completed provinces can be checked. Until then every scouted province not
          seen as incomplete is shown as completed.
        </Alert>
      )}
      {!!view.unlocated && (
        <Alert severity='warning' sx={{ mb: 2 }}>
          {view.unlocated === 1
            ? '1 incomplete province is shown as completed, because the game has not said where it is.'
            : `${view.unlocated} incomplete provinces are shown as completed, because the game has not said where they are.`}{' '}
          Open the Incomplete tab of the game&apos;s Province Overview, or move the map over them.
        </Alert>
      )}

      <TableContainer component={Paper} variant='outlined' sx={{ mb: 2 }}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Good</TableCell>
              {PROVINCE_STATUSES.map((status) => (
                <TableCell
                  key={status}
                  align='right'
                  onClick={() => setStatuses(toggled(statuses, status))}
                  sx={filterCellSx(statuses.has(status))}
                  title='Show only provinces in this state'
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    <svg width='14' height='14' viewBox='-8 -8 16 16'>
                      <rect x='-6' y='-6' width='12' height='12' rx='2' {...hexStyle(status, '#617e89')} />
                    </svg>
                    {PROVINCE_STATUS_LABELS[status]}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {GOODS_BY_TIER.flat().map((good, index) => (
              <TableRow
                key={good}
                sx={index % 3 === 0 && index > 0 ? { '& td': { borderTop: 2, borderTopColor: 'divider' } } : undefined}
              >
                <TableCell
                  onClick={() => setGoods(toggled(goods, good))}
                  sx={filterCellSx(goods.has(good))}
                  title='Show only provinces of this good'
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: GOOD_COLOURS[good] }} />
                    <span style={{ fontWeight: boostedGoods?.includes(good) ? 700 : 400 }}>
                      {goodName(goodsNames, good)}
                    </span>
                    {boostedGoods?.includes(good) && (
                      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                        boosted
                      </Typography>
                    )}
                    {tournaments.current === good && (
                      <Chip size='small' color='primary' label='Current tournament' sx={{ ml: 1 }} />
                    )}
                    {tournaments.next === good && (
                      <Chip size='small' variant='outlined' label='Next tournament' sx={{ ml: 1 }} />
                    )}
                  </Box>
                </TableCell>
                {PROVINCE_STATUSES.map((status) => (
                  <TableCell
                    key={status}
                    align='right'
                    onClick={() => pickOnly(good, status)}
                    sx={{
                      ...filterCellSx(isOnly(good, status)),
                      color: counts[good][status] ? undefined : 'text.disabled',
                    }}
                  >
                    {counts[good][status]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow sx={{ '& td': { fontWeight: 700, borderTop: 2, borderTopColor: 'divider' } }}>
              <TableCell>All</TableCell>
              {PROVINCE_STATUSES.map((status) => (
                <TableCell key={status} align='right'>
                  {statusTotal(status)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <ToggleButtonGroup
          size='small'
          exclusive
          value={mode}
          onChange={(_, next: 'map' | 'table' | null) => next && setMode(next)}
        >
          <ToggleButton value='map'>Map</ToggleButton>
          <ToggleButton value='table'>Table</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {filtered
            ? `${matching.length} of ${view.provinces.length} provinces`
            : 'Click a good, a state or a count above to filter.'}
        </Typography>
        {filtered && (
          <Button
            size='small'
            onClick={() => {
              setGoods(new Set());
              setStatuses(new Set());
            }}
          >
            Show all
          </Button>
        )}
        {mode === 'map' && (
          <Typography variant='body2' sx={{ color: 'text.secondary', ml: 'auto' }}>
            Drag to move, scroll to zoom, double-click to fit.
          </Typography>
        )}
      </Box>

      {mode === 'map' ? (
        <WorldMapHexes
          home={view.home}
          provinces={view.provinces}
          matches={matches}
          goodsNames={goodsNames}
          now={now}
        />
      ) : (
        <WorldMapTable home={view.home} provinces={matching} goodsNames={goodsNames} now={now} />
      )}
    </Box>
  );
};
