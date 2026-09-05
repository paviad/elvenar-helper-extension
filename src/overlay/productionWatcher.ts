import { getBuildingFinder } from '../city/buildingFinder';
import { getAccountById, loadAccount } from '../elvenar/accountStore';
import { getGoodsNames } from '../elvenar/getGoodsNames';
import { cityRefusal } from '../inject/gameState';
import { relayToGame } from '../inject/relayToGame';
import { CityEntity, CurrentProduct } from '../model/cityEntity';
import { formatResourceName } from '../util/formatResourceName';
import { AutomationEntry, dedupeAutomations, pruneAutomations } from './automationEntry';
import { getGameState } from './gameStateWatch';
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

/** One kind of building running one production, and every one of them in the city. */
export interface ProductionGroup {
  /** `<base name>:<option id>` - what makes two lines different things. */
  key: string;
  /**
   * What one collection off it brings in, and the option running: `Marble`, `supplies
   * (Beverages)`. What the line is about - the building is which building is making it.
   * Falls back to the building's name when the reported state says nothing about a product.
   */
  name: string;
  /** The building's display name: `Workshop`, `Enchanted Bakery`. */
  building: string;
  /** Its level, which is what tells two lines of the same building apart. */
  level: number;
  /**
   * What to start it again with. Absent when the reported state carries no product to read it
   * from, in which case the tab leaves the field empty rather than guessing at one.
   */
  optionId?: number;
  /** Seconds the option takes, as reported. */
  productionTime?: number;
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
  building: (cityEntityId: string, level: number) => BuildingProduction;
}

