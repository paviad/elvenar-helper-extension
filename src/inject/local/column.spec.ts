import {
  BUILDER_POLL_MS,
  ColumnConfig,
  ColumnEntity,
  ColumnGame,
  createColumn,
  SELL_PACE_MS,
  SETTLE_POLL_MS,
  SETTLE_TIMEOUT_MS,
  WATCH_MS,
} from './column';
import { ColumnState, DEFAULT_MODE, SELL_MODE } from './columnPlan';

const MAP_LENGTH = 20;
const MAP_WIDTH = 20;

const workshop: ColumnConfig = {
  get_id: () => 'P_Humans_Workshop_1',
  get_name: () => 'Workshop',
  get_level: () => 1,
  get_type: () => 'production',
  get_width: () => 2,
  get_length: () => 2,
};

const residence: ColumnConfig = {
  ...workshop,
  get_id: () => 'A_Humans_Residential_1',
  get_name: () => 'Residence',
  get_type: () => 'residential',
};

interface FakeEntity extends ColumnEntity {
  state: string;
  premium: boolean;
}

/**
 * A game that places on click, sells on demand, and answers when told to. Buildings are tracked
 * by their origin tile, which is all a column ever asks about.
 */
const fakeGame = () => {
  const placed = new Set<(entity: ColumnEntity) => void>();
  const updated = new Set<(entity: ColumnEntity) => void>();
  const sold = new Set<(entity: ColumnEntity) => void>();
  const rejected = new Set<(why: string) => void>();
  const subscribe =
    <T>(set: Set<T>) =>
    (listener: T) => {
      set.add(listener);
      return () => {
        set.delete(listener);
      };
    };
  const calls: string[] = [];
  const knobs = {
    refusal: undefined as string | undefined,
    race: 'humans' as string | undefined,
    onScreen: true,
    mode: DEFAULT_MODE,
    workers: 2,
    missing: [] as string[],
    placesOnClick: true,
    storage: true,
    refund: [{ id: 'money', amount: 200 }],
  };
  const buildings = new Map<string, FakeEntity>();
  let nextId = 100;
  const at = (x: number, y: number) => `${x},${y}`;
  const building = (config: ColumnConfig, x: number, y: number, state = 'idle', premium = false): FakeEntity => {
    const id = nextId++;
    const entity: FakeEntity = {
      state,
      premium,
      get_id: () => id,
      get_x: () => x,
      get_y: () => y,
      get_entityConfig: () => config,
      get_state: () => ({ get_stateId: () => entity.state }),
      isPremium: () => entity.premium,
    };
    return entity;
  };
  const put = (entity: FakeEntity) => {
    buildings.set(at(entity.get_x(), entity.get_y()), entity);
    return entity;
  };
  let selected: ColumnConfig | undefined;
  const own: ColumnEntity[] = [];
  const game: ColumnGame = {
    refusal: () => knobs.refusal,
    race: () => knobs.race,
    onScreen: () => knobs.onScreen,
    interactionMode: () => knobs.mode,
    onRejected: subscribe(rejected),
    freeWorkers: () => knobs.workers,
    missingResources: () => knobs.missing,
    canPlace: (x, y, width, length) => x + width <= MAP_WIDTH && y + length <= MAP_LENGTH && !buildings.has(at(x, y)),
    select: (config) => {
      selected = config;
      calls.push(`select ${config.get_id()}`);
    },
    hover: (x, y) => {
      calls.push(`hover ${x},${y}`);
    },
    click: (x, y) => {
      calls.push(`click ${x},${y}`);
      if (knobs.placesOnClick && selected) {
        const entity = put(building(selected, x, y, 'construction'));
        own.push(entity);
        placed.forEach((listener) => listener(entity));
      }
      selected = undefined;
    },
    leaveBuildMode: () => {
      calls.push('leave build mode');
    },
    onPlaced: subscribe(placed),
    onUpdated: subscribe(updated),
    entityAt: (x, y) => buildings.get(at(x, y)),
    saleResources: () => knobs.refund,
    hasStorageFor: () => knobs.storage,
    sell: (entity) => {
      calls.push(`sell ${entity.get_x()},${entity.get_y()}`);
      // As the game does it: refunded and gone from the model, then the event.
      buildings.delete(at(entity.get_x(), entity.get_y()));
      sold.forEach((listener) => listener(entity));
    },
    isGone: (id) => ![...buildings.values()].some((entity) => entity.get_id() === id),
    onSold: subscribe(sold),
  };
  return {
    game,
    calls,
    knobs,
    buildings,
    /** A building already standing in the city. */
    standing: (config: ColumnConfig, x: number, y: number, state = 'idle', premium = false) =>
      put(building(config, x, y, state, premium)),
    placeByHand: (config: ColumnConfig, x: number, y: number) => {
      const entity = put(building(config, x, y, 'construction'));
      placed.forEach((listener) => listener(entity));
      return entity;
    },
    sellByHand: (x: number, y: number) => {
      const entity = buildings.get(at(x, y));
      if (!entity) {
        throw new Error(`nothing at ${x},${y}`);
      }
      buildings.delete(at(x, y));
      sold.forEach((listener) => listener(entity));
      return entity;
    },
    acknowledgeLast: () => {
      const last = own[own.length - 1];
      updated.forEach((listener) => listener(last));
    },
    reject: (why: string) => rejected.forEach((listener) => listener(why)),
    /** Another overlay tab selected, or the panel collapsed: the view's marker is no longer on screen. */
    leaveTab: () => {
      knobs.onScreen = false;
    },
    listeners: () => placed.size + sold.size,
  };
};

