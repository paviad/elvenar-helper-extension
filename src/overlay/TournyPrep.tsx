import React, { useEffect, useMemo, useState } from 'react';
import ConstructionIcon from '@mui/icons-material/Construction';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import SecurityIcon from '@mui/icons-material/Security';
import TimerIcon from '@mui/icons-material/Timer';
import { Alert, Box, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { getBattleUnitTypes } from '../elvenar/getBattleUnitTypes';
import { ArmyDetails, TrainingBuilding, TroopType } from '../model/armyDetails';
import { BattleUnitType } from '../model/battleUnitType';
import { SeasonalEvent } from '../model/seasonalEvent';
import { getAccountId, getOverlayStore } from './overlayStore';
import { TOURNAMENT_GUIDES, TrainingSuggestion } from './tournamentGuide';
import { readTournamentStatus, upcomingTournament } from './tournamentSchedule';
import { TournamentTips } from './TournamentTips';
import {
  BUILDING_LABELS,
  formatSeconds,
  SectionLabel,
  TIER_COLORS,
  TierColor,
  TROOP_LABELS,
  UnitSprite,
} from './tournyUnitDisplay';

/** The order buildings are listed in, matching how the guide presents its suggestions. */
const BUILDING_ORDER: TrainingBuilding[] = ['eb', 'hb', 'tg', 'mc'];

const TIER_BLURBS: Record<1 | 2 | 3, string> = {
  1: 'One dominant enemy class',
  2: 'Two dominant enemy classes — keep a varied stock',
  3: 'Three dominant enemy classes — keep a varied stock',
};

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
  const accent = TIER_COLORS[guide.tier];

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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1.5,
            px: 1.25,
            py: 0.75,
            borderRadius: 1,
            bgcolor: 'action.hover',
            flexWrap: 'wrap',
          }}
        >
          <TimerIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
          <Typography variant='caption' color='text.secondary'>
            {runningGuide.name} is running
          </Typography>
          {status.running?.remainingTime !== undefined && readAt !== undefined && (
            <Typography variant='caption' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {formatSeconds(Math.max(0, status.running.remainingTime - (now - readAt) / 1000))} left
            </Typography>
          )}
        </Box>
      )}

      <Paper variant='outlined' sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderLeft: '4px solid',
            borderLeftColor: `${accent}.main`,
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(theme.palette[accent].main, 0.14)}, ${alpha(
                theme.palette[accent].main,
                0.02,
              )})`,
          }}
        >
          <Typography
            variant='caption'
            sx={{ letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700, color: `${accent}.dark` }}
          >
            Up next
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant='h5' sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {guide.name}
            </Typography>
            <Chip
              label={`Tier ${guide.tier}`}
              size='small'
              color={accent}
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
            />
          </Box>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.25 }}>
            {guide.difficulty ? `${guide.difficulty} · ${TIER_BLURBS[guide.tier]}` : TIER_BLURBS[guide.tier]}
          </Typography>
        </Box>

        <Box sx={{ px: 2, py: 1.5 }}>
          <SectionLabel icon={<SecurityIcon sx={{ fontSize: 14 }} />} text='What you will face' />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            {guide.dominant.map((troopType) => (
              <Box
                key={troopType}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  border: '1px solid',
                  borderColor: (theme) => alpha(theme.palette[accent].main, 0.4),
                  bgcolor: (theme) => alpha(theme.palette[accent].main, 0.07),
                  borderRadius: 1,
                  px: 1,
                  height: 32,
                }}
              >
                <UnitSprite troopType={troopType} spriteUrl={spriteUrl} />
                <Typography variant='caption' sx={{ fontWeight: 700 }}>
                  {TROOP_LABELS[troopType]}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      <Paper variant='outlined' sx={{ p: 1.5, px: 2, mt: 1.5 }}>
        <SectionLabel icon={<ConstructionIcon sx={{ fontSize: 14 }} />} text='What to train' />
        {suggestionsByBuilding.length === 0 ? (
          <Alert severity='info' sx={{ mt: 1 }}>
            Open the game so your army details load, and the suggestions will name your own units.
          </Alert>
        ) : (
          <Stack spacing={1.75} sx={{ mt: 1.25 }}>
            {suggestionsByBuilding.map(({ building, suggestions }) => (
              <Box key={building}>
                <Typography
                  variant='caption'
                  sx={{
                    display: 'block',
                    mb: 0.75,
                    pl: 1,
                    borderLeft: '3px solid',
                    borderLeftColor: `${accent}.light`,
                    fontWeight: 800,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  {BUILDING_LABELS[building]}
                </Typography>
                <Stack spacing={0.5}>
                  {suggestions.map((suggestion) => (
                    <SuggestionRow
                      key={`${suggestion.building}-${suggestion.troopType}`}
                      suggestion={suggestion}
                      spriteUrl={spriteUrl}
                      accent={accent}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <TournamentTips guide={guide} sx={{ mt: 1.5, mb: 1 }} />
    </Box>
  );
};

const SuggestionRow = ({
  suggestion,
  spriteUrl,
  accent,
}: {
  suggestion: ResolvedSuggestion;
  spriteUrl: string;
  accent: TierColor;
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      px: 1,
      py: 0.5,
      borderRadius: 1,
      border: '1px solid',
      borderColor: suggestion.primary ? (theme) => alpha(theme.palette[accent].main, 0.35) : 'transparent',
      bgcolor: suggestion.primary ? (theme) => alpha(theme.palette[accent].main, 0.06) : 'transparent',
      opacity: suggestion.unit ? 1 : 0.55,
    }}
  >
    <UnitSprite troopType={suggestion.troopType} spriteUrl={spriteUrl} />

    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
      <Typography
        variant='caption'
        sx={{ display: 'block', fontWeight: suggestion.primary ? 700 : 500, lineHeight: 1.3 }}
      >
        {suggestion.unit?.name ?? TROOP_LABELS[suggestion.troopType]}
      </Typography>
      <Typography variant='caption' color='text.disabled' sx={{ fontSize: '0.6rem' }}>
        {TROOP_LABELS[suggestion.troopType]}
        {!suggestion.primary && ' · alternate'}
      </Typography>
    </Box>

    {suggestion.unit ? (
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
      >
        <strong>{suggestion.held.toLocaleString()}</strong> in stock
      </Typography>
    ) : (
      <Tooltip title='Not unlocked yet' arrow>
        <Typography variant='caption' color='text.disabled' sx={{ whiteSpace: 'nowrap' }}>
          locked
        </Typography>
      </Tooltip>
    )}
  </Box>
);

