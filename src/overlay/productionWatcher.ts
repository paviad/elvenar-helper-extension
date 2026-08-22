import { getAccountById, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { relayToGame } from '../inject/relayToGame';
import { getAccountId } from './overlayStore';

/** How often the stored city data is re-read and the production timer checked. */
export const PRODUCTION_POLL_MS = 5000;

/** The game's own names for the states a manual production moves through. */
const PRODUCING = 'ProducingVO';
const FINISHED = 'ProductionFinishedVO';
const IDLE = 'IdleVO';

/**
 * Where the watcher has got to with the production it is looking at. One production goes
 * `watching` → `pickedUp` → `started`, one step per poll, so the collect has settled in the game
 * before the start is sent - `localStartProduction` only starts a building the game reports idle.
 */
type Phase = 'watching' | 'pickedUp' | 'started';

export interface ProductionLogEntry {
  at: number;
  text: string;
}

export interface ProductionWatchStatus {
  running: boolean;
  buildingId?: number;
  optionId?: number;
  /** What the last poll made of the building. Replaced every poll. */
  summary: string;
  /** The stored city entity id, so the tab can show what the entered id turned out to be. */
  cityEntityId?: string;
  /** The option the building is running right now, as a hint for what to type in. */
  currentOptionId?: number;
  /** When the running production is due, absolute; absent when nothing is counting down. */
  endsAt?: number;
  /** When the game last reported this building - what the countdown is measured from. */
  dataAt?: number;
  log: ProductionLogEntry[];
}

const idleStatus = (): ProductionWatchStatus => ({ running: false, summary: 'Not monitoring.', log: [] });

let status: ProductionWatchStatus = idleStatus();
let timer: ReturnType<typeof setInterval> | null = null;
let polling = false;

/** The production being watched: which reported state it is, and how far the watcher has got. */
let watched: { key: string; phase: Phase } | null = null;

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

const poll = async () => {
  const { buildingId, optionId } = status;
  if (buildingId === undefined || optionId === undefined) {
    return;
  }

  const accountId = getAccountId();
  if (!accountId) {
    setStatus({ summary: 'No account loaded yet.' });
    return;
  }

  // Read the account again rather than trusting the copy in memory: the service worker writes the
  // city entities away as the game reports them, and this context only sees that through storage.
  await loadSingleAccountFromStorage(accountId, true);
  const cityQuery = getAccountById(accountId)?.cityQuery;
  if (!cityQuery?.cityEntities) {
    setStatus({ summary: 'No city data stored yet - open the game and let it load.' });
    return;
  }

  const entity = cityQuery.cityEntities.find((candidate) => candidate.id === buildingId);
  if (!entity) {
    setStatus({
      summary: `No building with id ${buildingId} in the stored city.`,
      cityEntityId: undefined,
      currentOptionId: undefined,
      endsAt: undefined,
      dataAt: cityQuery.timestamp,
    });
    return;
  }

  const state = entity.state;
  const kind = state?.__class__;
  const transitionIn = state?.next_state_transition_in ?? 0;
  // The countdown runs from when the game reported the state - the moment the entity was last
  // pushed to us, or the city load for one that has not been pushed since.
  const stateAt = entity.stateAt ?? cityQuery.timestamp;
  const endsAt = stateAt + transitionIn * 1000;
  // One report of one state is one production to work through. Starting, collecting and
  // cancelling all make the game report the building again, which is what begins the next.
  const key = `${stateAt}:${kind ?? 'none'}:${transitionIn}`;

  if (watched?.key !== key) {
    watched = { key, phase: 'watching' };
  }
  const shared = { cityEntityId: entity.cityentity_id, dataAt: stateAt };
  const currentOptionId = state?.current_product?.production_option;

  if (kind !== PRODUCING && kind !== FINISHED && kind !== IDLE) {
    setStatus({
      ...shared,
      summary: `${entity.cityentity_id} is ${kind ?? 'in no state'} - nothing to do.`,
      currentOptionId,
      endsAt: undefined,
    });
    return;
  }

  if (kind === PRODUCING && Date.now() < endsAt) {
    setStatus({ ...shared, summary: `${entity.cityentity_id} is producing.`, currentOptionId, endsAt });
    return;
  }

  // Production over (or the building was idle to begin with): collect, then start, a step a poll.
  if (watched.phase === 'watching' && kind !== IDLE) {
    relayToGame('pickupProduction', buildingId);
    watched.phase = 'pickedUp';
    addLog(`Production finished - collecting ${entity.cityentity_id} (#${buildingId}).`);
    setStatus({
      ...shared,
      summary: 'Collected. Starting the next production on the next check.',
      currentOptionId,
      endsAt: undefined,
    });
    return;
  }

  if (watched.phase !== 'started') {
    relayToGame('startProduction', { ids: [buildingId], optionId });
    watched.phase = 'started';
    addLog(`Starting option ${optionId} on ${entity.cityentity_id} (#${buildingId}).`);
    setStatus({ ...shared, summary: 'Production start sent.', currentOptionId, endsAt: undefined });
    return;
  }

  // Nothing more to send for this production. The watcher picks up again the moment the game
  // reports the building's new state, which is what changes `key` above.
  setStatus({
    ...shared,
    summary: 'Started - waiting for the game to report the new production.',
    currentOptionId,
    endsAt: undefined,
  });
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

export const startProductionWatch = (buildingId: number, optionId: number) => {
  stopProductionWatch();
  watched = null;
  status = { ...status, running: true, buildingId, optionId, summary: 'Checking...', endsAt: undefined };
  addLog(`Monitoring building #${buildingId} for option ${optionId}, every ${PRODUCTION_POLL_MS / 1000}s.`);
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
  setStatus({ running: false, summary: 'Not monitoring.', endsAt: undefined });
};
