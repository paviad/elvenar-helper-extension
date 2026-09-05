import React, { useEffect, useMemo, useRef, useState } from 'react';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StopIcon from '@mui/icons-material/Stop';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getAccountById } from '../elvenar/accountStore';
import { getEffects } from '../elvenar/getEffects';
import { compareVersion } from '../inject/compareVersion';
import { relayToGame } from '../inject/relayToGame';
import { NeighbourHelpData } from '../model/neighbourHelpBuildings';
import { WorldNeighbor } from '../model/worldNeighbors';
import { binNeighborCooldowns, CooldownBin } from '../util/binNeighborCooldowns';
import { formatTimeLeft } from '../util/formatTimeLeft';
import { angle_from_origin, offset_distance } from '../util/hexGrid';
import { isAvailableForHelp } from '../util/neighborHelpRecord';
import { getAccountId, getOverlayStore } from './overlayStore';

// Extend the base interface to include our calculated metrics
type NeighborWithMetrics = WorldNeighbor & { distance: number; angle: number };

// Every subheader in the list sits above content that scrolls under it, the timeline's hour
// headings included, so each one needs a background of its own.
const subheaderSx = {
  bgcolor: 'background.paper',
  lineHeight: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
} as const;

/** Clock time, with the weekday added once a cooldown reaches past midnight. */
const formatClock = (at: number, now: number) => {
  const when = new Date(at);
  const time = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return when.toDateString() === new Date(now).toDateString()
    ? time
    : `${when.toLocaleDateString([], { weekday: 'short' })} ${time}`;
};

/** How far off a cooldown is: "in 3h 20m", or "due now" for one that has already run out. */
const readyIn = (at: number, now: number) => (at <= now ? 'due now' : `in ${formatTimeLeft(at, now)}`);

/**
 * What a waiting neighbor's row says. A cooldown that ran out while the list sat here is help the
 * game will hand over, but only the next fetch can say so - the list still has them on cooldown.
 */
const readyAtLabel = (at: number, now: number) =>
  at <= now ? 'Ready - refresh to pick it up' : `${formatClock(at, now)} (${readyIn(at, now)})`;

/** Which hour of the timeline a bin is, named the way somebody waiting on it would name it. */
const binLabel = (bin: CooldownBin, now: number) =>
  bin.hour === 0 ? 'Within the hour' : `In ${bin.hour}-${bin.hour + 1}h, from ${formatClock(bin.start, now)}`;

/** The fellowship and reciprocity badges, the same on an available neighbor as on a waiting one. */
const NeighborChips: React.FC<{ neighbor: WorldNeighbor }> = ({ neighbor }) => (
  <>
    {neighbor.guild_info && (
      <Chip
        label={neighbor.guild_info.name}
        size='small'
        variant='outlined'
        color='info'
        sx={{ height: 20, fontSize: '0.7rem' }}
      />
    )}
    {(neighbor.help_back_count_down ?? 0) > 0 && (
      <Chip label='Helped You' size='small' color='success' sx={{ height: 20, fontSize: '0.7rem' }} />
    )}
  </>
);