const setup = () => {
  const fake = fakeGame();
  const states: ColumnState[] = [];
  const column = createColumn(
    fake.game,
    (state) => states.push(state),
    () => 0,
  );
  return { ...fake, column, last: () => states[states.length - 1] };
};

/** Armed to fill, with a workshop placed by hand at 5,5. */
const capturedFill = () => {
  const t = setup();
  t.column.handle({ action: 'arm', mode: 'fill' });
  t.placeByHand(workshop, 5, 5);
  return t;
};

/** Armed to sell, with four workshops in a column from 5,5 and a residence under them, the top one sold by hand. */
const capturedSell = () => {
  const t = setup();
  t.standing(workshop, 5, 5);
  t.standing(workshop, 5, 7);
  t.standing(workshop, 5, 9);
  t.standing(workshop, 5, 11);
  t.standing(residence, 5, 13);
  t.column.handle({ action: 'arm', mode: 'sell' });
  t.sellByHand(5, 5);
  return t;
};

const tick = (ms: number) => jest.advanceTimersByTimeAsync(ms);

const clicks = (calls: string[]) => calls.filter((call) => call.startsWith('click '));
const sales = (calls: string[]) => calls.filter((call) => call.startsWith('sell '));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('arming', () => {
  it('only arms with the own city on screen', () => {
    const t = setup();
    t.knobs.refusal = 'the world map is open';
    t.column.handle({ action: 'arm', mode: 'fill' });
    expect(t.last().phase).toBe('idle');
    expect(t.last().log[0].text).toBe('Not armed: the world map is open');
    expect(t.listeners()).toBe(0);
  });

  it('to fill listens for a placement, and nothing else happens', () => {
    const t = setup();
    t.column.handle({ action: 'arm', mode: 'fill' });
    expect(t.last()).toMatchObject({ phase: 'armed', mode: 'fill' });
    expect(t.listeners()).toBe(1);
    expect(t.calls).toEqual([]);
  });

  it('to sell listens for a sale instead', () => {
    const t = setup();
    t.column.handle({ action: 'arm', mode: 'sell' });
    expect(t.last()).toMatchObject({ phase: 'armed', mode: 'sell' });
    expect(t.listeners()).toBe(1);
    t.placeByHand(workshop, 5, 5);
    expect(t.last().phase).toBe('armed');
  });

  it('disarming takes the listeners off again', () => {
    const t = capturedFill();
    t.column.handle({ action: 'disarm' });
    expect(t.last()).toMatchObject({ phase: 'idle', mode: undefined, capture: undefined });
    expect(t.listeners()).toBe(0);
  });
});

