import { ElvenarRequestResponseEntry } from '../../model/elvenarRequestResponseEntry';
import { cityRefusal, readGameState } from '../gameState';
import { createEventChestClock, EventChestMessage } from './eventChestTiming';

const CURRENCY_EVENT = 'currency_event';

/**
 * How long after the city first comes up a chest still counts as one that was there at load.
 * The game asks for the outstanding chests (`TreasureService.refresh`) the moment it enters the
 * city, and the answer lands within seconds; a chest spawning for real this early is rare enough
 * that losing it costs one interval.
 */
const LOAD_GRACE_MS = 30_000;

const WATCH_MS = 1000;

/**
 * The event chests the game had on the map just before the latest push.
 *
 * `spawnTreasure` is not news of a spawn: it lists every chest still outstanding, and the game
 * asks for that list again each time it comes back to the city. Only a push listing more than
 * were already there is a new chest. The count has to be taken beforehand, because whether the
 * game has applied the push by the time this handler sees it depends on listener order on the
 * socket - so it is sampled every second instead of read on arrival.
 */
let onMap = 0;
let readyAt: number | undefined;
const clock = createEventChestClock();

const chestsOnMap = () => {
  try {
    return window.aviad_tv.getTreasures(CURRENCY_EVENT).length;
  } catch {
    // Not captured yet: the game has no chests to show before it has a city either.
    return 0;
  }
};

export const startWatchingEventChests = () =>
  setInterval(() => {
    onMap = chestsOnMap();
    if (readyAt === undefined && !cityRefusal(readGameState())) {
      readyAt = Date.now();
    }
  }, WATCH_MS);

export const localTimeEventChests = (json: ElvenarRequestResponseEntry[]): Promise<void> => {
  for (const response of json) {
    const treasures = response.responseData as { type?: string }[] | undefined;
    const listed = Array.isArray(treasures) ? treasures.filter((t) => t?.type === CURRENCY_EVENT).length : 0;
    const spawned = listed - onMap;
    onMap = listed;
    if (spawned <= 0) {
      continue;
    }

    const now = Date.now();
    const arrival = clock(now, readyAt === undefined || now - readyAt < LOAD_GRACE_MS);
    console.log('event chest:', arrival.outcome, arrival.ms !== undefined ? `${Math.round(arrival.ms / 1000)}s` : '');
    window.postMessage({ type: 'eventChest', payload: arrival } satisfies EventChestMessage, '*');
  }
  return Promise.resolve();
};
