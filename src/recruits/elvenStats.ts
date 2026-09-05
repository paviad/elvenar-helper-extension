import { ELVENSTATS_HISTORY_DAYS, ElvenStatsReading, FellowshipChange, MAX_FELLOWSHIP_CHANGES } from './recruitBook';

/**
 * ElvenStats (elvenstats.com) scans cities every few hours and keeps each player's score history.
 * The site has run unattended for years with nobody to ask, so it is used gently - one player at
 * a time, slowly, cached for a day - and the first answer that does not fit stops the lookups
 * until someone has looked, since a changed or failing site is not one to keep asking.
 */

/** The player's page on ElvenStats, for opening in a tab. `server` is the game world, e.g. `en3`. */
export const elvenStatsPlayerUrl = (server: string, playerId: number) =>
  `https://www.elvenstats.com/player/${server}/${playerId}`;

/** The read-only JSON their own player page loads. */
export const elvenStatsApiUrl = (server: string, playerId: number) =>
  `https://www.elvenstats.com/api/player/${server}/${playerId}`;

/** What we read from their answer; everything else in it is left alone. */
interface ElvenStatsPlayer {
  playerId?: number;
  username?: string;
  fellowship?: string;
  fellowshipId?: number;
  currScore?: number;
  scoreHistory?: { date?: string; score?: number }[];
  updatedDate?: string;
  isActive?: boolean;
  technologySection?: number;
  lastScoreChange?: string;
  createdAt?: string;
  fellowshipHistory?: { name?: string | null; fellowshipId?: number | null; date?: string }[];
}

/** An answer that does not have the shape the lookup was written against. */
export class ElvenStatsShapeError extends Error {}

const time = (iso: string | undefined) => {
  const at = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(at) ? at : undefined;
};

export interface ParsedElvenStats {
  reading: ElvenStatsReading;
  name?: string;
  chapter?: number;
  /** `null` when ElvenStats has them in no fellowship. */
  guild?: { id: number; name?: string } | null;
}

/**
 * Reads an answer from the player API. An empty body is how ElvenStats answers for a player it
 * does not track. Anything else that is not the player it was asked about throws
 * {@link ElvenStatsShapeError}.
 */
export const parseElvenStats = (body: string, playerId: number, checkedAt: number): ParsedElvenStats => {
  if (!body.trim()) {
    return { reading: { checkedAt, found: false } };
  }
  let player: ElvenStatsPlayer;
  try {
    player = JSON.parse(body) as ElvenStatsPlayer;
  } catch {
    throw new ElvenStatsShapeError('The answer is not JSON');
  }
  if (!player || typeof player !== 'object' || Array.isArray(player)) {
    throw new ElvenStatsShapeError('The answer is not a player record');
  }
  if (Number(player.playerId) !== playerId) {
    throw new ElvenStatsShapeError(`The answer is for player ${player.playerId}, not ${playerId}`);
  }
  const updatedAt = time(player.updatedDate);
  if (updatedAt === undefined || !Array.isArray(player.scoreHistory)) {
    throw new ElvenStatsShapeError('The answer has no updatedDate or no scoreHistory');
  }

  const keepFrom = checkedAt - ELVENSTATS_HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const history = player.scoreHistory
    .map((entry) => ({ at: time(entry?.date), score: entry?.score }))
    .filter(
      (entry): entry is { at: number; score: number } => entry.at !== undefined && typeof entry.score === 'number',
    )
    .filter((entry) => entry.at >= keepFrom)
    .sort((a, b) => a.at - b.at);

  return {
    reading: {
      checkedAt,
      found: true,
      updatedAt,
      isActive: typeof player.isActive === 'boolean' ? player.isActive : undefined,
      lastScoreChange: time(player.lastScoreChange),
      score: typeof player.currScore === 'number' ? player.currScore : undefined,
      history,
      trackedSince: time(player.createdAt),
      fellowships: Array.isArray(player.fellowshipHistory)
        ? player.fellowshipHistory
            .flatMap((entry): FellowshipChange[] => {
              const at = time(entry?.date);
              if (at === undefined) {
                return [];
              }
              return [
                entry.fellowshipId
                  ? { at, id: entry.fellowshipId, name: entry.name || undefined }
                  : { at, id: undefined, name: undefined },
              ];
            })
            .sort((a, b) => a.at - b.at)
            .slice(-MAX_FELLOWSHIP_CHANGES)
        : undefined,
    },
    name: player.username,
    chapter: typeof player.technologySection === 'number' ? player.technologySection : undefined,
    guild: player.fellowshipId ? { id: player.fellowshipId, name: player.fellowship || undefined } : null,
  };
};

/** Fetches one player's record. Throws on anything but a 200, leaving the reading to the caller. */
export const fetchElvenStats = async (server: string, playerId: number) => {
  const response = await fetch(elvenStatsApiUrl(server, playerId), { credentials: 'omit', cache: 'no-store' });
  const body = await response.text();
  if (!response.ok) {
    throw Object.assign(new Error(`ElvenStats answered HTTP ${response.status}`), { body: body.slice(0, 1000) });
  }
  return body;
};

/** Their "refresh now" endpoint, the one behind the sync icon next to "Last Updated". */
export const elvenStatsRefreshUrl = (server: string, playerId: number) =>
  `https://www.elvenstats.com/api/player/${server}/${playerId}/refresh`;

/** How long a refresh gets. ElvenStats reads the city from the game while we wait. */
export const ELVENSTATS_REFRESH_TIMEOUT_MS = 90 * 1000;

/**
 * Asks ElvenStats to rescan one player now, and waits for it: the answer comes back once the scan
 * is done. Resolves to why it did not happen when ElvenStats says so - `{ error, isIgnored }`,
 * which their own page reads the same way - and throws on a failed request.
 */
export const requestElvenStatsRefresh = async (server: string, playerId: number): Promise<string | undefined> => {
  const response = await fetch(elvenStatsRefreshUrl(server, playerId), {
    method: 'PUT',
    credentials: 'omit',
    cache: 'no-store',
    signal: AbortSignal.timeout(ELVENSTATS_REFRESH_TIMEOUT_MS),
  });
  const body = await response.text();
  // How they answer for a player they have never scanned: a 404 saying so, which is an answer
  // about the player, not a sign of the site going wrong.
  if (response.status === 404 && /unable to find user/i.test(body)) {
    return "ElvenStats doesn't know this player";
  }
  if (!response.ok) {
    throw Object.assign(new Error(`ElvenStats refresh answered HTTP ${response.status}`), {
      body: body.slice(0, 1000),
    });
  }
  let answer: { error?: unknown; isIgnored?: boolean; message?: string } | undefined;
  try {
    answer = body.trim() ? (JSON.parse(body) as typeof answer) : undefined;
  } catch {
    throw Object.assign(new Error('ElvenStats refresh answered with something that is not JSON'), {
      body: body.slice(0, 1000),
    });
  }
  if (answer?.error) {
    return answer.isIgnored
      ? 'ElvenStats no longer tracks this player'
      : `ElvenStats could not refresh: ${answer.message || describeError(answer.error)}`;
  }
  return undefined;
};

const describeError = (error: unknown) => (typeof error === 'string' ? error : JSON.stringify(error));
