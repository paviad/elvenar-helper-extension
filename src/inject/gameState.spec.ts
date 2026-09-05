import { applicationModelState, cityRefusal, GameState, relayRefusal } from './gameState';

const OWN_CITY = { _hx_name: 'OWN_CITY', _hx_index: 1 };
const OTHER_CITY = { _hx_name: 'OTHER_CITY', _hx_index: 0 };

/** As the game reads when nothing is wrong with it. */
const settled = (patch: Partial<GameState> = {}): GameState => ({
  module: 'OWN_CITY',
  loading: false,
  unusable: undefined,
  ...patch,
});

/** Enough of `ApplicationModel` to be read like one. */
const applicationModel = (module: unknown, loading = false) =>
  ({
    currentModule: { getValue: () => module },
    get_isLoading: () => loading,
  }) as unknown as typeof window.aviad_am;

describe('applicationModelState', () => {
  it('reads the module the game says it is showing', () => {
    expect(applicationModelState(applicationModel(OWN_CITY))).toEqual({ module: 'OWN_CITY', loading: false });
    expect(applicationModelState(applicationModel(OTHER_CITY))).toEqual({ module: 'OTHER_CITY', loading: false });
  });

  it('names a battle by its index, since that enum value carries no name', () => {
    // `BATTLE` is the one constructor that takes a parameter, so `_hx_name` lives on the
    // constructor function and its values go without.
    expect(applicationModelState(applicationModel({ _hx_index: 4, type: 'tournament' })).module).toBe('BATTLE');
  });

  it('reads a game that has not booted as loading and nowhere', () => {
    expect(applicationModelState(undefined)).toEqual({ module: 'UNKNOWN', loading: true });
  });

  it('reads a module it cannot make sense of as unknown rather than guessing at one', () => {
    expect(applicationModelState(applicationModel(undefined)).module).toBe('UNKNOWN');
    expect(applicationModelState(applicationModel({ _hx_index: 99 })).module).toBe('UNKNOWN');
  });

  it('passes on that the game is mid-transition', () => {
    expect(applicationModelState(applicationModel(OWN_CITY, true)).loading).toBe(true);
  });
});

describe('cityRefusal', () => {
  it('allows a settled own city', () => {
    expect(cityRefusal(settled())).toBeUndefined();
  });

  it('turns away a visit to a neighbour, whose city the entity model now holds', () => {
    expect(cityRefusal(settled({ module: 'OTHER_CITY' }))).toBe("another player's city is open");
  });

  it('turns away every other module too', () => {
    expect(cityRefusal(settled({ module: 'WORLD_MAP' }))).toBe('the world map is open');
    expect(cityRefusal(settled({ module: 'SPIRE' }))).toBe('the Spire is open');
    expect(cityRefusal(settled({ module: 'BATTLE' }))).toBe('a battle is on');
    expect(cityRefusal(settled({ module: 'UNKNOWN' }))).toBe('the city is not on screen');
  });

  it('names a module it has no wording for rather than saying nothing about it', () => {
    expect(cityRefusal(settled({ module: 'ARCADE' }))).toBe('the game is in ARCADE');
  });

  it('waits out a city that is still loading', () => {
    expect(cityRefusal(settled({ loading: true }))).toBe('the game is still loading');
  });

  it('gives the session as the reason before anything else, since it is the one that lasts', () => {
    expect(cityRefusal(settled({ unusable: 'the session has timed out' }))).toBe('the session has timed out');
    expect(cityRefusal(settled({ unusable: 'the session has timed out', module: 'OTHER_CITY' }))).toBe(
      'the session has timed out',
    );
  });
});

