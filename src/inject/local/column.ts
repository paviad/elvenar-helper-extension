// Fill or sell a column of buildings below one the player handled by hand.
//
// Manual at both ends on purpose. Arming only listens, for one of two things: a building placed
// through the build menu, or one sold through the game's own sell window - each of which went
// through the game's own dialog on the way. Nothing else happens until the run is started, and the
// button that starts it carries the count. One column per arming: however the run ends, the tab is
// off again and nothing is listening until Arm is pressed for the next one.
//
// A fill places each copy the way the build menu and a click on the grid would:
// `ConstructBuildingEvent::buildingSelected` on the context dispatcher, then `IsoTileEvent::tileOver`
// and `::tileClicked` on the engine, so the game's own validators run and its model is the one that
// changes (rev-eng/09 §3.5 and R4b). A sell dispatches the `removeEntity` sector-mode event the sell
// window's yes button would, one building a second (§3.5). The game refunds and removes locally at
// once, and the wire answer only carries connection changes, so a refusal is watched for as a
// service exception during the pause after each sale.
//
// This is the one automation on the branch that refuses to run unwatched. Leaving the overlay's
// Build/Sell tab, or closing the panel, ends it at once: the page checks for the view's marker in
// the document before every step and on a short poll in between, which also catches the overlay
// being torn down, since the marker goes with it. The browser tab being in the background is not a
// reason to stop - the game keeps ticking there under the frame keep-alive, and so does this.
// Anything the player does in the city while it runs ends it too (any interaction mode but the
// expected one), as does the city leaving the screen or the game becoming unusable. Do not make it
// survive any of those.
//
// What the game's dialogs would have checked and this route skips: the cost of a placement -
// `PlaceCityEntityCommand` pays the shortfall in diamonds rather than refusing when goods are short -
// and, for a sale, the warnings about a premium building and a full storage, plus the production a
// sale would throw away. Each is a check before every step here, and each one stops the run.
import { AviadCityMapEntity, AviadDispatchedEvent, AviadEntityConfig } from '../aviad';
import { cityRefusal, readGameState } from '../gameState';
import {
  beside,
  COLUMN_VIEW_MARKER,
  ColumnAction,
  columnAlong,
  ColumnCapture,
  ColumnDirection,
  ColumnRefund,
  ColumnState,
  ColumnStateMessage,
  countFits,
  DEFAULT_MODE,
  defaultDirection,
  emptyColumnState,
  Footprint,
  isFillable,
  isProducing,
  nextTile,
  SELL_MODE,
  sellObstacle,
} from './columnPlan';

/** What a run reads off an `EntityConfig`. */
export interface ColumnConfig {
  get_id(): string;
  get_name(): string;
  get_level(): number;
  get_type(): string;
  get_width(): number;
  get_length(): number;
}

/** What it reads off a `CityMapEntity`. */
export interface ColumnEntity {
  get_id(): number;
  get_x(): number;
  get_y(): number;
  get_entityConfig(): ColumnConfig;
  get_state(): { get_stateId(): string };
  isPremium(): boolean;
}

/** The game, as far as a run needs it. `liveColumnGame` is the real one. */
export interface ColumnGame {
  /** Why the own city is not there to work in right now, or nothing. */
  refusal: () => string | undefined;
  /** The city's race, `humans` or `elves`, which decides which way a run goes by default. */
  race: () => string | undefined;
  /** Whether the Build/Sell tab is in front of the player: selected in the overlay, with the panel open. */
  onScreen: () => boolean;
  interactionMode: () => string;
  /** A service exception; during a step, its refusal. */
  onRejected: (listener: (why: string) => void) => () => void;

