import React, { useEffect, useMemo, useState } from 'react';
import ConstructionIcon from '@mui/icons-material/Construction';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import TimerIcon from '@mui/icons-material/Timer';
import { Alert, Box, Chip, Divider, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { getBattleUnitTypes } from '../elvenar/getBattleUnitTypes';
import { ArmyDetails, TrainingBuilding, TroopType } from '../model/armyDetails';
import { BattleUnitType } from '../model/battleUnitType';
import { SeasonalEvent } from '../model/seasonalEvent';
import { getAccountId, getOverlayStore } from './overlayStore';
import { TOURNAMENT_GUIDES, TrainingSuggestion } from './tournamentGuide';
import { readTournamentStatus, upcomingTournament } from './tournamentSchedule';
import { BUILDING_LABELS, formatSeconds, TROOP_LABELS, UnitSprite } from './tournyUnitDisplay';

/** The order buildings are listed in, matching how the guide presents its suggestions. */
const BUILDING_ORDER: TrainingBuilding[] = ['eb', 'hb', 'tg', 'mc'];

interface ResolvedSuggestion extends TrainingSuggestion {
  /** The player's own unit of this building and class, at its highest unlocked level. */
  unit?: BattleUnitType;
  held: number;
}

/**
 * What to train for the tournament that comes next.
 *
 * The rotation is fixed, so the tournament that just ended names the upcoming one, and the guide
 * says what it will field. Suggestions are recorded as building plus class rather than by unit
 * name, so each one resolves to whatever this player actually has unlocked.
 */
export const TournyPrep = () => {
  const store = getOverlayStore();
  const lastTournament = store((state) => state.lastTournament);
  const setLastTournament = store((state) => state.setLastTournament);

  const [almanac, setAlmanac] = useState<BattleUnitType[]>([]);
  const [armyDetails, setArmyDetails] = useState<ArmyDetails | null>(null);
  const [tournaments, setTournaments] = useState<SeasonalEvent[] | undefined>(undefined);
  // `remainingTime` is relative to when the events were read, so that moment is kept to count from.
  const [readAt, setReadAt] = useState<number | undefined>(undefined);
  const [now, setNow] = useState(Date.now());

  const spriteUrl = chrome.runtime.getURL('military_sprite.png');

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    async function load() {
      const accountId = getAccountId();
      if (!accountId) return;

      await loadSingleAccountFromStorage(accountId);
      const accountData = getAccountById(accountId);

      setArmyDetails(accountData?.cityQuery?.armyDetails ?? null);
      setTournaments(accountData?.cityQuery?.tournaments);
      setReadAt(Date.now());

      try {
        setAlmanac(await getBattleUnitTypes());
      } catch (err) {
        console.error('Failed to load the battle unit almanac:', err);
      }
    }
    void load();
  }, []);

  const status = useMemo(() => readTournamentStatus(tournaments), [tournaments]);

  // Remembered so the rotation still has something to count from once the game stops mentioning
  // any tournament at all.
  useEffect(() => {
    if (status.anchor && status.anchor !== lastTournament) {
      setLastTournament(status.anchor);
    }
  }, [status.anchor, lastTournament, setLastTournament]);

  const upcoming = upcomingTournament(status, lastTournament);
  const guide = upcoming ? TOURNAMENT_GUIDES[upcoming] : undefined;

  /** Only the buildings this player has — the two barracks are mutually exclusive. */
  const ownedBuildings = useMemo(() => {
    const owned = new Set<TrainingBuilding>();
    armyDetails?.availableUnitTypeIds.forEach((id) => {
      const building = id.split('_')[0] as TrainingBuilding;
      if (BUILDING_ORDER.includes(building)) owned.add(building);
    });
    return owned;
  }, [armyDetails]);

  const suggestionsByBuilding = useMemo(() => {
    if (!guide) return [];

    const stock: Record<string, number> = {};
    armyDetails?.unitSquads.forEach((squad) => {
      stock[squad.unitTypeId] = (stock[squad.unitTypeId] || 0) + squad.size;
    });

    /** The highest-level unit the player has of this building and class. */
    const bestUnlocked = (building: TrainingBuilding, troopType: TroopType) => {
      const prefix = `${building}_${troopType}_`;
      const ids = (armyDetails?.availableUnitTypeIds || []).filter((id) => id.startsWith(prefix));
      return ids.sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)))[0];
    };

    return BUILDING_ORDER.filter((building) => ownedBuildings.has(building)).map((building) => ({
      building,
      suggestions: guide.training
        .filter((suggestion) => suggestion.building === building)
        .map<ResolvedSuggestion>((suggestion) => {
          const unitTypeId = bestUnlocked(building, suggestion.troopType);
          return {
            ...suggestion,
            unit: almanac.find((u) => u.unitTypeId === unitTypeId),
            held: unitTypeId ? stock[unitTypeId] || 0 : 0,
          };
        })
        .sort((a, b) => Number(b.primary) - Number(a.primary)),
    }));
  }, [guide, armyDetails, almanac, ownedBuildings]);

  if (!guide || !upcoming) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center', opacity: 0.8 }}>
        <EventBusyIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant='body1' color='text.secondary'>
          No tournament seen yet.
        </Typography>
        <Typography variant='caption' color='text.disabled'>
          Once one round has been observed, the rotation names the next.
        </Typography>
      </Box>
    );
  }

  const runningGuide = status.running ? TOURNAMENT_GUIDES[status.running.good] : undefined;

  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        pr: 1,
        '&::-webkit-scrollbar': { width: '6px' },
        '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '10px' },
      }}
    >
      {runningGuide && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography variant='caption' color='text.secondary'>
            Running now: <strong>{runningGuide.name}</strong>
          </Typography>
          {status.running?.remainingTime !== undefined && readAt !== undefined && (
            <Chip
              icon={<TimerIcon sx={{ fontSize: '14px !important' }} />}
              label={formatSeconds(Math.max(0, status.running.remainingTime - (now - readAt) / 1000))}
              size='small'
              variant='outlined'
              sx={{ height: 22, fontWeight: 'bold' }}
            />
          )}
        </Box>
      )}

      <Paper variant='outlined' sx={{ p: 1.5, px: 2, borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
            Up next: {guide.name}
          </Typography>
          <Chip label={`T${guide.tier}`} size='small' color='primary' sx={{ height: 20, fontWeight: 'bold' }} />
          {guide.difficulty && (
            <Typography variant='caption' color='text.secondary'>
              {guide.difficulty}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 1.5, opacity: 0.3 }} />

        <SectionLabel icon={<SecurityIcon sx={{ fontSize: 14 }} />} text='What you will face' />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
          {guide.dominant.map((troopType) => (
            <Box
              key={troopType}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.default',
                px: 0.75,
                height: 26,
              }}
            >
              <UnitSprite troopType={troopType} spriteUrl={spriteUrl} />
              <Typography variant='caption' sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                {TROOP_LABELS[troopType]}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant='caption' color='text.disabled' sx={{ mt: 0.5, display: 'block' }}>
          {guide.tier === 1
            ? 'One dominant enemy class.'
            : `${guide.tier === 2 ? 'Two' : 'Three'} dominant enemy classes, so keep a varied stock.`}
        </Typography>
      </Paper>

      <Paper variant='outlined' sx={{ p: 1.5, px: 2, mt: 1.5 }}>
        <SectionLabel icon={<ConstructionIcon sx={{ fontSize: 14 }} />} text='What to train' />
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {suggestionsByBuilding.map(({ building, suggestions }) => (
            <Box key={building}>
              <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700 }}>
                {BUILDING_LABELS[building]}
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {suggestions.map((suggestion) => (
                  <SuggestionRow
                    key={`${suggestion.building}-${suggestion.troopType}`}
                    suggestion={suggestion}
                    spriteUrl={spriteUrl}
                  />
                ))}
              </Stack>
            </Box>
          ))}
          {suggestionsByBuilding.length === 0 && (
            <Alert severity='info' sx={{ mt: 1 }}>
              Open the game so your army details load, and the suggestions will name your own units.
            </Alert>
          )}
        </Stack>
      </Paper>

      <Paper variant='outlined' sx={{ p: 1.5, px: 2, mt: 1.5, mb: 1 }}>
        <SectionLabel icon={<LightbulbOutlinedIcon sx={{ fontSize: 14 }} />} text='Battle tips' />
        <Stack component='ul' spacing={0.75} sx={{ mt: 1, pl: 2.5, mb: 0 }}>
          {guide.tips.map((tip, index) => (
            <Typography key={index} component='li' variant='caption' color='text.secondary'>
              {tip}
            </Typography>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
};

const SuggestionRow = ({ suggestion, spriteUrl }: { suggestion: ResolvedSuggestion; spriteUrl: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        border: '1px solid',
        borderColor: suggestion.primary ? 'primary.light' : 'divider',
        borderRadius: 1,
        px: 1,
        height: 28,
        opacity: suggestion.unit ? 1 : 0.6,
      }}
    >
      <UnitSprite troopType={suggestion.troopType} spriteUrl={spriteUrl} />
      <Typography variant='caption' sx={{ fontWeight: suggestion.primary ? 700 : 500 }}>
        {suggestion.unit?.name ?? TROOP_LABELS[suggestion.troopType]}
      </Typography>
      {!suggestion.unit && (
        <Tooltip title='Not unlocked yet' arrow>
          <Typography variant='caption' color='text.disabled'>
            (locked)
          </Typography>
        </Tooltip>
      )}
    </Box>

    {!suggestion.primary && (
      <Typography variant='caption' color='text.disabled' sx={{ fontStyle: 'italic' }}>
        alternate
      </Typography>
    )}

    {suggestion.unit && (
      <Typography variant='caption' color='text.secondary'>
        {suggestion.held.toLocaleString()} in stock
      </Typography>
    )}
  </Box>
);

const SectionLabel = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <Typography
    variant='caption'
    color='text.secondary'
    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'bold', textTransform: 'uppercase' }}
  >
    {icon} {text}
  </Typography>
);