describe('relayRefusal', () => {
  it('lets a settled own city through', () => {
    expect(relayRefusal('startProduction', () => settled())).toBeUndefined();
    expect(relayRefusal('pickupProduction', () => settled())).toBeUndefined();
    expect(relayRefusal('CAST_EE', () => settled())).toBeUndefined();
  });

  it('holds the city actions back wherever else the game is', () => {
    const visiting = () => settled({ module: 'OTHER_CITY' });
    expect(relayRefusal('startProduction', visiting)).toBe("another player's city is open");
    expect(relayRefusal('pickupProduction', visiting)).toBe("another player's city is open");
    expect(relayRefusal('CAST_EE', visiting)).toBe("another player's city is open");
  });

  it('lets the rest through from wherever, since that is where they are done from', () => {
    // Visiting is what the neighbourly help is for, and a tournament is fought off the map.
    const visiting = () => settled({ module: 'OTHER_CITY' });
    expect(relayRefusal('visitPlayer', visiting)).toBeUndefined();
    expect(relayRefusal('helpPlayer', visiting)).toBeUndefined();
    expect(relayRefusal('tournyFight', () => settled({ module: 'WORLD_MAP' }))).toBeUndefined();
    expect(relayRefusal('tournyCater', () => settled({ module: 'BATTLE' }))).toBeUndefined();
  });

  it('stops everything that reaches the game once the session is over', () => {
    const over = () => settled({ unusable: 'the session has timed out' });
    for (const type of ['startProduction', 'pickupProduction', 'CAST_EE', 'visitPlayer', 'helpPlayer', 'tournyFight']) {
      expect(relayRefusal(type, over)).toBe('the session has timed out');
    }
  });

  it('leaves alone what never reaches the game', () => {
    expect(relayRefusal('spirePicks', () => settled({ unusable: 'the session has timed out' }))).toBeUndefined();
  });

  it('leaves alone traffic that is not ours - the page posts to this listener too', () => {
    const over = () => settled({ unusable: 'the session has timed out' });
    expect(relayRefusal('RECEIVED_WEBSOCKET_MESSAGE', over)).toBeUndefined();
    expect(relayRefusal('aggregateRequestResponse', over)).toBeUndefined();
    expect(relayRefusal('gameState', over)).toBeUndefined();
  });

  it('does not go near the game for a message that is not one of ours', () => {
    // Reading the state means `getValue()` on the game's own computed observable, and every
    // socket frame and aggregated response comes through this same listener.
    const read = jest.fn(settled);
    relayRefusal('RECEIVED_WEBSOCKET_MESSAGE', read);
    relayRefusal('spirePicks', read);
    expect(read).not.toHaveBeenCalled();

    relayRefusal('startProduction', read);
    expect(read).toHaveBeenCalledTimes(1);
  });
});

describe('noteSessionEndingResponses', () => {
  /**
   * A module of its own each time, since the latch is one-way by design - once a session is
   * over it stays over for the life of the page.
   */
  const freshModule = () => {
    let module!: typeof import('./gameState');
    jest.isolateModules(() => {
      module = jest.requireActual<typeof import('./gameState')>('./gameState');
    });
    return module;
  };

  const posted: unknown[] = [];

  beforeEach(() => {
    posted.length = 0;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    (globalThis as { window?: unknown }).window = {
      postMessage: (message: unknown) => posted.push(message),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { window?: unknown }).window;
  });

  const redirect = (message: string) => [
    {
      __class__: 'ServerResponseVO',
      requestClass: 'ExceptionService',
      requestMethod: 'redirect',
      requestId: 1,
      requestData: [],
      responseData: { __class__: 'RedirectVO', url: 'https://en1.elvenar.com/', message },
    },
  ];

  it('ends the session on the redirect the server pushes to end it, in the server words', () => {
    const module = freshModule();
    expect(module.readGameState().unusable).toBeUndefined();
    module.noteSessionEndingResponses(redirect('Your session has expired.'));
    expect(module.readGameState().unusable).toBe('Your session has expired.');
  });

  it('tells the overlay straight away rather than waiting for the next report', () => {
    const module = freshModule();
    module.noteSessionEndingResponses(redirect('Your session has expired.'));
    expect(posted).toContainEqual({
      type: 'gameState',
      payload: { module: 'UNKNOWN', loading: true, unusable: 'Your session has expired.' },
    });
  });

  it('finds the redirect among the responses it arrives with', () => {
    const module = freshModule();
    module.noteSessionEndingResponses([
      { requestClass: 'CityResourcesService', requestMethod: 'getResources', responseData: {} },
      ...redirect('Your session has expired.'),
    ]);
    expect(module.readGameState().unusable).toBe('Your session has expired.');
  });

  it('leaves the session alone for anything else the server says', () => {
    const module = freshModule();
    module.noteSessionEndingResponses([
      { requestClass: 'ExceptionService', requestMethod: 'exception', responseData: { code: 2000 } },
      { requestClass: 'CityProductionService', requestMethod: 'startProductions', responseData: {} },
    ]);
    expect(module.readGameState().unusable).toBeUndefined();
  });

  it('is untroubled by a frame that is not a list of responses at all', () => {
    const module = freshModule();
    expect(() => module.noteSessionEndingResponses({ chat: 'hello' })).not.toThrow();
    expect(() => module.noteSessionEndingResponses(undefined)).not.toThrow();
    expect(module.readGameState().unusable).toBeUndefined();
  });

  it('keeps the first reason - what went wrong first is what the rest is downstream of', () => {
    const module = freshModule();
    module.noteGameUnusable('Stream Error. Could not process request...');
    module.noteSessionEndingResponses(redirect('Your session has expired.'));
    expect(module.readGameState().unusable).toBe('Stream Error. Could not process request...');
  });
});

