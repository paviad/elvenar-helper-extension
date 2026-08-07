import React, { useEffect, useMemo, useState } from 'react';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { getBattleUnitTypes } from '../elvenar/getBattleUnitTypes';
import { ArmyDetails } from '../model/armyDetails';
import { BattleUnitType } from '../model/battleUnitType';
import { SeasonalEvent } from '../model/seasonalEvent';
import { getAccountId, getOverlayStore } from './overlayStore';
import { TOURNAMENT_GUIDES } from './tournamentGuide';
import { readTournamentStatus, upcomingTournament } from './tournamentSchedule';
import { TournamentBriefing } from './TournamentBriefing';
import { resolveTrainingSuggestions } from './trainingSuggestions';

type Which = 'running' | 'upcoming';

/**
 * The guide's briefing for the tournament being fought and the one coming up.
 *
 * The rotation is fixed, so the tournament that just ended names the upcoming one; the running one
 * the game reports directly. Both get the same briefing, so the difference is only which guide and
 * whether there is a countdown.
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
  const [now, setNow] = useState(() => Date.now());
  const [chosen, setChosen] = useState<Which | undefined>(undefined);

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
        console.error('ElvenAssist: Failed to load the battle unit almanac:', err);
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

  const runningGuide = status.running ? TOURNAMENT_GUIDES[status.running.good] : undefined;
  const upcoming = upcomingTournament(status, lastTournament);
  const upcomingGuide = upcoming ? TOURNAMENT_GUIDES[upcoming] : undefined;

  // Whichever the player picked, falling back to the round in progress since that is the one
  // they can act on today.
  const which: Which = chosen ?? (runningGuide ? 'running' : 'upcoming');
  const guide = which === 'running' ? runningGuide : upcomingGuide;

  const suggestionsByBuilding = useMemo(
    () => resolveTrainingSuggestions(guide, armyDetails, almanac),
    [guide, armyDetails, almanac],
  );

  if (!runningGuide && !upcomingGuide) {
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

  const remainingSeconds =
    which === 'running' && status.running?.remainingTime !== undefined && readAt !== undefined
      ? Math.max(0, status.running.remainingTime - (now - readAt) / 1000)
      : undefined;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ToggleButtonGroup
        exclusive
        size='small'
        value={which}
        onChange={(_, next: Which | null) => next && setChosen(next)}
        sx={{ mb: 1.5, alignSelf: 'flex-start', '& .MuiToggleButton-root': { px: 1.5, py: 0.25, fontSize: '0.7rem' } }}
      >
        <ToggleButton value='running' disabled={!runningGuide}>
          {runningGuide ? `Running: ${runningGuide.name}` : 'Running'}
        </ToggleButton>
        <ToggleButton value='upcoming' disabled={!upcomingGuide}>
          {upcomingGuide ? `Up next: ${upcomingGuide.name}` : 'Up next'}
        </ToggleButton>
      </ToggleButtonGroup>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          pr: 1,
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '10px' },
        }}
      >
        {guide ? (
          <TournamentBriefing
            guide={guide}
            eyebrow={which === 'running' ? 'Running now' : 'Up next'}
            remainingSeconds={remainingSeconds}
            suggestionsByBuilding={suggestionsByBuilding}
            spriteUrl={spriteUrl}
          />
        ) : (
          <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
            No tournament is running at the moment.
          </Typography>
        )}
      </Box>
    </Box>
  );
};