export interface BuildingProduction {
  /** The building's display name. */
  name: string;
  /**
   * Whether the catalog calls its production `ManualProductionVO` - the kind you start by hand,
   * and the only kind there is anything to start.
   *
   * A building the catalog does not cover, or one stored before the production class was
   * captured, reads as not manual and so is collected but never started. That is the safe way
   * round: starting something that runs itself is a request the game has no business receiving,
   * where a start that does not happen shows up in the tab as a building sitting there. The
   * catalog fills in again on the game's next load.
   */
  manual: boolean;
  /**
   * Seconds of a production after which this building can already be collected, where it offers
   * that at all. See `collectableAtOf`.
   */
  earlyPickupTime?: number;
  /**
   * Every resource one collection brings in, when the catalog's products all come at once rather
   * than being options to choose between.
   *
   * A manual building's products are options - a workshop offers `Beverages` at two minutes and
   * `Toolbox` at a day - and the one running is what its line is about. An automatic one's are
   * not: the Brown Bear's four all take the same 48 hours and carry no names, nothing ever picks
   * between them, and a collection takes the lot. Its state names only one of them, so the
   * catalog is what says what the building actually pays out.
   *
   * Empty for the options case, where the running product speaks for itself.
   */
  yieldsTogether: string[];
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
const productionName = (
  product: CurrentProduct | undefined,
  building: BuildingProduction,
  resourceName: (resourceId: string) => string,
) => {
  // What the catalog says comes at once, when it says so; otherwise what the running option pays.
  const yields =
    building.yieldsTogether.length > 0
      ? building.yieldsTogether
      : Object.keys(product?.revenue.resources ?? {}).filter((key) => key !== '__class__');
  const paysOut = yields.map(resourceName).join(' + ');
  const option = product?.name;
  return paysOut && option ? `${paysOut} (${option})` : paysOut || option;
};

/** When the game last reported this building - what its countdown counts from. */
const reportedAt = (entity: CityEntity, cityLoadedAt: number) => entity.stateAt ?? cityLoadedAt;

const endsAtOf = (entity: CityEntity, cityLoadedAt: number) =>
  reportedAt(entity, cityLoadedAt) + (entity.state?.next_state_transition_in ?? 0) * 1000;

/**
 * When there is something to collect - which is not always when the production ends.
 *
 * Some buildings can be collected part way through: the catalog's `earlyPickupTime` is how many
 * seconds of the run have to have gone by, and a Desert Fortress asks for two hours of a twelve
 * hour production. Working back from the end rather than forward from a start time, because the
 * start is not reported - only what is left of the run is.
 *
 * Falls back to the end of the production for a building that offers no early collect, one that
 * asks for the whole run anyway, and one whose product does not say how long it takes.
 */
export const collectableAtOf = (entity: CityEntity, cityLoadedAt: number, earlyPickupTime?: number) => {
  const endsAt = endsAtOf(entity, cityLoadedAt);
  const runs = entity.state?.current_product?.production_time;
  if (earlyPickupTime === undefined || runs === undefined || earlyPickupTime >= runs) {
    return endsAt;
  }
  return endsAt - (runs - earlyPickupTime) * 1000;
};

/**
 * The city's productions gathered a line per kind of building running one production, finished or
 * still running.
 *
 * Grouped by the building itself and the product it is running - never by what comes out of it.
 * Two buildings that happen to pay out the same good are not one thing to automate: they take
 * their own option ids, and one `startProductions` call carries a single option.
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
    const building = names.building(entity.cityentity_id, entity.level);
    // The building itself, then the product it is running. Not the base name: a building's levels
    // are separate entries in the catalog and pay out different amounts, so they are separate
    // lines. Not what comes out of it either - see above.
    const key = `${entity.cityentity_id}:${optionId ?? 'unknown'}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: productionName(product, building, names.resource) ?? building.name,
        building: building.name,
        level: entity.level,
        optionId,
        productionTime: product?.production_time,
        buildingIds: [],
        finished: 0,
        producing: 0,
      };
      groups.set(key, group);
    }

    group.buildingIds.push(entity.id);

    // Ready means there is something to collect, which is not the same as the production being
    // over: an early-collect building comes ready part way through. And a countdown that has run
    // out is ready whatever the last report called it - the game only says finished once the
    // collect happens, and the timer runs on in the client meanwhile.
    const collectableAt = collectableAtOf(entity, cityLoadedAt, building.earlyPickupTime);
    if (kind === FINISHED || collectableAt <= now) {
      group.finished += 1;
    } else {
      group.producing += 1;
      group.nextEndsAt = Math.min(group.nextEndsAt ?? collectableAt, collectableAt);
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
    building: (cityEntityId, level) => {
      const building = finder.getBuilding(cityEntityId, level);
      // `sourceBuilding`, because `BuildingEx.production` is the summed-up revenue rather than
      // the catalog's own production block.
      const production = building?.sourceBuilding.production;
      const together =
        production?.productionClass === 'AutomaticProductionVO'
          ? production.products.flatMap((product) => Object.keys(product.revenue?.resources ?? {}))
          : [];
      return {
        name: building?.name || cityEntityId,
        manual: production?.productionClass === 'ManualProductionVO',
        earlyPickupTime: production?.earlyPickupTime,
        // One building can list the same good twice over; it is still the one good on the line.
        yieldsTogether: [...new Set(together.filter((key) => key !== '__class__'))],
      };
    },
  };
};

/** The stored city, re-read: the service worker writes it away as the game reports it. */
const readCity = async () => {
  const accountId = getAccountId();
  if (!accountId) {
    return undefined;
  }
  await loadAccount(accountId);
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
  /** See `BuildingProduction.manual`. Collecting is not gated on it - only starting. */
  manual: boolean;
  /**
   * Whether the game has stopped counting this one down. A timed building runs for its few days
   * and then sits on the map idle, waiting to be sold: the game will not offer it the Produce tab
   * at all, and `localStartProduction` turns a start on one away the same way. Left to the retry,
   * a start sent to one would go out again every fifteen seconds for as long as the tab ran.
   *
   * Read from the expiry times stored with the city, which name only the buildings the game
   * reported one for - so a building whose effect has gone missing entirely reads as not expired
   * here, and is turned away on the inject side instead.
   */
  expired: boolean;
  /** What the building's catalog entry allows, if anything. See `collectableAtOf`. */
  earlyPickupTime?: number;
  cityLoadedAt: number;
  now: number;
}

export const decide = (
  entity: CityEntity,
  entry: WatchedBuilding,
  { manual, expired, earlyPickupTime, cityLoadedAt, now }: ProductionContext,
): { action: Action; note: string } => {
  const kind = entity.state?.__class__;
  if (kind !== PRODUCING && kind !== FINISHED && kind !== IDLE) {
    return { action: 'none', note: `is ${kind ?? 'in no state'}` };
  }

  // Not `is it over` but `is there anything to collect` - a building that offers an early collect
  // has something well before its production ends, and waiting out the rest gains nothing.
  if (kind === PRODUCING && now < collectableAtOf(entity, cityLoadedAt, earlyPickupTime)) {
    return { action: 'none', note: 'producing' };
  }

  // Whatever a building holds is still worth collecting, expired or not - it is only the next
  // production that there is no sending one that has run out of days to run it in.
  const canStart = manual && !expired;
  const toStart: { action: Action; note: string } = canStart
    ? { action: 'start', note: 'ready to start' }
    : {
        action: 'none',
        note: expired ? 'expired, nothing more to start on it' : 'not a manual production to start',
      };

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
    ? canStart
      ? { action: 'start', note: 'retrying the start' }
      : toStart
    : { action: 'pickup', note: 'retrying the collect' };
};

/**
 * Whether a timed building has run out, from the expiry times stored with the city. Those are
 * absolute, worked out from what the game had left to run when it last said, so they stay true as
 * the session goes on. A building with no expiry stored is one the game reported no expiry for.
 */
const hasExpired = (expirationsEnd: Record<string, number> | undefined, id: number, now: number) => {
  const endsAt = expirationsEnd?.[id];
  return endsAt !== undefined && endsAt <= now;
};

/**
 * Puts the stored entries back in order before they are acted on: drops any building the city does
 * not have, so a sold building - or an entry written against another city - does not sit there
 * being reported missing every poll, and leaves a building two entries claim in the first of them.
 *
 * The tab keeps that second one true as entries are written, so the dedupe is for lists stored
 * before it did and for anything that writes the store without going through it. Both hand back
 * the array they were given when they had nothing to do, so the store is only written when
 * something actually moved.
 */
const pruneStoredAutomations = (cityEntities: CityEntity[]) => {
  const store = getOverlayStore();
  if (!store) {
    return [];
  }
  const { productionAutomations, setProductionAutomations } = store.getState();
  const { entries: pruned, dropped } = pruneAutomations(productionAutomations, new Set(cityEntities.map((e) => e.id)));
  const { entries, duplicates } = dedupeAutomations(pruned);
  if (dropped.length > 0) {
    addLog(`Dropped ${dropped.length} building(s) the city no longer has: ${dropped.join(', ')}.`);
  }
  if (duplicates.length > 0) {
    addLog(
      `Left ${duplicates.length} building(s) in the first automation that claimed them: ${duplicates.join(', ')}.`,
    );
  }
  if (entries !== productionAutomations) {
    setProductionAutomations(entries);
  }
  return entries;
};

/** Which automation a building belongs to, and what that one asked for. */
export interface Job {
  entryId: string;
  /** The entry's name, so the activity log can say which automation a round of starts was. */
  name: string;
  optionId: number;
}

/**
 * Which automation each building belongs to.
 *
 * One building, one job. Nothing should reach here claiming a building twice - the tab keeps the
 * entries apart as they are written and `pruneStoredAutomations` goes over them every poll - so
 * the first-one-wins below is the last line rather than the rule, and it holds to the same order
 * `dedupeAutomations` does. A building can only be started on one option at a time either way.
 */
export const assignJobs = (entries: AutomationEntry[]) => {
  const jobs = new Map<number, Job>();
  for (const entry of entries) {
    for (const id of entry.buildingIds) {
      if (!jobs.has(id)) {
        jobs.set(id, { entryId: entry.id, name: entry.name, optionId: entry.optionId });
      }
    }
  }
  return jobs;
};

/** One `startProductions` request: the buildings of one automation, on its option. */
export interface StartBatch {
  name: string;
  optionId: number;
  ids: number[];
}

/**
 * The starts one poll produced, batched the way they go out: one request per automation.
 *
 * By automation and not by option id, which is the same thing right up until two automations on
 * different buildings happen to have picked the same number - option 1 is the first and shortest
 * production of nearly everything that has options at all. Sent as one request they are one list
 * to `localStartProduction`, which spends down the stock building by building and *stops* at the
 * first one it cannot pay for rather than passing over it. So an unaffordable workshop at the
 * front would take the marble behind it down too, poll after poll, and the tab would report both
 * as started. Kept apart, each automation gets as far as the stock takes it on its own.
 *
 * The order automations go out in is the order they are listed, which is the order they get the
 * stock in when there is not enough for all of them.
 */
export const batchStarts = (starts: { id: number; job: Job }[]) => {
  const batches = new Map<string, StartBatch>();
  for (const { id, job } of starts) {
    const batch = batches.get(job.entryId);
    if (batch) {
      batch.ids.push(id);
    } else {
      batches.set(job.entryId, { name: job.name, optionId: job.optionId, ids: [id] });
    }
  }
  return [...batches.values()];
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

  // Only ever act on a city that is the city on screen. The page turns these away by itself,
  // but a request it drops is indistinguishable here from one the stock could not pay for, and
  // `RETRY_AFTER_MS` would have the whole set going out again every fifteen seconds for as long
  // as a visit to a neighbour lasted. Nothing said yet means the page has not reported in;
  // carry on and let it do the turning away.
  const gameState = getGameState();
  const refusal = gameState && cityRefusal(gameState);
  if (refusal) {
    // Being somewhere else in the game passes; a game that is past talking to does not. None of
    // the three ways into that comes back on its own - there is nothing to wait for but a
    // reload, and the entries are all still there afterwards to start again from.
    if (gameState.unusable) {
      addLog(`Stopped: ${refusal}. Reload the game.`);
      stopProductionWatch();
      setStatus({ groups, groupsAt: now, summary: `Stopped - ${refusal}.` });
      return;
    }
    setStatus({ groups, groupsAt: now, summary: `Paused - ${refusal}.` });
    return;
  }

  const jobs = assignJobs(entries);

  const toPickup: number[] = [];
  const toStart: { id: number; job: Job }[] = [];
  const notes = new Map<string, number>();
  let nextEndsAt: number | undefined;

  for (const [id, job] of jobs) {
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
    if (previous?.key !== key || previous.optionId !== job.optionId) {
      watched.set(id, { key, optionId: job.optionId });
    }
    const building = watched.get(id)!;

    const { manual, earlyPickupTime } = names.building(entity.cityentity_id, entity.level);
    const { action, note } = decide(entity, building, {
      manual,
      expired: hasExpired(cityQuery.expirationsEnd, id, now),
      earlyPickupTime,
      cityLoadedAt: cityQuery.timestamp,
      now,
    });
    notes.set(note, (notes.get(note) ?? 0) + 1);

    if (action === 'pickup') {
      toPickup.push(id);
      building.last = { action, at: now };
    } else if (action === 'start') {
      toStart.push({ id, job });
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

  // The game batches pickups for a second into a single request, so a round of them is one
  // request however many buildings are behind it. `startProductions` takes a whole list at once
  // too, but only one automation's worth goes in each - see `batchStarts`.
  for (const id of toPickup) {
    relayToGame('pickupProduction', id);
  }
  if (toPickup.length > 0) {
    addLog(`Collecting ${toPickup.length}: ${toPickup.join(', ')}.`);
  }
  for (const { name, optionId, ids } of batchStarts(toStart)) {
    relayToGame('startProduction', { ids, optionId });
    addLog(`Starting ${name} (option ${optionId}) on ${ids.length}: ${ids.join(', ')}.`);
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
