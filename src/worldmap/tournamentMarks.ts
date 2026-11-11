import { SeasonalEvent } from '../model/seasonalEvent';
import { nextTournament, TournamentGood } from '../overlay/tournamentGuide';
import { readTournamentStatus } from '../overlay/tournamentSchedule';

export interface TournamentMarks {
  /** The good of the tournament in play, if one is. */
  current?: TournamentGood;
  /** The good of the tournament after it, or after the one that last ended. */
  next?: TournamentGood;
}

/**
 * Which goods the current and the next tournament are fought over, from the events the game sent
 * at startup. `readAt` is when it sent them: a tournament whose time has run out since is no
 * longer the current one, though the rotation is still counted from it.
 */
export const tournamentMarks = (
  events: SeasonalEvent[] | undefined,
  readAt: number | undefined,
  now: number,
): TournamentMarks => {
  const { running, anchor } = readTournamentStatus(events);
  const over =
    running?.remainingTime !== undefined && readAt !== undefined && readAt + running.remainingTime * 1000 <= now;
  return {
    current: running && !over ? running.good : undefined,
    next: anchor ? nextTournament(anchor) : undefined,
  };
};