describe('picking up a hand-placed building', () => {
  it('reads the building, its tile and how many more fit below it', () => {
    const t = capturedFill();
    expect(t.last().phase).toBe('captured');
    // 7, 9, 11, 13, 15, 17 fit on a 20-long map.
    expect(t.last().capture).toEqual({
      mode: 'fill',
      direction: 'down',
      name: 'Workshop',
      level: 1,
      configId: 'P_Humans_Workshop_1',
      x: 5,
      y: 5,
      width: 2,
      length: 2,
      available: 6,
    });
    expect(t.last().log[0].text).toBe('Picked up Workshop level 1 at 5,5: 6 more fit below it');
  });

  it('leaves anything but a workshop or manufactory alone', () => {
    const t = setup();
    t.column.handle({ action: 'arm', mode: 'fill' });
    t.placeByHand(residence, 5, 5);
    expect(t.last().phase).toBe('armed');
    expect(t.last().log[0].text).toBe('Not picked up: Residence is not a workshop or a manufactory');
  });

  it('a second hand-placed building replaces the first', () => {
    const t = capturedFill();
    t.placeByHand(workshop, 9, 3);
    expect(t.last().capture).toMatchObject({ x: 9, y: 3 });
  });

  it('ignores placements while idle', () => {
    const t = setup();
    t.placeByHand(workshop, 5, 5);
    expect(t.last()).toBeUndefined();
    expect(t.column.getState().phase).toBe('idle');
  });
});

describe('picking up a hand sale', () => {
  it('reads the run of identical buildings below it, and what one sale refunds', () => {
    const t = capturedSell();
    expect(t.last().phase).toBe('captured');
    expect(t.last().capture).toEqual({
      mode: 'sell',
      direction: 'down',
      name: 'Workshop',
      level: 1,
      configId: 'P_Humans_Workshop_1',
      x: 5,
      y: 5,
      width: 2,
      length: 2,
      available: 3,
      producing: 0,
      refund: [{ id: 'money', amount: 200 }],
    });
    expect(t.last().log[0].text).toBe('Picked up the sale of Workshop level 1 at 5,5: 3 more in a row below it');
  });

  it('counts the ones that are producing', () => {
    const t = setup();
    t.standing(workshop, 5, 5);
    t.standing(workshop, 5, 7, 'production');
    t.standing(workshop, 5, 9, 'finished');
    t.column.handle({ action: 'arm', mode: 'sell' });
    t.sellByHand(5, 5);
    expect(t.last().capture).toMatchObject({ available: 2, producing: 2 });
    expect(t.last().log[0].text).toBe(
      'Picked up the sale of Workshop level 1 at 5,5: 2 more in a row below it, 2 producing',
    );
  });

  it('stops the run at a gap or at a different level', () => {
    const t = setup();
    t.standing(workshop, 5, 5);
    t.standing(workshop, 5, 7);
    t.standing({ ...workshop, get_id: () => 'P_Humans_Workshop_2', get_level: () => 2 }, 5, 9);
    t.standing(workshop, 5, 11);
    t.column.handle({ action: 'arm', mode: 'sell' });
    t.sellByHand(5, 5);
    expect(t.last().capture).toMatchObject({ available: 1 });
  });

  it('only counts a building sitting exactly on the next footprint', () => {
    const t = setup();
    t.standing(workshop, 5, 5);
    // Offset by a tile: its footprint covers 5,7 but it is not in the column.
    const offset = t.standing(workshop, 5, 6);
    t.buildings.set('5,7', offset);
    t.column.handle({ action: 'arm', mode: 'sell' });
    t.sellByHand(5, 5);
    expect(t.last().capture).toMatchObject({ available: 0 });
  });
});

