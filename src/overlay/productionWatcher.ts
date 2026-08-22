import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { relayToGame } from '../inject/relayToGame';
import { CityEntity } from '../model/cityEntity';
import { getAccountId } from './overlayStore';

/** How often the stored city data is re-read and the production timers checked. */
export const PRODUCTION_POLL_MS = 5000;

/** The game's own names for the states a manual production moves through. */
const PRODUCING = 'ProducingVO';
const FINISHED = 'ProductionFinishedVO';
const IDLE = 'IdleVO';

/**
 * Where the watcher has got to with one building.
 *
 * `key` is the state the game last reported it in; a new report is a new production to work
 * through and clears everything below it. `last` is the action already sent for this report, so
 * one is not sent twice over - the collect and the start go out a poll apart, which is what gives
 * the collect time to settle before the start (`localStartProduction` only starts an idle
 * building).
 */
export interface WatchedBuilding {
  key: string;
  last?: { action: 'pickup' | 'start'; at: number };
}

export interface ProductionLogEntry {
  at: number;
  text: string;
}

/** One product being made one way, and every building in the city making it. */
export interface ProductionGroup {
  /** `<asset name>:<option id>` - what makes two lines different things. */
  key: string;
  /** The product's own name, as the game reports it: `Beverages`, `Marble`, ... */
  name: string;
  /**
   * What to start it again with. Absent when the reported state carries no product to read it
   * from, in which case the tab leaves the field empty rather than guessing at one.
   */
  optionId?: number;
  /** Seconds the option takes, as reported. */
  productionTime?: number;
  /** The building kinds making it, so two lines of the same product can be told apart. */
  buildingKinds: string[];
  buildingIds: number[];
  /** How many are done and waiting to be collected, and how many are still running. */
  finished: number;
  producing: number;
  /** Soonest one due, absolute. Absent when they are all finished already. */
  nextEndsAt?: number;
}

export interface ProductionWatchStatus {
  running: boolean;
  buildingIds: number[];
  optionId?: number;
  /** What the last poll made of the watched buildings. Replaced every poll. */
  summary: string;
  /** What the city has in production, by product. Refreshed with every read. */
  groups: ProductionGroup[];
  /** When those groups were read. */
  groupsAt?: number;
  /** Soonest production due among the watched buildings. */
  nextEndsAt?: number;
  log: ProductionLogEntry[];
}

/** When the game last reported this building - what its countdown counts from. */
const reportedAt = (entity: CityEntity, cityLoadedAt: number) => entity.stateAt ?? cityLoadedAt;

const endsAtOf = (entity: CityEntity, cityLoadedAt: number) =>
  reportedAt(entity, cityLoadedAt) + (entity.state?.next_state_transition_in ?? 0) * 1000;

/**
 * The city's productions gathered into one line per product, finished or still running.
 *
 * Buildings of different kinds and levels making the same thing the same way belong on one line:
 * that is exactly the set `startProductions` takes in a single call.
 */