describe('watchConnectionErrors', () => {
  const freshModule = () => {
    let module!: typeof import('./gameState');
    jest.isolateModules(() => {
      module = jest.requireActual<typeof import('./gameState')>('./gameState');
    });
    return module;
  };

  /** A context dispatcher that records what was listened for and can fire it. */
  const fakeGame = ({ withDispatcher = true } = {}) => {
    const listeners = new Map<string, (event: { text?: string }) => void>();
    const dispatcher = {
      addEventListener: (type: string, listener: (event: { text?: string }) => void) => {
        listeners.set(type, listener);
      },
    };
    const getInstance = jest.fn(() => (withDispatcher ? dispatcher : undefined));
    (globalThis as { window?: unknown }).window = {
      postMessage: () => undefined,
      aviad: { 'openfl.events.IEventDispatcher': 'IEventDispatcher' },
      aviad_am: {
        injector: { getInstance },
        currentModule: { getValue: () => ({ _hx_name: 'OWN_CITY' }) },
        get_isLoading: () => false,
      },
    };
    return { listeners, getInstance };
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { window?: unknown }).window;
  });

  it('takes the game out of use on a stream error, in the words the player is reading', () => {
    const { listeners } = fakeGame();
    const module = freshModule();
    expect(module.watchConnectionErrors()).toBe(true);

    // `HttpConnectionProvider.onIOError` - and from here the provider never sends again.
    listeners.get('ConnectionServiceErrorEvent/ERROR')!({ text: 'Stream Error. Could not process request...' });
    expect(module.readGameState().unusable).toBe('Stream Error. Could not process request...');
  });

  it('covers the other two things that raise the same window', () => {
    const { listeners } = fakeGame();
    const module = freshModule();
    module.watchConnectionErrors();

    // `HttpStatusHandler` on a 503, re-dispatched onto the context by `onReceivedFromServer`.
    listeners.get('ConnectionServiceErrorEvent/ERROR')!({
      text: 'This world is currently being updated. Please try again later.',
    });
    expect(module.readGameState().unusable).toBe('This world is currently being updated. Please try again later.');
  });

  it('has something to say even when the event carries no text', () => {
    const { listeners } = fakeGame();
    const module = freshModule();
    module.watchConnectionErrors();

    listeners.get('ConnectionServiceErrorEvent/ERROR')!({});
    expect(module.readGameState().unusable).toBe('the game reported a connection error');
  });

  it('registers once and then stops asking - the tick calls it every second', () => {
    const { listeners, getInstance } = fakeGame();
    const module = freshModule();

    expect(module.watchConnectionErrors()).toBe(true);
    expect(module.watchConnectionErrors()).toBe(true);
    expect(module.watchConnectionErrors()).toBe(true);
    expect(getInstance).toHaveBeenCalledTimes(1);
    expect(listeners.size).toBe(1);
  });

  it('never throws back into the game, whose dispatch stack it is standing on', () => {
    const { listeners } = fakeGame();
    const module = freshModule();
    module.watchConnectionErrors();
    // A half-built model is the shape of it: an exception from here is rethrown by the game
    // rather than logged, and takes the rest of the listeners for this event with it.
    (globalThis as { window: { aviad_am: unknown } }).window.aviad_am = { get_isLoading: null };
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() => listeners.get('ConnectionServiceErrorEvent/ERROR')!({ text: 'Stream Error.' })).not.toThrow();
  });

  it('says it is not on yet when the game has no context to listen on', () => {
    fakeGame({ withDispatcher: false });
    const module = freshModule();
    expect(module.watchConnectionErrors()).toBe(false);

    (globalThis as { window?: unknown }).window = { postMessage: () => undefined };
    expect(module.watchConnectionErrors()).toBe(false);
  });
});