describe('filling', () => {
  it('places one copy at a time and waits for each to be acknowledged', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 2 });
    expect(t.last().phase).toBe('running');
    expect(t.last().target).toBe(2);

    await tick(0);
    expect(t.calls).toEqual(['select P_Humans_Workshop_1', 'hover 5,7', 'click 5,7']);
    expect(t.last().done).toBe(0);

    await tick(SETTLE_POLL_MS * 5);
    expect(clicks(t.calls)).toHaveLength(1);

    t.acknowledgeLast();
    await tick(SETTLE_POLL_MS);
    expect(t.last().done).toBe(1);
    expect(clicks(t.calls)).toEqual(['click 5,7', 'click 5,9']);

    t.acknowledgeLast();
    await tick(SETTLE_POLL_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', done: 2, capture: undefined });
    expect(t.last().reason).toBe('Done: 2 placed below Workshop level 1');
    // One column per arming: nothing is listening once the run is over.
    expect(t.listeners()).toBe(0);
  });

  it('goes as far as the space below allows when given no count', () => {
    const t = capturedFill();
    t.column.handle({ action: 'run' });
    expect(t.last().target).toBe(6);
  });

  it('caps the count at what fits', () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 10 });
    expect(t.last().target).toBe(6);
  });

  it('counts the space again at run time', () => {
    const t = capturedFill();
    t.standing(residence, 5, 9);
    t.column.handle({ action: 'run' });
    expect(t.last().target).toBe(1);
    expect(t.last().capture?.available).toBe(1);
  });

  it('does nothing without a building picked up', () => {
    const t = setup();
    t.column.handle({ action: 'arm', mode: 'fill' });
    t.column.handle({ action: 'run', count: 2 });
    expect(t.last().phase).toBe('armed');
    expect(t.last().log[0].text).toBe('Nothing to do: place or sell a building first');
  });

  it('waits for a builder before each copy', async () => {
    const t = capturedFill();
    t.knobs.workers = 0;
    t.column.handle({ action: 'run', count: 1 });
    await tick(BUILDER_POLL_MS * 3);
    expect(clicks(t.calls)).toHaveLength(0);
    expect(t.last().log.some((entry) => entry.text === 'Waiting for a builder')).toBe(true);

    t.knobs.workers = 1;
    await tick(BUILDER_POLL_MS);
    expect(clicks(t.calls)).toEqual(['click 5,7']);
  });

  it('stops before a copy it cannot pay for', async () => {
    const t = capturedFill();
    t.knobs.missing = ['money', 'supplies'];
    t.column.handle({ action: 'run', count: 1 });
    await tick(0);
    expect(t.calls).toEqual([]);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Stopped: not enough money, supplies' });
  });

  it('stops at the first tile that is no longer free', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 3 });
    await tick(0);
    t.standing(residence, 5, 9);
    t.acknowledgeLast();
    await tick(SETTLE_POLL_MS);
    expect(clicks(t.calls)).toEqual(['click 5,7']);
    expect(t.last()).toMatchObject({ phase: 'idle', done: 1, reason: 'Stopped: 5,9 is not free' });
  });

  it('leaves build mode and stops when a click places nothing', async () => {
    const t = capturedFill();
    t.knobs.placesOnClick = false;
    t.column.handle({ action: 'run', count: 1 });
    await tick(0);
    expect(t.calls).toContain('leave build mode');
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Stopped: the game did not place anything at 5,7' });
  });

  it('stops when the game refuses a placement', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 2 });
    await tick(0);
    t.reject('code 2000');
    await tick(SETTLE_POLL_MS);
    expect(t.last()).toMatchObject({
      phase: 'idle',
      done: 0,
      reason: 'Stopped: the game refused the placement (code 2000)',
    });
    expect(clicks(t.calls)).toHaveLength(1);
  });

  it('gives up on a placement the server never answers', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 2 });
    await tick(SETTLE_TIMEOUT_MS + SETTLE_POLL_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Stopped: the server did not answer the placement' });
    expect(clicks(t.calls)).toHaveLength(1);
  });
});