export const groupProductions = (entities: CityEntity[], cityLoadedAt: number, now: number): ProductionGroup[] => {
  const groups = new Map<string, ProductionGroup>();

  for (const entity of entities) {
    const kind = entity.state?.__class__;
    if (kind !== PRODUCING && kind !== FINISHED) {
      continue;
    }

    const product = entity.state?.current_product;
    const optionId = product?.production_option;
    const key = `${product?.asset_name ?? entity.cityentity_id}:${optionId ?? 'unknown'}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: product?.name ?? entity.cityentity_id,
        optionId,
        productionTime: product?.production_time,
        buildingKinds: [],
        buildingIds: [],
        finished: 0,
        producing: 0,
      };
      groups.set(key, group);
    }

    group.buildingIds.push(entity.id);
    if (!group.buildingKinds.includes(entity.cityentity_id)) {
      group.buildingKinds.push(entity.cityentity_id);
    }

    // A production whose countdown has run out is finished whatever the last report called it:
    // the game only says so once the collect happens, and the timer runs on in the client.
    const endsAt = endsAtOf(entity, cityLoadedAt);
    if (kind === FINISHED || endsAt <= now) {
      group.finished += 1;
    } else {
      group.producing += 1;
      group.nextEndsAt = Math.min(group.nextEndsAt ?? endsAt, endsAt);
    }
  }

  // What is ready to collect first, then whatever comes back soonest.
  return [...groups.values()].sort((a, b) => {
    if (a.finished > 0 !== b.finished > 0) {
      return a.finished > 0 ? -1 : 1;
    }
    return (a.nextEndsAt ?? Infinity) - (b.nextEndsAt ?? Infinity);
  });
};

const idleStatus = (): ProductionWatchStatus => ({
  running: false,
  buildingIds: [],
  summary: 'Not monitoring.',
  groups: [],
  log: [],
});

let status: ProductionWatchStatus = idleStatus();
let timer: ReturnType<typeof setInterval> | null = null;
let polling = false;

const watched = new Map<number, WatchedBuilding>();

const listeners = new Set<(status: ProductionWatchStatus) => void>();

export const subscribeToProductionWatch = (listener: (status: ProductionWatchStatus) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getProductionWatchStatus = () => status;

const publish = () => {
  listeners.forEach((listener) => listener(status));
};

const setStatus = (patch: Partial<ProductionWatchStatus>) => {
  status = { ...status, ...patch };
  publish();
};

/** A running commentary of what was sent to the game, newest first and capped. */
const addLog = (text: string) => {
  status = { ...status, log: [{ at: Date.now(), text }, ...status.log].slice(0, 50) };
};

/** The stored city, re-read: the service worker writes it away as the game reports it. */
const readCity = async () => {
  const accountId = getAccountId();
  if (!accountId) {
    return undefined;
  }
  await loadSingleAccountFromStorage(accountId, true);
  const cityQuery = getAccountById(accountId)?.cityQuery;
  return cityQuery?.cityEntities ? cityQuery : undefined;
};

/** What one watched building needs next. */
type Action = 'pickup' | 'start' | 'none';

/**
 * How long a building may sit on the same reported state after being sent an action before it is
 * sent one again. A start that went out is normally reported back within a second or two, so a
 * state that has not budged in this long is one where nothing happened - most often a start the
 * stock could not pay for, since `localStartProduction` stops at the first building it cannot
 * afford and says nothing about the rest.
 */
const RETRY_AFTER_MS = 3 * PRODUCTION_POLL_MS;

export const decide = (
  entity: CityEntity,
  entry: WatchedBuilding,
  cityLoadedAt: number,
  now: number,
): { action: Action; note: string } => {
  const kind = entity.state?.__class__;
  if (kind !== PRODUCING && kind !== FINISHED && kind !== IDLE) {
    return { action: 'none', note: `is ${kind ?? 'in no state'}` };
  }

  if (kind === PRODUCING && now < endsAtOf(entity, cityLoadedAt)) {
    return { action: 'none', note: 'producing' };
  }

  // The production is over, or the building was idle to begin with.
  if (!entry.last) {
    return kind === IDLE ? { action: 'start', note: 'ready to start' } : { action: 'pickup', note: 'ready to collect' };
  }

  // The collect has gone out, so try the start whatever the stored state still says: the game's
  // own model goes idle the moment the collect lands, well before it reports that back to us,
  // and `localStartProduction` passes over a building the game does not call idle anyway.
  if (entry.last.action === 'pickup') {
    return { action: 'start', note: 'ready to start' };
  }

  if (now - entry.last.at < RETRY_AFTER_MS) {
    return { action: 'none', note: 'waiting for the game to report the new production' };
  }

  // Nothing came of it. Pick up again if the building is still holding a finished production,
  // otherwise start again - which costs nothing when the stock still cannot pay for it.
  return kind === IDLE
    ? { action: 'start', note: 'retrying the start' }
    : { action: 'pickup', note: 'retrying the collect' };
};

const poll = async () => {
  const cityQuery = await readCity();
  if (!cityQuery) {
    setStatus({ summary: 'No city data stored yet - open the game and let it load.' });
    return;
  }

  const now = Date.now();
  const groups = groupProductions(cityQuery.cityEntities, cityQuery.timestamp, now);

  const { buildingIds, optionId, running } = status;
  if (!running || optionId === undefined || buildingIds.length === 0) {
    setStatus({ groups, groupsAt: now });
    return;
  }

  const toPickup: number[] = [];
  const toStart: number[] = [];
  const notes = new Map<string, number>();
  let missing = 0;
  let nextEndsAt: number | undefined;

  for (const id of buildingIds) {
    const entity = cityQuery.cityEntities.find((candidate) => candidate.id === id);
    if (!entity) {
      missing += 1;
      continue;
    }

    // One report of one state is one production to work through. Starting, collecting and
    // cancelling all make the game report the building again, which is what begins the next.
    const key = [
      reportedAt(entity, cityQuery.timestamp),
      entity.state?.__class__ ?? 'none',
      entity.state?.next_state_transition_in ?? 0,
    ].join(':');
    if (watched.get(id)?.key !== key) {
      watched.set(id, { key });
    }
    const entry = watched.get(id)!;

    const { action, note } = decide(entity, entry, cityQuery.timestamp, now);
    notes.set(note, (notes.get(note) ?? 0) + 1);

    if (action === 'pickup') {
      toPickup.push(id);
      entry.last = { action, at: now };
    } else if (action === 'start') {
      toStart.push(id);
      entry.last = { action, at: now };
    } else if (note === 'producing') {
      const endsAt = endsAtOf(entity, cityQuery.timestamp);
      nextEndsAt = Math.min(nextEndsAt ?? endsAt, endsAt);
    }
  }

  // The game batches pickups for a second into a single request, and `startProductions` takes the
  // whole list of buildings at once - so a round of either is one request however many there are.
  for (const id of toPickup) {
    relayToGame('pickupProduction', id);
  }
  if (toPickup.length > 0) {
    addLog(`Collecting ${toPickup.length}: ${toPickup.join(', ')}.`);
  }
  if (toStart.length > 0) {
    relayToGame('startProduction', { ids: toStart, optionId });
    addLog(`Starting option ${optionId} on ${toStart.length}: ${toStart.join(', ')}.`);
  }

  const summary = [...notes.entries()]
    .map(([note, count]) => `${count} ${note}`)
    .concat(missing > 0 ? [`${missing} not in the stored city`] : [])
    .join(', ');

  setStatus({ groups, groupsAt: now, nextEndsAt, summary: summary || 'Nothing to watch.' });
};

const runPoll = () => {
  // Storage reads are async, so a slow one must not have the next tick land on top of it.
  if (polling) {
    return;
  }
  polling = true;
  void poll().finally(() => {
    polling = false;
  });
};

/** Read the city once. Acts on it only while monitoring - otherwise it just refreshes the list. */
export const refreshProductions = () => {
  runPoll();
};

export const startProductionWatch = (buildingIds: number[], optionId: number) => {
  stopProductionWatch();
  watched.clear();
  status = { ...status, running: true, buildingIds, optionId, summary: 'Checking...', nextEndsAt: undefined };
  const plural = buildingIds.length === 1 ? '' : 's';
  addLog(
    `Monitoring ${buildingIds.length} building${plural} for option ${optionId}, every ${PRODUCTION_POLL_MS / 1000}s.`,
  );
  publish();
  runPoll();
  timer = setInterval(runPoll, PRODUCTION_POLL_MS);
};

export const stopProductionWatch = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (!status.running) {
    return;
  }
  addLog('Monitoring stopped.');
  setStatus({ running: false, summary: 'Not monitoring.', nextEndsAt: undefined });
};