  // Filling.
  freeWorkers: () => number;
  /** The resources the building's cost would overdraw, by id. */
  missingResources: (config: ColumnConfig) => string[];
  canPlace: (x: number, y: number, width: number, length: number) => boolean;
  /** Choosing the building in the build menu. */
  select: (config: ColumnConfig) => void;
  /** Moving the ghost onto a tile, and clicking it. */
  hover: (x: number, y: number) => void;
  click: (x: number, y: number) => void;
  /** Back to the default mode, after a select whose click placed nothing. */
  leaveBuildMode: () => void;
  /** A building placed through the build mode - the player's or the run's own. */
  onPlaced: (listener: (entity: ColumnEntity) => void) => () => void;
  /** The server acknowledging a placement, with the same entity object the placement carried. */
  onUpdated: (listener: (entity: ColumnEntity) => void) => () => void;

  // Selling.
  /** The building whose footprint covers the tile, if any. */
  entityAt: (x: number, y: number) => ColumnEntity | undefined;
  saleResources: (entity: ColumnEntity) => ColumnRefund[];
  hasStorageFor: (entity: ColumnEntity) => boolean;
  /** What the sell window's yes button does. */
  sell: (entity: ColumnEntity) => void;
  /** Whether the model no longer has the building: a sale takes effect locally at once. */
  isGone: (id: number) => boolean;
  /** A building sold through the sell window - the player's or the run's own. */
  onSold: (listener: (entity: ColumnEntity) => void) => () => void;
}

/** How often to look again for a free builder. */
export const BUILDER_POLL_MS = 500;
/** How often to look for the server's answer to a placement, and how long before giving up on it. */
export const SETTLE_POLL_MS = 100;
export const SETTLE_TIMEOUT_MS = 15000;
/** The pause after each sale, during which a refusal from the server is still listened for. */
export const SELL_PACE_MS = 1000;
/** How often to make sure the Build/Sell tab is still in front of the player, between steps. */
export const WATCH_MS = 250;
const TAB_CLOSED = 'Stopped: the Build/Sell tab was closed';
const LOG_LIMIT = 60;