describe('selling', () => {
  it('sells one building a second, top down, and switches off when done', async () => {
    const t = capturedSell();
    t.column.handle({ action: 'run', count: 2 });
    expect(t.last()).toMatchObject({ phase: 'running', target: 2 });

    await tick(0);
    expect(sales(t.calls)).toEqual(['sell 5,7']);
    expect(t.last().done).toBe(1);
    expect(t.buildings.has('5,7')).toBe(false);

    await tick(SELL_PACE_MS - SETTLE_POLL_MS);
    expect(sales(t.calls)).toHaveLength(1);

    await tick(SETTLE_POLL_MS);
    expect(sales(t.calls)).toEqual(['sell 5,7', 'sell 5,9']);
    expect(t.last().done).toBe(2);

    await tick(SELL_PACE_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', done: 2, capture: undefined });
    expect(t.last().reason).toBe('Done: 2 sold below Workshop level 1');
    expect(t.listeners()).toBe(0);
    expect(t.buildings.has('5,11')).toBe(true);
  });

  it('sells the whole run when given no count', async () => {
    const t = capturedSell();
    t.column.handle({ action: 'run' });
    expect(t.last().target).toBe(3);
    await tick(SELL_PACE_MS * 3);
    expect(sales(t.calls)).toEqual(['sell 5,7', 'sell 5,9', 'sell 5,11']);
    expect(t.buildings.has('5,13')).toBe(true);
    expect(t.last().reason).toBe('Done: 3 sold below Workshop level 1');
  });

  it('counts the run again at run time', () => {
    const t = capturedSell();
    t.sellByHand(5, 9);
    t.column.handle({ action: 'arm', mode: 'sell' });
    t.column.handle({ action: 'run' });
    expect(t.last().target).toBe(1);
  });

  it('leaves a producing building alone unless told to sell it', async () => {
    const t = capturedSell();
    t.buildings.get('5,9')!.state = 'production';
    t.column.handle({ action: 'run' });
    await tick(SELL_PACE_MS * 3);
    expect(sales(t.calls)).toEqual(['sell 5,7']);
    expect(t.last()).toMatchObject({ phase: 'idle', done: 1, reason: 'Stopped: Workshop level 1 at 5,9 is producing' });
  });

  it('sells through a production when told to', async () => {
    const t = capturedSell();
    t.buildings.get('5,9')!.state = 'production';
    t.column.handle({ action: 'run', sellProducing: true });
    await tick(SELL_PACE_MS * 3);
    expect(sales(t.calls)).toHaveLength(3);
  });

  it('never sells a premium building in bulk', async () => {
    const t = capturedSell();
    t.buildings.get('5,7')!.premium = true;
    t.column.handle({ action: 'run' });
    await tick(0);
    expect(sales(t.calls)).toEqual([]);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Stopped: Workshop level 1 at 5,7 is a premium building' });
  });

  it('never sells through a construction', async () => {
    const t = capturedSell();
    t.buildings.get('5,7')!.state = 'upgrading';
    t.column.handle({ action: 'run', sellProducing: true });
    await tick(0);
    expect(sales(t.calls)).toEqual([]);
    expect(t.last().reason).toBe('Stopped: Workshop level 1 at 5,7 is under construction');
  });

  it('stops when the storage cannot take the refund', async () => {
    const t = capturedSell();
    t.knobs.storage = false;
    t.column.handle({ action: 'run' });
    await tick(0);
    expect(sales(t.calls)).toEqual([]);
    expect(t.last().reason).toBe('Stopped: the storage is full, part of the refund would be lost');
  });

  it('stops when the column changed under it', async () => {
    const t = capturedSell();
    t.column.handle({ action: 'run' });
    await tick(0);
    t.buildings.delete('5,9');
    await tick(SELL_PACE_MS);
    expect(sales(t.calls)).toEqual(['sell 5,7']);
    expect(t.last().reason).toBe('Stopped: there is no Workshop level 1 at 5,9 any more');
  });

  it('stops when the game refuses a sale during the pause', async () => {
    const t = capturedSell();
    t.column.handle({ action: 'run' });
    await tick(0);
    t.reject('code 2000');
    await tick(SETTLE_POLL_MS);
    expect(sales(t.calls)).toEqual(['sell 5,7']);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Stopped: the game refused the sale (code 2000)' });
  });

  it('expects the city to be in sell mode, and nothing else', async () => {
    const t = capturedSell();
    t.knobs.mode = SELL_MODE;
    t.column.handle({ action: 'run' });
    await tick(SELL_PACE_MS);
    expect(sales(t.calls)).toHaveLength(2);

    t.knobs.mode = 'ModeTypes/moveMode';
    await tick(SELL_PACE_MS);
    expect(sales(t.calls)).toHaveLength(2);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Stopped: you are busy in the city (moveMode)' });
  });

  it('stops when you sell a building yourself mid-run', async () => {
    const t = capturedSell();
    t.standing(workshop, 12, 12);
    t.column.handle({ action: 'run' });
    await tick(0);
    t.sellByHand(12, 12);
    await tick(SETTLE_POLL_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Stopped: you sold a building yourself' });
    expect(sales(t.calls)).toHaveLength(1);
  });
});

describe('ending a run', () => {
  it('ends at once when the Build/Sell tab is left', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 3 });
    await tick(0);
    t.leaveTab();
    await tick(WATCH_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', done: 0, reason: 'Stopped: the Build/Sell tab was closed' });
    expect(t.listeners()).toBe(0);
    t.acknowledgeLast();
    await tick(SETTLE_POLL_MS * 5);
    expect(clicks(t.calls)).toHaveLength(1);
  });

  it('ends a sell run the same way', async () => {
    const t = capturedSell();
    t.column.handle({ action: 'run' });
    await tick(0);
    t.leaveTab();
    await tick(WATCH_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', done: 1, reason: 'Stopped: the Build/Sell tab was closed' });
    await tick(SELL_PACE_MS * 3);
    expect(sales(t.calls)).toHaveLength(1);
  });

  it('disarms when the Build/Sell tab is left before a run', async () => {
    const t = capturedFill();
    t.leaveTab();
    await tick(WATCH_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Stopped: the Build/Sell tab was closed' });
    expect(t.listeners()).toBe(0);
  });

  it('stops watching the tab once it is off', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'disarm' });
    t.leaveTab();
    const before = t.last();
    await tick(WATCH_MS * 4);
    expect(t.last()).toBe(before);
  });

  it('disarms when the city leaves the screen', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 3 });
    await tick(0);
    t.knobs.refusal = "another player's city is open";
    await tick(SETTLE_POLL_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: "Stopped: another player's city is open" });
    expect(t.listeners()).toBe(0);
  });

  it('stops when you start doing something in the city', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 3 });
    await tick(0);
    t.knobs.mode = 'ModeTypes/moveMode';
    await tick(SETTLE_POLL_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Stopped: you are busy in the city (moveMode)' });
    expect(t.listeners()).toBe(0);
  });

  it('a fill does not take sell mode for granted', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 3 });
    await tick(0);
    t.knobs.mode = SELL_MODE;
    await tick(SETTLE_POLL_MS);
    expect(t.last().reason).toBe('Stopped: you are busy in the city (sellMode)');
  });

  it('stops when you place a building yourself mid-run', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 3 });
    await tick(0);
    t.placeByHand(workshop, 12, 12);
    await tick(SETTLE_POLL_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Stopped: you placed a building yourself' });
    expect(t.last().capture).toBeUndefined();
  });

  it('stops on the button and switches off', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 3 });
    await tick(0);
    t.column.handle({ action: 'stop' });
    await tick(SETTLE_POLL_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Stopped by you' });
    expect(t.listeners()).toBe(0);
    t.acknowledgeLast();
    await tick(SETTLE_POLL_MS * 5);
    expect(clicks(t.calls)).toHaveLength(1);
  });

  it('disarming mid-run ends it and takes the listeners off', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'run', count: 3 });
    await tick(0);
    t.column.handle({ action: 'disarm' });
    await tick(SETTLE_POLL_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', reason: 'Disarmed' });
    expect(t.listeners()).toBe(0);
  });
});

