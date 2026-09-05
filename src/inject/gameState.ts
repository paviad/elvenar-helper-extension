// Whether the game is in a state where driving it means anything at all.
//
// The extension's actions are written against a city that is on screen and a session that is
// still alive. Neither is a given: the game swaps the whole entity model out to show you a
// neighbour's city, and it declares its own session over after forty minutes away from the
// window. Acting through either is not a request the game would ever make of itself.
// (rev-eng/06 §4.16)
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { AviadModuleName } from './aviad';

/** `de.innogames.onyx.constants.ApplicationModuleName`, by its `_hx_index`. */
const MODULE_BY_INDEX = [
  'OTHER_CITY',
  'OWN_CITY',
  'TECH_TREE',
  'WORLD_MAP',
  'BATTLE',
  'MULTIPLAYER',
  'SPIRE',
  'UNKNOWN',
];

const UNKNOWN = 'UNKNOWN';
const OWN_CITY = 'OWN_CITY';

/** What the game is showing and whether it is still worth talking to. */
export interface GameState {
  /** The module on screen, named as the game's own enum names it. `UNKNOWN` before it boots. */
  module: string;
  /** Whether the game is mid-transition - booting, or loading a city it is about to show. */
  loading: boolean;
  /**
   * Why the game is past being worth talking to, in the game's own words where it has any, or
   * nothing while it is fine. Three ways in - the server ending the session, the client's own
   * timeout, and the connection giving out - and not one of them comes back without a reload,
   * which is why this is a reason rather than a state to wait out.
   */
  unusable?: string;
}

export interface GameStateMessage {
  type: 'gameState';
  payload: GameState;
}

/**
 * Which module an `ApplicationModuleName` value is.
 *
 * `_hx_name` is the truth where it is there, but `BATTLE` is the one constructor of the eight
 * that takes a parameter, so its values carry only an index - the name sits on the constructor
 * function instead. The index table covers that case and no other.
 */
const moduleName = (value: AviadModuleName | undefined) => {
  if (typeof value?._hx_name === 'string') {
    return value._hx_name;
  }
  return (value?._hx_index !== undefined && MODULE_BY_INDEX[value._hx_index]) || UNKNOWN;
};

/**
 * What `ApplicationModel` says about itself.
 *
 * Passed in rather than read, so the decoding can be exercised without a game to read it from.
 * Nothing there at all is the state before `injectMutate` has captured it: no module, and
 * loading, since a game that has not started is not one to send anything to.
 */
export const applicationModelState = (model: typeof window.aviad_am | undefined) => ({
  module: moduleName(model?.currentModule?.getValue()),
  loading: model ? model.get_isLoading() : true,
});

/**
 * Why the game stopped being worth talking to, once it has. One-way: every way in ends with the
 * player reloading the page, which is what clears this along with everything else.
 */
let unusable: string | undefined;

/** The first reason stands: what went wrong first is what the later noise is downstream of. */
export const noteGameUnusable = (why: string) => {
  if (unusable) {
    return;
  }
  unusable = why;
  console.log('gameState: the game is past talking to -', why);
  publishGameState();
};

/** `ConnectionServiceErrorEvent/ERROR` - see `watchConnectionErrors`. */
const CONNECTION_ERROR = 'ConnectionServiceErrorEvent/ERROR';

/** Set once the listener is on, so the retry that puts it there can stop trying. */
let listening = false;

/**
 * The transport giving out, which is the worst of the three and the quietest.
 *
 * `HttpConnectionProvider.onIOError` (L658133) puts up "Stream Error. Could not process
 * request..." and **does not clear `_waitingForResponse`**. Every route to the wire goes through
 * `_flushBuffer` (L17417), which returns early while that flag is set, and the flag is cleared in
 * exactly one place - `onResult` (L17345), a reply that is never coming. `immediate()` is no
 * exception; it reaches `_flushBuffer` like everything else. So the game is mute from that moment
 * on, requests pile up in `_requestBuffer`, and nothing about the client's own state says so:
 * the models are intact and every dispatch still looks like it worked.
 *
 * Listening rather than patching `onIOError`, because the same event is how the game reports a
 * world under maintenance (`HttpStatusHandler` on 503, re-dispatched by `onReceivedFromServer`
 * L658115) and a failed static-data load (L580898) - all three raise the same window, whose only
 * button reloads the page. The game's own text is kept as the reason, so the extension says what
 * the player is already reading on screen.
 *
 * Registered on the main context dispatcher, which is where `commandMap.map(…)` (L389973) picks
 * the same event up. That needs DI, so it is retried until it takes.
 */
export const watchConnectionErrors = () => {
  if (listening) {
    return true;
  }
  const dispatcher = window.aviad_am?.injector?.getInstance(window.aviad?.['openfl.events.IEventDispatcher']);
  if (!dispatcher?.addEventListener) {
    return false;
  }
  dispatcher.addEventListener(CONNECTION_ERROR, (event) => {
    // On the game's own dispatch stack, so nothing of ours may throw from here: an exception
    // that is not an `openfl.errors.Error` is rethrown rather than logged, and takes the rest of
    // the listeners for this event with it (04 §3).
    try {
      noteGameUnusable(event?.text || 'the game reported a connection error');
    } catch (error) {
      console.warn('gameState: could not record the connection error', error);
    }
  });
  listening = true;
  return true;
};