/** Why a run ended. Every end is the same afterwards: the listeners come off and the tab is off. */
type Stop = string;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const modeName = (mode: string) => mode.replace(/^ModeTypes\//, '');

export const createColumn = (game: ColumnGame, publish: (state: ColumnState) => void, now: () => number = Date.now) => {
  let state: ColumnState = { ...emptyColumnState(), direction: defaultDirection(game.race()) };
  /** The picked-up building's config: what each copy is placed from, or what each sale must match. */
  let config: ColumnConfig | undefined;
  let subscriptions: (() => void)[] = [];
  /** Set around the run's own dispatches, so what they trigger is not taken for the player's doing. */
  let acting = false;
  /** What the run's own dispatch produced, handed from the listener to the step. */
  let own: ColumnEntity | undefined;
  /** A stop asked for from outside the loop, picked up at the loop's next check. */
  let requested: Stop | undefined;
  /** Bumped to cancel a running loop: a loop holding an older number ends at its next check. */
  let generation = 0;

  const set = (patch: Partial<ColumnState>) => {
    state = { ...state, ...patch };
    publish(state);
  };

  const log = (text: string) => set({ log: [{ at: now(), text }, ...state.log].slice(0, LOG_LIMIT) });

  const label = (capture: ColumnCapture) => `${capture.name} level ${capture.level}`;

  const unlisten = () => {
    subscriptions.forEach((off) => off());
    subscriptions = [];
  };

  const finish = (reason: Stop) => {
    generation++;
    requested = undefined;
    unlisten();
    set({ phase: 'idle', mode: undefined, capture: undefined, reason });
    log(reason);
  };

  /** Ends whatever is going on, from outside the loop. A running loop finishes itself. */
  const abort = (stop: Stop) => {
    if (state.phase === 'idle') {
      return;
    }
    if (state.phase === 'running') {
      requested = stop;
      generation++;
      return;
    }
    finish(stop);
  };

  const takeOwn = () => {
    const entity = own;
    own = undefined;
    return entity;
  };

  const footprintOf = (entity: ColumnEntity): Footprint => {
    const entityConfig = entity.get_entityConfig();
    return { x: entity.get_x(), y: entity.get_y(), width: entityConfig.get_width(), length: entityConfig.get_length() };
  };

  /** The identical buildings in a line from `start`, each exactly on the next footprint. */
  const matchesAlong = (start: Footprint, direction: ColumnDirection, configId: string) =>
    columnAlong(start, direction, (x, y) => {
      const entity = game.entityAt(x, y);
      return entity && entity.get_x() === x && entity.get_y() === y && entity.get_entityConfig().get_id() === configId
        ? entity
        : undefined;
    });

  const producingAmong = (entities: ColumnEntity[]) =>
    entities.filter((entity) => isProducing(entity.get_state().get_stateId())).length;

  /** The capture counted again, the way the run currently goes: the city may have changed since. */
  const recounted = (capture: ColumnCapture): ColumnCapture => {
    const direction = state.direction;
    if (capture.mode === 'fill') {
      const available = countFits(capture, direction, (x, y, width, length) => game.canPlace(x, y, width, length));
      return { ...capture, direction, available };
    }
    const along = matchesAlong(capture, direction, capture.configId);
    return { ...capture, direction, available: along.length, producing: producingAmong(along) };
  };

  const setDirection = (direction: ColumnDirection) => {
    if (state.phase === 'running' || direction === state.direction) {
      return;
    }
    set({ direction });
    if (state.capture) {
      const capture = recounted(state.capture);
      set({ capture });
      log(`Going ${direction}: ${capture.available} ${beside(direction)} it`);
    }
  };

  const onPlaced = (entity: ColumnEntity) => {
    if (acting) {
      own = entity;
      return;
    }
    if (state.phase === 'running') {
      abort('Stopped: you placed a building yourself');
      return;
    }
    if (state.phase === 'idle') {
      return;
    }
    const placedConfig = entity.get_entityConfig();
    if (!isFillable(placedConfig.get_type())) {
      log(`Not picked up: ${placedConfig.get_name()} is not a workshop or a manufactory`);
      return;
    }
    const footprint = footprintOf(entity);
    const capture: ColumnCapture = {
      mode: 'fill',
      direction: state.direction,
      name: placedConfig.get_name(),
      level: placedConfig.get_level(),
      configId: placedConfig.get_id(),
      ...footprint,
      available: countFits(footprint, state.direction, (x, y, width, length) => game.canPlace(x, y, width, length)),
    };
    config = placedConfig;
    set({ phase: 'captured', capture, done: 0, target: undefined, reason: undefined });
    log(
      `Picked up ${label(capture)} at ${capture.x},${capture.y}: ${capture.available} more fit ${beside(capture.direction)} it`,
    );
  };

  const onSold = (entity: ColumnEntity) => {
    if (acting) {
      own = entity;
      return;
    }
    if (state.phase === 'running') {
      abort('Stopped: you sold a building yourself');
      return;
    }
    if (state.phase === 'idle') {
      return;
    }
    const soldConfig = entity.get_entityConfig();
    const footprint = footprintOf(entity);
    const below = matchesAlong(footprint, state.direction, soldConfig.get_id());
    const producing = producingAmong(below);
    const capture: ColumnCapture = {
      mode: 'sell',
      direction: state.direction,
      name: soldConfig.get_name(),
      level: soldConfig.get_level(),
      configId: soldConfig.get_id(),
      ...footprint,
      available: below.length,
      producing,
      // Read off a building still standing where there is one: the sold one is on its way out.
      refund: game.saleResources(below[0] ?? entity),
    };
    config = soldConfig;
    set({ phase: 'captured', capture, done: 0, target: undefined, reason: undefined });
    log(
      `Picked up the sale of ${label(capture)} at ${capture.x},${capture.y}: ${below.length} more in a row ${beside(capture.direction)} it` +
        (producing > 0 ? `, ${producing} producing` : ''),
    );
  };

  /** Ends everything the moment the Build/Sell tab is left or the panel closed, armed or running. */
  const watchTab = () => {
    const timer = setInterval(() => {
      if (!game.onScreen()) {
        abort(TAB_CLOSED);
      }
    }, WATCH_MS);
    return () => clearInterval(timer);
  };

  const arm = (mode: ColumnCapture['mode']) => {
    if (state.phase !== 'idle') {
      return;
    }
    const refusal = game.refusal();
    if (refusal) {
      log(`Not armed: ${refusal}`);
      return;
    }
    subscriptions.push(mode === 'fill' ? game.onPlaced(onPlaced) : game.onSold(onSold), watchTab());
    set({ phase: 'armed', mode, capture: undefined, done: 0, target: undefined, reason: undefined });
    log(
      mode === 'fill'
        ? 'Armed to fill. Place one workshop or manufactory from the build menu.'
        : "Armed to sell. Sell one building through the game's sell window.",
    );
  };

  /** The interaction modes a run may find the city in without taking them for the player's doing. */
  const expectedModes = () => (state.mode === 'sell' ? [DEFAULT_MODE, SELL_MODE] : [DEFAULT_MODE]);

  /** Why the loop holding `gen` must stop now, or nothing while it may go on. */
  const guard = (gen: number): Stop | undefined => {
    if (gen !== generation) {
      return requested ?? 'Stopped';
    }
    if (!game.onScreen()) {
      return TAB_CLOSED;
    }
    const refusal = game.refusal();
    if (refusal) {
      return `Stopped: ${refusal}`;
    }
    const mode = game.interactionMode();
    if (!expectedModes().includes(mode)) {
      return `Stopped: you are busy in the city (${modeName(mode)})`;
    }
    return undefined;
  };

  const waitForBuilder = async (gen: number): Promise<Stop | undefined> => {
    let waiting = false;
    for (;;) {
      const stop = guard(gen);
      if (stop) {
        return stop;
      }
      if (game.freeWorkers() > 0) {
        return undefined;
      }
      if (!waiting) {
        waiting = true;
        log('Waiting for a builder');
      }
      await sleep(BUILDER_POLL_MS);
    }
  };

  /** Waits for the server's word on a placement: acknowledged, refused, or nothing for too long. */
  const settle = async (entity: ColumnEntity, gen: number): Promise<Stop | undefined> => {
    const outcome: { acknowledged: boolean; rejection?: string } = { acknowledged: false };
    const offUpdated = game.onUpdated((updated) => {
      if (updated === entity) {
        outcome.acknowledged = true;
      }
    });
    const offRejected = game.onRejected((why) => {
      outcome.rejection = why;
    });
    try {
      for (let waited = 0; ; waited += SETTLE_POLL_MS) {
        const stop = guard(gen);
        if (stop) {
          return stop;
        }
        if (outcome.acknowledged) {
          return undefined;
        }
        if (outcome.rejection !== undefined) {
          return `Stopped: the game refused the placement (${outcome.rejection})`;
        }
        if (waited >= SETTLE_TIMEOUT_MS) {
          return 'Stopped: the server did not answer the placement';
        }
        await sleep(SETTLE_POLL_MS);
      }
    } finally {
      offUpdated();
      offRejected();
    }
  };

  const place = async (cfg: ColumnConfig, x: number, y: number, gen: number): Promise<Stop | undefined> => {
    own = undefined;
    acting = true;
    try {
      // Synchronous through to the placement event: the click reaches the build mode's
      // `buildAt`, which dispatches `placeEntity` before it returns (rev-eng/09 §2.4).
      game.select(cfg);
      game.hover(x, y);
      game.click(x, y);
    } finally {
      acting = false;
    }
    const entity = takeOwn();
    if (!entity) {
      // A select with no placement leaves the ghost on the cursor - the worker window opened, or
      // a validator said no. Nothing of ours should be left standing in the city.
      game.leaveBuildMode();
      return `Stopped: the game did not place anything at ${x},${y}`;
    }
    if (entity.get_x() !== x || entity.get_y() !== y) {
      return `Stopped: the game put it at ${entity.get_x()},${entity.get_y()} instead of ${x},${y}`;
    }
    return settle(entity, gen);
  };

  const fillLoop = async (gen: number, cfg: ColumnConfig, capture: ColumnCapture, target: number) => {
    let done = 0;
    let stop: Stop | undefined;
    while (done < target) {
      const tile = nextTile(capture, capture.direction, done);
      stop = await waitForBuilder(gen);
      if (stop) {
        break;
      }
      const missing = game.missingResources(cfg);
      if (missing.length > 0) {
        stop = `Stopped: not enough ${missing.join(', ')}`;
        break;
      }
      if (!game.canPlace(tile.x, tile.y, capture.width, capture.length)) {
        stop = `Stopped: ${tile.x},${tile.y} is not free`;
        break;
      }
      stop = await place(cfg, tile.x, tile.y, gen);
      if (stop) {
        break;
      }
      done++;
      set({ done });
      log(`Placed ${label(capture)} at ${tile.x},${tile.y} (${done} of ${target})`);
    }
    finish(stop ?? `Done: ${done} placed ${beside(capture.direction)} ${label(capture)}`);
  };

  /** The pause after a sale, during which the server may still refuse it. */
  const pause = async (gen: number): Promise<Stop | undefined> => {
    const outcome: { rejection?: string } = {};
    const offRejected = game.onRejected((why) => {
      outcome.rejection = why;
    });
    try {
      for (let waited = 0; waited < SELL_PACE_MS; waited += SETTLE_POLL_MS) {
        await sleep(SETTLE_POLL_MS);
        const stop = guard(gen);
        if (stop) {
          return stop;
        }
        if (outcome.rejection !== undefined) {
          return `Stopped: the game refused the sale (${outcome.rejection})`;
        }
      }
      return undefined;
    } finally {
      offRejected();
    }
  };

  const sellOne = (entity: ColumnEntity, where: string): Stop | undefined => {
    own = undefined;
    acting = true;
    try {
      // Synchronous: the command refunds, removes the building from the model and dispatches
      // the sold event before the dispatch returns (rev-eng/09 §3.5).
      game.sell(entity);
    } finally {
      acting = false;
    }
    if (!takeOwn() || !game.isGone(entity.get_id())) {
      return `Stopped: the game did not sell ${where}`;
    }
    return undefined;
  };

  const sellLoop = async (
    gen: number,
    cfg: ColumnConfig,
    capture: ColumnCapture,
    target: number,
    sellProducing: boolean,
  ) => {
    let done = 0;
    let stop: Stop | undefined;
    while (done < target) {
      stop = guard(gen);
      if (stop) {
        break;
      }
      const tile = nextTile(capture, capture.direction, done);
      const where = `${label(capture)} at ${tile.x},${tile.y}`;
      // Looked up again now rather than kept from the pick-up: the city may have changed since.
      const entity = game.entityAt(tile.x, tile.y);
      if (
        !entity ||
        entity.get_x() !== tile.x ||
        entity.get_y() !== tile.y ||
        entity.get_entityConfig().get_id() !== cfg.get_id()
      ) {
        stop = `Stopped: there is no ${where} any more`;
        break;
      }
      if (entity.isPremium()) {
        stop = `Stopped: ${where} is a premium building`;
        break;
      }
      const obstacle = sellObstacle(entity.get_state().get_stateId(), sellProducing);
      if (obstacle) {
        stop = `Stopped: ${where} ${obstacle}`;
        break;
      }
      if (!game.hasStorageFor(entity)) {
        stop = 'Stopped: the storage is full, part of the refund would be lost';
        break;
      }
      stop = sellOne(entity, where);
      if (stop) {
        break;
      }
      done++;
      set({ done });
      log(`Sold ${where} (${done} of ${target})`);
      stop = await pause(gen);
      if (stop) {
        break;
      }
    }
    finish(stop ?? `Done: ${done} sold ${beside(capture.direction)} ${label(capture)}`);
  };

  const run = (count: number | undefined, sellProducing: boolean) => {
    if (state.phase !== 'captured' || !config || !state.capture) {
      log('Nothing to do: place or sell a building first');
      return;
    }
    const refusal = game.refusal();
    if (refusal) {
      finish(`Stopped: ${refusal}`);
      return;
    }
    const capture = recounted(state.capture);
    const target =
      count === undefined ? capture.available : Math.min(Math.max(0, Math.floor(count)), capture.available);
    if (target <= 0) {
      set({ capture });
      if (capture.available > 0) {
        log('Nothing to do: the count is 0');
      } else {
        log(`${capture.mode === 'fill' ? 'Nothing fits' : 'No identical building'} ${beside(capture.direction)} it`);
      }
      return;
    }
    set({ phase: 'running', capture, done: 0, target, reason: undefined });
    if (capture.mode === 'fill') {
      log(`Filling ${target} below ${label(capture)}`);
      void fillLoop(++generation, config, capture, target);
    } else {
      log(`Selling ${target} below ${label(capture)}`);
      void sellLoop(++generation, config, capture, target, sellProducing);
    }
  };

  const handle = (action: ColumnAction) => {
    switch (action.action) {
      case 'arm':
        arm(action.mode);
        break;
      case 'disarm':
        abort('Disarmed');
        break;
      case 'direction':
        setDirection(action.direction);
        break;
      case 'run':
        run(action.count, action.sellProducing ?? false);
        break;
      case 'stop':
        abort('Stopped by you');
        break;
      case 'query':
        publish(state);
        break;
    }
  };

  return { handle, getState: () => state };
};

const describeException = (exception: { code?: number; message?: string } | undefined) =>
  exception?.message || (exception?.code !== undefined ? `code ${exception.code}` : 'no details');

/** The game behind `window.aviad`, or nothing until the city is up. */
export const liveColumnGame = (): ColumnGame | undefined => {
  const classes = window.aviad as typeof window.aviad | undefined;
  const model = window.aviad_am as typeof window.aviad_am | undefined;
  // Read at each use rather than once: the interactive layer's mediator, and the engine with it,
  // is built again whenever a city is loaded, and `aviad_silm` follows the newest one.
  const engine = () => window.aviad_silm?.isoEngine;
  if (!classes || !model?.injector || !engine()) {
    return undefined;
  }
  const dispatcher = model.injector.getInstance(classes['openfl.events.IEventDispatcher']);
  const entities = model.injector.getInstance(classes['de.innogames.strategycity.main.model.ICityEntitiesModel']);
  const resources = model.injector.getInstance(classes['de.innogames.onyx.resources.models.ResourcesModel']);
  const ConstructBuildingEvent = classes['de.innogames.strategycity.main.controller.event.ConstructBuildingEvent'];
  const CitySectorModeEvent = classes['de.innogames.onyx.city.modes.events.CitySectorModeEvent'];
  const IsoTileEvent = classes['de.innogames.onyx.city.engine.events.IsoTileEvent'];

  // On the game's own dispatch stack, so nothing of ours may throw from here: an exception that
  // is not an `openfl.errors.Error` takes the rest of the event's listeners down with it (04 §3).
  const on = (type: string, listener: (event: AviadDispatchedEvent) => void) => {
    const guarded = (event: AviadDispatchedEvent) => {
      try {
        listener(event);
      } catch (error) {
        console.warn(`column: the listener for ${type} failed`, error);
      }
    };
    dispatcher.addEventListener(type, guarded);
    return () => dispatcher.removeEventListener(type, guarded);
  };

  const onEntityEvent = (type: string, listener: (entity: ColumnEntity) => void) =>
    on(type, (event) => {
      const entity = event.get_entity?.();
      if (entity) {
        listener(entity);
      }
    });

  const saleOf = (entity: ColumnEntity) => (entity as AviadCityMapEntity).get_saleResources();

  return {
    refusal: () => cityRefusal(readGameState()),
    race: () => {
      // The main hall is the one building every city has, and its config carries the race.
      const hall = entities.getUniqueBuilding('main_building') ?? entities.getUniqueBuilding('main_hall');
      const hallConfig = hall?.get_entityConfig();
      if (!hallConfig) {
        return undefined;
      }
      return hallConfig.get_race() || (/_Elves_/.test(hallConfig.get_id()) ? 'elves' : 'humans');
    },
    onScreen: () => {
      // Gone when another overlay tab is selected or the overlay is torn down; not visible when
      // the panel is collapsed, which hides its content. A background browser tab changes neither.
      const marker = document.querySelector(`[${COLUMN_VIEW_MARKER}]`);
      return marker instanceof HTMLElement && marker.checkVisibility();
    },
    interactionMode: () => model.get_interactionMode(),
    onRejected: (listener) =>
      on('ServiceExceptionEvent::exception', (event) => listener(describeException(event.exception))),

    freeWorkers: () => entities.freeWorkers.getValue(),
    missingResources: (config) =>
      resources
        .getMissingResourcesFor((config as AviadEntityConfig).get_requirements().get_resources())
        .get_resources()
        .map((resource) => resource.id),
    canPlace: (x, y, width, length) => {
      const iso = engine();
      if (!iso) {
        return false;
      }
      const map = iso.placementMap;
      return (
        x >= 0 &&
        y >= 0 &&
        x + width <= map.get_mapWidth() &&
        y + length <= map.get_mapLength() &&
        iso.isValidPlacementAtPosition(x, y, width, length)
      );
    },
    select: (config) => {
      dispatcher.dispatchEvent(
        new ConstructBuildingEvent('ConstructBuildingEvent::buildingSelected', config as AviadEntityConfig),
      );
    },
    hover: (x, y) => engine()?.dispatchEvent(IsoTileEvent.getEvent('IsoTileEvent::tileOver', x, y, true)),
    click: (x, y) => engine()?.dispatchEvent(IsoTileEvent.getEvent('IsoTileEvent::tileClicked', x, y, true)),
    leaveBuildMode: () => {
      if (model.get_interactionMode() !== DEFAULT_MODE) {
        model.set_interactionMode(DEFAULT_MODE);
      }
    },
    onPlaced: (listener) => onEntityEvent('placeEntity', listener),
    onUpdated: (listener) => onEntityEvent('CityMapModelEvent/updateEntities', listener),

    entityAt: (x, y) => {
      const iso = engine()?.getEntityByPosition(x, y);
      return (iso && entities.getEntityById(iso.id)) || undefined;
    },
    saleResources: (entity) =>
      saleOf(entity)
        .get_resources()
        .map((resource) => ({ id: resource.id, amount: Number(resource._value) })),
    hasStorageFor: (entity) => resources.hasEnoughStorageFor(saleOf(entity)),
    sell: (entity) => {
      dispatcher.dispatchEvent(new CitySectorModeEvent('removeEntity', entity as AviadCityMapEntity));
    },
    isGone: (id) => !entities.getEntityById(id),
    onSold: (listener) => onEntityEvent('removeEntity', listener),
  };
};

const publish = (state: ColumnState) => {
  window.postMessage({ type: 'columnState', payload: state } satisfies ColumnStateMessage, '*');
};

let column: ReturnType<typeof createColumn> | undefined;

/** What `inject-main` hands a `column` message to. */
export const handleColumnMessage = (action: ColumnAction) => {
  if (!column) {
    const game = liveColumnGame();
    if (!game) {
      publish({ ...emptyColumnState(), reason: 'The city is not loaded yet' });
      return;
    }
    column = createColumn(game, publish);
  }
  column.handle(action);
};