describe('direction', () => {
  it('goes down for a human city and across for an elven one', () => {
    const human = setup();
    expect(human.column.getState().direction).toBe('down');

    const fake = fakeGame();
    fake.knobs.race = 'elves';
    const elven = createColumn(
      fake.game,
      () => undefined,
      () => 0,
    );
    expect(elven.getState().direction).toBe('across');
  });

  it('fills across when asked', async () => {
    const t = setup();
    t.column.handle({ action: 'direction', direction: 'across' });
    t.column.handle({ action: 'arm', mode: 'fill' });
    t.placeByHand(workshop, 5, 5);
    // 7, 9, 11, 13, 15, 17 fit on a 20-wide map.
    expect(t.last().capture).toMatchObject({ direction: 'across', available: 6 });
    expect(t.last().log[0].text).toBe('Picked up Workshop level 1 at 5,5: 6 more fit to the right of it');

    t.column.handle({ action: 'run', count: 2 });
    await tick(0);
    expect(clicks(t.calls)).toEqual(['click 7,5']);
    t.acknowledgeLast();
    await tick(SETTLE_POLL_MS);
    expect(clicks(t.calls)).toEqual(['click 7,5', 'click 9,5']);
    t.acknowledgeLast();
    await tick(SETTLE_POLL_MS);
    expect(t.last().reason).toBe('Done: 2 placed to the right of Workshop level 1');
  });

  it('changing the direction counts the picked-up building again', () => {
    const t = capturedFill();
    t.standing(residence, 5, 7);
    t.column.handle({ action: 'direction', direction: 'across' });
    expect(t.last().capture).toMatchObject({ direction: 'across', available: 6 });
    expect(t.last().log[0].text).toBe('Going across: 6 to the right of it');
    t.column.handle({ action: 'direction', direction: 'down' });
    expect(t.last().capture).toMatchObject({ direction: 'down', available: 0 });
  });

  it('sells across when asked', async () => {
    const t = setup();
    t.standing(workshop, 5, 5);
    t.standing(workshop, 7, 5);
    t.standing(workshop, 9, 5);
    t.standing(residence, 11, 5);
    t.column.handle({ action: 'direction', direction: 'across' });
    t.column.handle({ action: 'arm', mode: 'sell' });
    t.sellByHand(5, 5);
    expect(t.last().capture).toMatchObject({ direction: 'across', available: 2 });

    t.column.handle({ action: 'run' });
    await tick(SELL_PACE_MS * 2);
    expect(sales(t.calls)).toEqual(['sell 7,5', 'sell 9,5']);
    expect(t.last().reason).toBe('Done: 2 sold to the right of Workshop level 1');
  });

  it('keeps the direction from one arming to the next, and leaves a running run alone', async () => {
    const t = capturedFill();
    t.column.handle({ action: 'direction', direction: 'across' });
    t.column.handle({ action: 'run', count: 1 });
    await tick(0);
    t.column.handle({ action: 'direction', direction: 'down' });
    expect(t.last().direction).toBe('across');

    t.acknowledgeLast();
    await tick(SETTLE_POLL_MS);
    expect(t.last()).toMatchObject({ phase: 'idle', direction: 'across' });
  });
});

describe('query', () => {
  it('says where it has got to without changing anything', () => {
    const t = capturedFill();
    const before = t.last();
    t.column.handle({ action: 'query' });
    expect(t.last()).toEqual(before);
  });
});