/**
 * The server ending the session from its side.
 *
 * It pushes `ExceptionService/redirect`, and all the game does with it is call the host page's
 * `showRedirectLayer` - a layer over the top. The client underneath stays alive and goes on
 * accepting everything dispatched at it, so nothing about the game itself gives this away.
 *
 * Reads the frame as it arrived, before anything filters it: the redirect is not one of the
 * responses the matchers ask for, so a filtered list would never carry it.
 */
export const noteSessionEndingResponses = (body: unknown) => {
  if (!Array.isArray(body)) {
    return;
  }
  for (const response of body as ElvenarRequestResponseEntry[]) {
    if (response?.requestClass === 'ExceptionService' && response.requestMethod === 'redirect') {
      const redirect = response.responseData as { message?: string } | undefined;
      noteGameUnusable(redirect?.message || 'the server asked the client to redirect');
    }
  }
};

/** The client's own timeout, kept as a backstop. See the note in `readGameState`. */
const TIMED_OUT = 'the session timed out';

export const readGameState = (): GameState => ({
  ...applicationModelState(window.aviad_am),
  // Whatever has been noticed, and the game's own session verdict behind it. The second should
  // never come now that `preventSessionTimeout` has taken the forty-minute watchdog out - it is
  // read anyway as the one thing that still reports it if that patch ever fails to land, which
  // it does quietly by design rather than taking the game down with it.
  unusable: unusable ?? (window.aviad_am?._reloadWindowShown === true ? TIMED_OUT : undefined),
});

/** How each module reads when it is the reason nothing is being done. */
const MODULE_REASONS: Record<string, string> = {
  OTHER_CITY: "another player's city is open",
  WORLD_MAP: 'the world map is open',
  TECH_TREE: 'the research tree is open',
  BATTLE: 'a battle is on',
  MULTIPLAYER: 'the multiplayer map is open',
  SPIRE: 'the Spire is open',
  UNKNOWN: 'the city is not on screen',
};

/**
 * Why acting on your own city would be wrong right now, or nothing when it would not be.
 *
 * Visiting a neighbour is the case worth spelling out: `VisitOtherPlayerCommand` fills the one
 * shared `ICityEntitiesModel` with the visited city, and that is the model every id the
 * extension holds is looked up in. A poll landing mid-visit resolves your building ids against
 * someone else's city, and ids are only unique within one.
 */
export const cityRefusal = ({ module, loading, unusable }: GameState) => {
  if (unusable) {
    return unusable;
  }
  if (module !== OWN_CITY) {
    return MODULE_REASONS[module] || `the game is in ${module}`;
  }
  return loading ? 'the game is still loading' : undefined;
};

/**
 * Every message type `inject-main` acts on, and how far it reaches:
 *
 * - `city` - through the shared entity model, so it means your city and no other.
 * - `game` - straight at a service, which is the player's business wherever they are standing.
 * - `local` - never leaves the page, so nothing about the game can be a reason not to.
 *
 * Anything absent is not one of ours - the page's own postMessage traffic goes through the same
 * listener - and is left alone rather than refused.
 */
const RELAYED: Record<string, 'city' | 'game' | 'local'> = {
  CAST_EE: 'city',
  pickupProduction: 'city',
  startProduction: 'city',
  helpPlayer: 'game',
  neighbourHelpBuildings: 'game',
  getNeighborlyHelpBuildings: 'game',
  fetchWorldNeighbors: 'game',
  tournyFight: 'game',
  tournyOpen: 'game',
  tournyCater: 'game',
  visitPlayer: 'game',
  nextPage: 'game',
  spirePicks: 'local',
  // Checks the city itself, on arming and before every step it takes, and a stop or disarm has
  // to get through whatever the game is showing.
  column: 'local',
};

/**
 * Why a relayed message should not be acted on, or nothing when it should.
 *
 * The state is fetched rather than passed because most of what reaches the listener is not ours
 * at all - every socket frame and every aggregated response is posted to the same window - and
 * reading it means `getValue()` on the game's own computed observable, which walks its
 * subscriptions and recomputes if any has moved. Worth doing for an action, not per frame.
 */
export const relayRefusal = (type: string, readState: () => GameState) => {
  const reach = RELAYED[type];
  if (!reach || reach === 'local') {
    return undefined;
  }
  const state = readState();
  return state.unusable ?? (reach === 'city' ? cityRefusal(state) : undefined);
};

/** How often the page tells the overlay where the game has got to. */
export const GAME_STATE_PUBLISH_MS = 1000;

/** The last state posted, so the overlay only hears when something has actually changed. */
let published: string | undefined;

export const publishGameState = () => {
  const payload = readGameState();
  const latest = JSON.stringify(payload);
  if (latest === published) {
    return;
  }
  published = latest;
  window.postMessage({ type: 'gameState', payload } satisfies GameStateMessage, '*');
};

/**
 * Keep the overlay told, and get the connection listener on as soon as there is a context to put
 * it on. Polled rather than bound: the module is a `tink.state` observable and binding to one
 * from outside means building the binding class by hand, where two property reads a second cost
 * nothing and cannot go stale against a new snapshot of the bundle. The listener is the reason
 * the tick has to keep coming back at all - it needs DI, so it cannot go on at load.
 */
export const startPublishingGameState = () => {
  const tick = () => {
    watchConnectionErrors();
    publishGameState();
  };
  tick();
  return setInterval(tick, GAME_STATE_PUBLISH_MS);
};