export const NeighbourlyHelp: React.FC<{ refresh: number }> = ({ refresh }) => {
  const store = getOverlayStore();
  const initialWorldMapData = store((state) => state.initialWorldMapData);
  const worldNeighbors = store((state) => state.worldNeighbors);
  const gameVars = store((state) => state.gameVars);

  const [neighborsOffCooldownSorted, setNeighboursOffCooldownSorted] = useState<NeighborWithMetrics[]>([]);
  const [overflowMoney, setOverflowMoney] = useState(0);
  const [overflowSupplies, setOverflowSupplies] = useState(0);
  const [helpCountInput, setHelpCountInput] = useState<number | string>(1);
  const [delayMs, setDelayMs] = useState<number | string>(1000);
  const [isHelping, setIsHelping] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Use a ref for the stop signal so we don't have to worry about stale closures in our async loop
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    // The cooldown timeline is read against the clock, so it needs one: the bins would otherwise
    // keep saying what they said the moment the neighbor list arrived.
    const ticker = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    fetchWorldNeighbors();
    // Stop any automation still running when the panel goes away. Raising the flag here
    // rather than calling handleStop: that is declared two hundred lines below, so this
    // reached forward to it and captured the first render's copy for the panel's lifetime.
    return () => {
      stopRequestedRef.current = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const accountId = getAccountId();

    if (!accountId) {
      return;
    }

    const accountData = getAccountById(accountId);

    if (!accountData?.cityQuery) {
      return;
    }

    const playerId = accountData.cityQuery.userData.player_id;
    const money = accountData.cityQuery.cityResources?.money || 0;
    const supplies = accountData.cityQuery.cityResources?.supplies || 0;
    const mainHallLevel = accountData.cityQuery.cityEntities.find((e) => e.type === 'main_building')?.level || 0;
    const coinsCap = accountData.cityQuery.coinsCap;
    const suppliesCap = accountData.cityQuery.suppliesCap;

    if (!playerId) {
      console.error('Player ID not found for account:', accountId);
      return;
    }

    const Do = async () => {
      const effects = await getEffects();
      const helpReward = effects.find((e) => e.action === 'unlimited_help')?.values?.[mainHallLevel] || 0;
      const moneyReward = helpReward * 0.3;
      const suppliesReward = moneyReward / 10;

      console.log('received world neighbors in tsx', worldNeighbors.filter((r) => r.cool_down).length);

      const neighbors = worldNeighbors;

      const neighborsOffCooldownUnsorted = neighbors.filter(isAvailableForHelp);

      if (neighborsOffCooldownUnsorted.length === 0 || !initialWorldMapData) {
        setNeighboursOffCooldownSorted([]);
        return;
      }

      const ownProvince = initialWorldMapData.player_world_map_area_vo.provinces.find(
        (province) => province.player_id === playerId,
      );

      if (!ownProvince) {
        console.error('Own province not found for player ID:', playerId);
        return;
      }

      const guildId = ownProvince.guild_info?.id || -1;
      const originRow = ownProvince.q;
      const originCol = ownProvince.r;

      const origin = { col: originCol, row: originRow };

      const neighborsWithDistance: NeighborWithMetrics[] = neighbors.map((neighbor) => {
        const nq = neighbor.q || 0;
        const nr = neighbor.r || 0;
        const hex = { col: nr, row: nq };
        const distance = offset_distance(origin, hex);
        const angle = angle_from_origin(origin, hex);
        return {
          ...neighbor,
          distance,
          angle,
        };
      });

      const farthestNonGuildMemberNeighbor = neighborsWithDistance
        .filter((neighbor) => neighbor.guild_info?.id !== guildId)
        .sort((a, b) => b.distance - a.distance)[0];

      if (!farthestNonGuildMemberNeighbor) return;

      // REFINED SORT ORDER:
      // 1. People who helped you (Reciprocity)
      // 2. People within discovery range
      // 3. Distance (Ascending)
      // 4. Angle (Ascending)
      const sorted = neighborsWithDistance.sort((a, b) => {
        // Reciprocity Check
        const aHelped = (a.help_back_count_down ?? 0) > 0;
        const bHelped = (b.help_back_count_down ?? 0) > 0;
        if (aHelped !== bHelped) return aHelped ? -1 : 1;

        // Discovery Range Check
        const aInDisc = a.distance <= farthestNonGuildMemberNeighbor.distance;
        const bInDisc = b.distance <= farthestNonGuildMemberNeighbor.distance;
        if (aInDisc !== bInDisc) return aInDisc ? -1 : 1;

        // Distance Check
        if (a.distance !== b.distance) return a.distance - b.distance;

        // Angle Check
        return a.angle - b.angle;
      });

      const offCooldown = sorted.filter(isAvailableForHelp);
      if (!ignore) {
        const totalMoneyReward = offCooldown.length * moneyReward;
        const reciprocal = offCooldown.filter((n) => (n.help_back_count_down ?? 0) > 0).length;
        const totalSuppliesReward = Math.round(reciprocal * suppliesReward);
        const overflowMoney = Math.max(0, money + totalMoneyReward - coinsCap);
        const overflowSupplies = Math.max(0, supplies + totalSuppliesReward - suppliesCap);
        setNeighboursOffCooldownSorted(offCooldown);
        setOverflowMoney(overflowMoney);
        setOverflowSupplies(overflowSupplies);
      }
    };

    void Do();

    return () => {
      ignore = true;
    };
  }, [worldNeighbors, initialWorldMapData, refresh]);

  // Everyone still on cooldown, grouped into the hour they come back in. Taken from the raw
  // neighbor list rather than from the sorted one above: the timeline has no use for distances,
  // and this way it still fills in when the world map data needed for those never arrived.
  const cooldownBins = useMemo(() => binNeighborCooldowns(worldNeighbors, now), [worldNeighbors, now]);
  const upcomingCount = cooldownBins.reduce((total, bin) => total + bin.neighbors.length, 0);
  const soonest = cooldownBins.find((bin) => bin.neighbors.length > 0)?.neighbors[0].cooldownEndsAt;
  const lastBin = cooldownBins[cooldownBins.length - 1];
  const latest = lastBin?.neighbors[lastBin.neighbors.length - 1].cooldownEndsAt;
  const upcomingSummary =
    soonest === undefined || latest === undefined
      ? undefined
      : `${upcomingCount} more on cooldown - next ${readyIn(soonest, now)}, the last ${readyIn(latest, now)}.`;

  // --- Automation Handlers ---

  const handleAutomateHelp = async (count: number) => {
    const targets = neighborsOffCooldownSorted.slice(0, count);
    if (targets.length === 0) return;

    const delay = typeof delayMs === 'string' ? parseInt(delayMs, 10) : delayMs;
    const safeDelay = isNaN(delay) || delay < 0 ? 1000 : delay;

    setIsHelping(true);
    stopRequestedRef.current = false;

    try {
      for (let i = 0; i < targets.length; i++) {
        // Check if the user pressed the Stop button
        if (stopRequestedRef.current) {
          break;
        }

        const target = targets[i];

        if (gameVars && compareVersion('1.239', gameVars.version) >= 0) {
          relayToGame('helpPlayer', target.player_id);
        } else {
          getNeighbourlyHelpBuildings(target.player_id);

          // Wait for the response to arrive in the store before proceeding
          const neighbourHelpData = await new Promise<NeighbourHelpData>((resolve, reject) => {
            // Subscribe to store changes to detect when this specific player's data arrives
            const unsubscribe = store.subscribe((state) => {
              if (state.neighbourHelpData?.player.player_id === target.player_id) {
                clearTimeout(timeoutId);
                unsubscribe();
                resolve(state.neighbourHelpData);
              }
            });

            // Timeout to prevent infinite hanging if the server fails
            const timeoutId = setTimeout(() => {
              console.warn(`Timeout waiting for help response for ${target.name}`);
              unsubscribe();
              reject(new Error(`Timeout waiting for help response for ${target.name}`));
            }, 8000); // 8 seconds timeout
          });

          if (stopRequestedRef.current) {
            break;
          }

          performAppropriateHelp(neighbourHelpData);
        }

        // Recorded in the store, not just dropped from this panel's list: the list is rebuilt from
        // the store whenever it changes, and a neighbor left unmarked there comes back as helpable
        // the moment it is - after the run, or when the panel reopens - and gets helped twice.
        store.getState().markNeighborHelped(target.player_id);

        // Add a delay between requests to avoid spamming the servers.
        if (i < targets.length - 1 && !stopRequestedRef.current) {
          await new Promise((res) => setTimeout(res, safeDelay));
        }
      }
    } catch (error) {
      console.error('Error during automated help:', error);
    } finally {
      setIsHelping(false);
    }
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
  };

  const handleHelpSpecificCount = () => {
    const count = typeof helpCountInput === 'string' ? parseInt(helpCountInput, 10) : helpCountInput;
    if (!isNaN(count) && count > 0) {
      void handleAutomateHelp(count);
    }
  };

  const handleHelpAll = () => {
    void handleAutomateHelp(neighborsOffCooldownSorted.length);
  };

  const availableCount = neighborsOffCooldownSorted.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Control Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
        }}
      >
        <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
          Neighborly Help
        </Typography>
        <Box sx={{ mb: overflowMoney > 0 || overflowSupplies > 0 ? 1 : 2 }}>
          <Typography variant='body2' color='text.secondary'>
            {availableCount} neighbor{availableCount !== 1 ? 's' : ''} available to help.
          </Typography>
          {upcomingSummary && (
            <Typography variant='body2' color='text.secondary'>
              {upcomingSummary}
            </Typography>
          )}
        </Box>

        {/* Overflow Indicators */}
        {(overflowMoney > 0 || overflowSupplies > 0) && (
          <Stack direction='row' spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            {overflowMoney > 0 && (
              <Chip
                icon={<WarningAmberIcon fontSize='small' />}
                label={`Coins Overflow: +${overflowMoney.toLocaleString()}`}
                color='warning'
                size='small'
                variant='outlined'
              />
            )}
            {overflowSupplies > 0 && (
              <Chip
                icon={<WarningAmberIcon fontSize='small' />}
                label={`Supplies Overflow: +${overflowSupplies.toLocaleString()}`}
                color='warning'
                size='small'
                variant='outlined'
              />
            )}
          </Stack>
        )}

        <Stack direction='row' spacing={2} useFlexGap sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label='Amount'
            type='number'
            size='small'
            value={helpCountInput}
            onChange={(e) => setHelpCountInput(e.target.value)}
            disabled={isHelping || availableCount === 0}
            slotProps={{
              htmlInput: { min: 1, max: availableCount },
            }}
            sx={{ width: 100 }}
          />
          <TextField
            label='Delay (ms)'
            type='number'
            size='small'
            value={delayMs}
            onChange={(e) => setDelayMs(e.target.value)}
            disabled={isHelping}
            slotProps={{
              htmlInput: { min: 0, step: 100 },
            }}
            sx={{ width: 120 }}
          />
          <Button
            variant='contained'
            color='primary'
            startIcon={<PlayArrowIcon />}
            onClick={handleHelpSpecificCount}
            disabled={isHelping || availableCount === 0 || !helpCountInput}
          >
            Help {helpCountInput || 0}
          </Button>
          <Button
            variant='outlined'
            color='secondary'
            startIcon={<DoneAllIcon />}
            onClick={handleHelpAll}
            disabled={isHelping || availableCount === 0}
          >
            Help All ({availableCount})
          </Button>
          <Button variant='contained' color='error' startIcon={<StopIcon />} onClick={handleStop} disabled={!isHelping}>
            Stop
          </Button>
          <Button variant='text' startIcon={<RefreshIcon />} onClick={fetchWorldNeighbors} disabled={isHelping}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      {/* Neighbor List, and after it the hour-by-hour timeline of who comes back when */}
      <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
        {availableCount === 0 && upcomingCount === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color='text.secondary'>No neighbors are currently off cooldown.</Typography>
          </Box>
        )}

        {availableCount > 0 && <ListSubheader sx={subheaderSx}>Available now ({availableCount})</ListSubheader>}

        {neighborsOffCooldownSorted.map((neighbor, index) => (
          <React.Fragment key={neighbor.player_id}>
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
                      {index + 1}. {neighbor.name}
                    </Typography>
                    <NeighborChips neighbor={neighbor} />
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant='caption' color='text.secondary'>
                      Distance: {Math.round(neighbor.distance)} | Angle: {Math.round(neighbor.angle)}°
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
            {index < availableCount - 1 && <Divider component='li' />}
          </React.Fragment>
        ))}

        {cooldownBins.map((bin) => (
          <React.Fragment key={bin.hour}>
            <ListSubheader
              sx={{
                ...subheaderSx,
                color: bin.neighbors.length > 0 ? 'text.secondary' : 'text.disabled',
              }}
            >
              <span>{binLabel(bin, now)}</span>
              <Typography variant='caption' color='inherit'>
                {bin.neighbors.length > 0
                  ? `+${bin.neighbors.length} → ${availableCount + bin.cumulative} ready`
                  : 'none'}
              </Typography>
            </ListSubheader>
            {bin.neighbors.map((neighbor) => (
              <ListItem key={neighbor.player_id} sx={{ py: 0.25 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant='body2'>{neighbor.name}</Typography>
                      <NeighborChips neighbor={neighbor} />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant='caption' color='text.secondary'>
                        {readyAtLabel(neighbor.cooldownEndsAt!, now)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

const getNeighbourlyHelpBuildings = (playerId: number) => {
  relayToGame('getNeighborlyHelpBuildings', playerId);
};

const performAppropriateHelp = (neighbourhoodHelpData: NeighbourHelpData) => {
  relayToGame('neighbourHelpBuildings', neighbourhoodHelpData);
};

const fetchWorldNeighbors = () => {
  relayToGame('fetchWorldNeighbors');
};
