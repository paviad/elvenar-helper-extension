import { getBuildingFinder } from '../city/buildingFinder';
import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { getGoodsNames } from '../elvenar/getGoodsNames';
import { relayToGame } from '../inject/relayToGame';
import { CityEntity, CurrentProduct } from '../model/cityEntity';
import { formatResourceName } from '../util/formatResourceName';
import { pruneAutomations } from './automationEntry';
import { getAccountId, getOverlayStore } from './overlayStore';

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
 * through and clears everything below it. `optionId` is the option its entry asked for when this
 * began - changing it while monitoring runs starts the building over on the new one rather than
 * leaving it to finish out the old. `last` is the action already sent for this report, so one is
 * not sent twice over: the collect and the start go out a poll apart, which is what gives the
 * collect time to settle before the start (`localStartProduction` only starts an idle building).
 */
export interface WatchedBuilding {
  key: string;
  optionId: number;
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
  /** What the production yields, then the option's own name: `Marble (Marble)`, `supplies (Ropes)`. */
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
  /**
   * Whether the entries are being acted on. Held here and nowhere else, so it is gone on a
   * refresh: coming back to a page that is quietly driving the city is not something to inherit.
   */
  running: boolean;
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

/**
 * How the game's own ids read to a person - `marble` as `Marble`, `A_Evt_Bakery_3` as `Enchanted
 * Bakery`. Both come from balancing data the extension already keeps, and both fall back to the
 * id when it has no name for it, which is legible enough for the likes of `supplies`.
 *
 * Passed in rather than looked up here, so the grouping can be exercised without any storage.
 */
export interface ProductionNames {
  resource: (resourceId: string) => string;
  building: (cityEntityId: string, level: number) => string;
}

/**
 * What a production is called: what it yields - `Marble`, `Supplies` - and then the option's own
 * name, which is worth having too.
 *
 * The yields lead because they say the same thing for every building that makes the stuff, where
 * the option name is per building and per duration: a workshop's three options read `Beverages`,
 * `Toolbox`, `Ropes` for what is all the same supplies. `__class__` rides along in the revenue
 * dictionary and is not one of the resources.
 */
const productionName = (product: CurrentProduct | undefined, resourceName: (resourceId: string) => string) => {
  const yields = Object.keys(product?.revenue.resources ?? {}).filter((key) => key !== '__class__');
  const paysOut = yields.map(resourceName).join(' + ');
  const option = product?.name;
  return paysOut && option ? `${paysOut} (${option})` : paysOut || option;
};

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
export const groupProductions = (
  entities: CityEntity[],
  cityLoadedAt: number,
  now: number,
  names: ProductionNames,
): ProductionGroup[] => {
  const groups = new Map<string, ProductionGroup>();

  for (const entity of entities) {
    const kind = entity.state?.__class__;
    if (kind !== PRODUCING && kind !== FINISHED) {
      continue;
    }

    const product = entity.state?.current_product;
    const optionId = product?.production_option;
    const key = `${product?.asset_name ?? entity.cityentity_id}:${optionId ?? 'unknown'}`;
    const buildingKind = names.building(entity.cityentity_id, entity.level);

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: productionName(product, names.resource) ?? buildingKind,
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
    // By name, so a building's levels - which are separate ids - read as the one kind they are.
    if (!group.buildingKinds.includes(buildingKind)) {
      group.buildingKinds.push(buildingKind);
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

/**
 * The game's display names for its resources, from the balancing data the extension keeps.
 *
 * Held on to once they are there - they do not change while the game is open - but re-read until
 * then: the file they come from is fetched on the game's own schedule, so the first few polls of a
 * fresh profile can land before it has arrived.
 */
let goodsNames: Record<string, string> = {};

/**
 * The namers for one poll, from the balancing data behind both: goods for the resources, the
 * building catalog for the kinds. `getBuilding` rather than `getCityEntityExtraData`, which warns
 * about a building it cannot find - once would be fair, once every five seconds is not.
 */
const readNames = async (boostedGoods: string[]): Promise<ProductionNames> => {
  if (Object.keys(goodsNames).length === 0) {
    goodsNames = await getGoodsNames();
  }
  const finder = getBuildingFinder();
  await finder.ensureInitialized();

  return {
    resource: (resourceId) => formatResourceName(goodsNames, boostedGoods, resourceId),
    building: (cityEntityId, level) => finder.getBuilding(cityEntityId, level)?.name || cityEntityId,
  };
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

export interface ProductionContext {
  /**
   * Whether the building's catalog entry calls its production `ManualProductionVO` - the kind you
   * start by hand and collect when it is done, and the only kind there is anything to start.
   * Automatic ones run themselves, and queued and switchable ones are started another way
   * entirely. Collecting is not gated on this: whatever a building holds is worth taking.
   */
  manual: boolean;
  cityLoadedAt: number;
  now: number;
}

export const decide = (
  entity: CityEntity,
  entry: WatchedBuilding,
  { manual, cityLoadedAt, now }: ProductionContext,
): { action: Action; note: string } => {
  const kind = entity.state?.__class__;
  if (kind !== PRODUCING && kind !== FINISHED && kind !== IDLE) {
    return { action: 'none', note: `is ${kind ?? 'in no state'}` };
  }

  if (kind === PRODUCING && now < endsAtOf(entity, cityLoadedAt)) {
    return { action: 'none', note: 'producing' };
  }

  const toStart: { action: Action; note: string } = manual
    ? { action: 'start', note: 'ready to start' }
    : { action: 'none', note: 'not a manual production to start' };

  // The production is over, or the building was idle to begin with.
  if (!entry.last) {
    return kind === IDLE ? toStart : { action: 'pickup', note: 'ready to collect' };
  }

  // The collect has gone out, so try the start whatever the stored state still says: the game's
  // own model goes idle the moment the collect lands, well before it reports that back to us,
  // and `localStartProduction` passes over a building the game does not call idle anyway.
  if (entry.last.action === 'pickup') {
    return toStart;
  }

  if (now - entry.last.at < RETRY_AFTER_MS) {
    return { action: 'none', note: 'waiting for the game to report the new production' };
  }

  // Nothing came of it. Pick up again if the building is still holding a finished production,
  // otherwise start again - which costs nothing when the stock still cannot pay for it.
  return kind === IDLE
    ? manual
      ? { action: 'start', note: 'retrying the start' }
      : toStart
    : { action: 'pickup', note: 'retrying the collect' };
};

/**
 * Whether this building's production is one to start by hand, from the building catalog.
 *
 * A building the catalog does not cover, or one stored before the production class was captured,
 * reads as not manual and so is collected but never started. That is the safe way round: starting
 * something that runs itself is a request the game has no business receiving, where a start that
 * does not happen shows up in the tab as a building sitting there. The catalog fills in again on
 * the game's next load.
 */
const isManualProduction = (entity: CityEntity) =>
  // `sourceBuilding`, because `BuildingEx.production` is the summed-up revenue rather than the
  // catalog's own production block.
  getBuildingFinder().getBuilding(entity.cityentity_id, entity.level)?.sourceBuilding.production?.productionClass ===
  'ManualProductionVO';

/**
 * Drops from the stored entries any building the city does not have, so a sold building - or an
 * entry written against another city - does not sit there being reported missing every poll.
 */
const pruneStoredAutomations = (cityEntities: CityEntity[]) => {
  const store = getOverlayStore();
  if (!store) {
    return [];
  }
  const { productionAutomations, setProductionAutomations } = store.getState();
  const { entries, dropped } = pruneAutomations(productionAutomations, new Set(cityEntities.map((e) => e.id)));
  if (dropped.length > 0) {
    setProductionAutomations(entries);
    addLog(`Dropped ${dropped.length} building(s) the city no longer has: ${dropped.join(', ')}.`);
  }
  return entries;
};

const poll = async () => {
  const cityQuery = await readCity();
  if (!cityQuery) {
    setStatus({ summary: 'No city data stored yet - open the game and let it load.' });
    return;
  }

  const names = await readNames(cityQuery.boostedGoods);
  const now = Date.now();
  const groups = groupProductions(cityQuery.cityEntities, cityQuery.timestamp, now, names);
  const entries = pruneStoredAutomations(cityQuery.cityEntities);

  if (!status.running) {
    setStatus({ groups, groupsAt: now });
    return;
  }

  // One building belongs to one entry: the first that claims it wins, since it can only be
  // started on one option at a time.
  const jobs = new Map<number, number>();
  for (const entry of entries) {
    for (const id of entry.buildingIds) {
      if (!jobs.has(id)) {
        jobs.set(id, entry.optionId);
      }
    }
  }

  const toPickup: number[] = [];
  const toStart = new Map<number, number[]>();
  const notes = new Map<string, number>();
  let nextEndsAt: number | undefined;

  for (const [id, optionId] of jobs) {
    const entity = cityQuery.cityEntities.find((candidate) => candidate.id === id);
    if (!entity) {
      // Pruning has just run against this very city, so this cannot be a stale id.
      continue;
    }

    // One report of one state is one production to work through. Starting, collecting and
    // cancelling all make the game report the building again, which is what begins the next.
    const key = [
      reportedAt(entity, cityQuery.timestamp),
      entity.state?.__class__ ?? 'none',
      entity.state?.next_state_transition_in ?? 0,
    ].join(':');
    // The entries are read afresh every poll, so they can be edited while this runs. A building
    // whose entry now asks for a different option starts over on it rather than finishing out the
    // old one; an option sent a moment ago and not yet reported back is no reason to hold off,
    // since `localStartProduction` passes over a building the game does not call idle.
    const previous = watched.get(id);
    if (previous?.key !== key || previous.optionId !== optionId) {
      watched.set(id, { key, optionId });
    }
    const building = watched.get(id)!;

    const { action, note } = decide(entity, building, {
      manual: isManualProduction(entity),
      cityLoadedAt: cityQuery.timestamp,
      now,
    });
    notes.set(note, (notes.get(note) ?? 0) + 1);

    if (action === 'pickup') {
      toPickup.push(id);
      building.last = { action, at: now };
    } else if (action === 'start') {
      toStart.set(optionId, [...(toStart.get(optionId) ?? []), id]);
      building.last = { action, at: now };
    } else if (note === 'producing') {
      const endsAt = endsAtOf(entity, cityQuery.timestamp);
      nextEndsAt = Math.min(nextEndsAt ?? endsAt, endsAt);
    }
  }

  // Forget a building no entry claims any more, so deleting one while this runs does not leave
  // its buildings behind to be remembered for the life of the page.
  for (const id of watched.keys()) {
    if (!jobs.has(id)) {
      watched.delete(id);
    }
  }

  // The game batches pickups for a second into a single request, and `startProductions` takes a
  // whole list of buildings at once - so a round of either is one request per option, however
  // many buildings are behind it.
  for (const id of toPickup) {
    relayToGame('pickupProduction', id);
  }
  if (toPickup.length > 0) {
    addLog(`Collecting ${toPickup.length}: ${toPickup.join(', ')}.`);
  }
  for (const [optionId, ids] of toStart) {
    relayToGame('startProduction', { ids, optionId });
    addLog(`Starting option ${optionId} on ${ids.length}: ${ids.join(', ')}.`);
  }

  const summary = [...notes.entries()].map(([note, count]) => `${count} ${note}`).join(', ');

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

/** Start acting on every stored entry. Nothing about this survives a refresh, deliberately. */
export const startProductionWatch = (entryCount: number, buildingCount: number) => {
  stopProductionWatch();
  watched.clear();
  status = { ...status, running: true, summary: 'Checking...', nextEndsAt: undefined };
  addLog(`Monitoring ${entryCount} automation(s), ${buildingCount} building(s), every ${PRODUCTION_POLL_MS / 1000}s.`);
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
