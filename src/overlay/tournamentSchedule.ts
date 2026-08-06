import { SeasonalEvent } from '../model/seasonalEvent';
import { isTournamentGood, nextTournament, TournamentGood } from './tournamentGuide';

/** States the game uses for a tournament event. Anything else means it is not in play. */
const RUNNING_STATES = ['running', 'new'];
const ENDED_STATE = 'last';

export interface TournamentStatus {
  /** The tournament in play right now, if any. */
  running?: { good: TournamentGood; remainingTime?: number };
  /** The one that has just finished, as the game reports it. */
  ended?: TournamentGood;
  /**
   * The most recent tournament of the two, and so the one the rotation counts forward from.
   * Undefined when the startup data mentions no tournament at all.
   */
  anchor?: TournamentGood;
}

/**
 * Reads the tournament rotation out of the seasonal events in startup data.
 *
 * The events carry the good in `subType` (`magic_dust`, `gems`, ...) and mark the current one
 * `running` and the previous one `last`, which is all the rotation needs.
 */
export const readTournamentStatus = (events: SeasonalEvent[] | undefined): TournamentStatus => {
  const tournaments = (events || []).filter((event) => isTournamentGood(event.subType));

  const runningEvent = tournaments.find((event) => RUNNING_STATES.includes(event.state));
  const endedEvent = tournaments.find((event) => event.state === ENDED_STATE);

  const running = runningEvent
    ? { good: runningEvent.subType as TournamentGood, remainingTime: runningEvent.remainingTime }
    : undefined;
  const ended = endedEvent ? (endedEvent.subType as TournamentGood) : undefined;

  return { running, ended, anchor: running?.good ?? ended };
};

/**
 * The tournament to prepare for, counted forward from the last one seen.
 *
 * `remembered` is the anchor kept from previous sessions, so the answer survives a startup
 * response that mentions no tournament — between rounds, for instance.
 */
export const upcomingTournament = (
  status: TournamentStatus,
  remembered: TournamentGood | undefined,
): TournamentGood | undefined => {
  const anchor = status.anchor ?? remembered;
  return anchor ? nextTournament(anchor) : undefined;
};
