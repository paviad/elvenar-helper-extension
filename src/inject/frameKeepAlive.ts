/**
 * Keeps the game running while the tab is hidden.
 *
 * Chrome stops delivering requestAnimationFrame callbacks to a hidden page (a background tab, a
 * minimised window). The whole game hangs off one rAF chain - lime's application loop, and with it
 * enterFrame, GameClock, Starling and innogui validation - so a hidden city stops dead: a loading
 * one on the first frame-driven bootstrap step, a loaded one mid-whatever. Timers are not affected
 * (the game's own Chrome profile runs with background timer throttling disabled), so while the page
 * is hidden a callback parked in the rAF queue is delivered from a timer instead: every 100 ms while
 * the city is loading, every 250 ms once it is up. While the page is visible this is a pure
 * passthrough - the real frame always arrives long before the fallback looks.
 *
 * Running the game is not the same as drawing it. Nobody sees a hidden tab, and four cities each
 * drawing ten frames a second in the background is what makes Chrome lose their WebGL contexts, so
 * once the city is loaded Starling's draw is skipped while hidden: its `render()` still does
 * everything up to and including its `render` event (innogui and Feathers validate on it), it just
 * does not touch the GPU. Loading keeps drawing; it is short and its texture uploads are part of it.
 *
 * GSAP (the page-global TweenLite/TweenMax the game tweens with - the loading bar, the loading
 * screen fade) takes its own copy of requestAnimationFrame when it loads, and it loads before this
 * script runs, so a wrapper on window never reaches its ticker. Its ticker is switched to timers at
 * 10 fps while the page is hidden and back to rAF at its own rate when it is shown.
 *
 * Nothing of ours is ever on the stack when game code runs: the game's callback goes to the browser
 * (or, while hidden, to a timer) exactly as it was given, and a trailing request of our own in the
 * same frame is how the wrapper learns that the frame was painted. A game exception shipped to
 * Sentry therefore carries no extension frames. When the page becomes visible again, a callback
 * still parked in the timer queue is moved back onto a real frame, so the game resumes on the next
 * paint rather than whenever a possibly throttled timer gets round to it.
 */

export type TweenTicker = {
  /** GSAP 1.x/2.x `Ticker.useRAF(value)`: false = drive the ticker from setTimeout. */
  useRAF: (value: boolean) => unknown;
  /** GSAP 1.x/2.x `Ticker.fps(value?)`: with no argument, the current rate. */
  fps: (value?: number) => number;
  /** How to name the engine in the console. */
  label: string;
};

export type FrameKeepAliveHost = {
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (handle: number) => void;
  now: () => number;
  isHidden: () => boolean;
  onVisibilityChange: (listener: () => void) => void;
  /** True while the city is loading - and before the game exists at all. */
  loading: () => boolean;
  /** The tween engine's ticker, if it is loaded and offers the switches. Looked up lazily. */
  tweenTicker: () => TweenTicker | undefined;
  /** Wrap the renderer's draw so `shouldSkip()` can veto it. False while the renderer is not up yet. */
  installDrawSkip: (shouldSkip: () => boolean) => boolean;
  log: (message: string) => void;
};

/** How long a hidden page waits for a real frame before delivering the callback from a timer. */
export const LOADING_PERIOD_MS = 100;
export const LOADED_PERIOD_MS = 250;
/** What the tween engine's ticker is throttled to while the page is hidden. */
export const HIDDEN_TWEEN_FPS = 10;

type Timer = ReturnType<typeof setTimeout>;

type Pending = {
  callback: FrameRequestCallback;
  /** The browser's handle for the callback itself; differs from the map key after a re-arm. */
  native: number;
  /** Our own request, queued right behind the game's in the same frame: it running means the frame was painted. */
  sentinel: number | undefined;
  poll: Timer | undefined;
  /** Set while the callback is parked in the timer queue. */
  deliver: Timer | undefined;
  cleanup: Timer | undefined;
};

export const installFrameKeepAlive = (host: FrameKeepAliveHost) => {
  const pending = new Map<number, Pending>();
  let tickerOnTimers = false;
  let tickerRate: number | undefined;
  let drawSkipInstalled = false;

  const shouldSkipDraw = () => host.isHidden() && !host.loading();
  const period = () => (host.loading() ? LOADING_PERIOD_MS : LOADED_PERIOD_MS);

  /** Everything that follows the page's visibility: the draw veto, the tween engine's ticker. */
  const settle = (hidden: boolean) => {
    if (hidden && !drawSkipInstalled) drawSkipInstalled = host.installDrawSkip(shouldSkipDraw);
    if (hidden === tickerOnTimers) return undefined;
    const ticker = host.tweenTicker();
    if (!ticker) return undefined;
    if (hidden) {
      tickerRate = ticker.fps();
      ticker.useRAF(false);
      ticker.fps(HIDDEN_TWEEN_FPS);
    } else {
      if (tickerRate !== undefined) ticker.fps(tickerRate);
      ticker.useRAF(true);
    }
    tickerOnTimers = hidden;
    return ticker;
  };

  const clearTimers = (entry: Pending) => {
    for (const timer of [entry.poll, entry.deliver, entry.cleanup]) {
      if (timer !== undefined) clearTimeout(timer);
    }
    entry.poll = entry.deliver = entry.cleanup = undefined;
  };

  const forget = (handle: number, entry: Pending) => {
    pending.delete(handle);
    clearTimers(entry);
  };

  const withdraw = (entry: Pending) => {
    host.cancelAnimationFrame(entry.native);
    if (entry.sentinel !== undefined) host.cancelAnimationFrame(entry.sentinel);
    entry.sentinel = undefined;
  };

  /** Queue the callback on a real frame, with the sentinel behind it and the fallback watching. */
  const arm = (handle: number, entry: Pending, native: number) => {
    entry.native = native;
    entry.sentinel = host.requestAnimationFrame(() => {
      if (pending.get(handle) === entry) forget(handle, entry);
    });

    const poll = () => {
      entry.poll = undefined;
      if (pending.get(handle) !== entry) return;
      const hidden = host.isHidden();
      settle(hidden);
      if (!hidden) {
        entry.poll = setTimeout(poll, period());
        return;
      }
      withdraw(entry);
      // Handed to the timer queue as is, so the game code runs with nothing of ours above it; the
      // cleanup behind it (timers fire in order) is what tells us it ran.
      entry.deliver = setTimeout(entry.callback, 0, host.now());
      entry.cleanup = setTimeout(() => {
        if (pending.get(handle) === entry) pending.delete(handle);
      }, 0);
    };
    entry.poll = setTimeout(poll, period());
  };

  const requestAnimationFrame = (callback: FrameRequestCallback) => {
    const handle = host.requestAnimationFrame(callback);
    const entry: Pending = {
      callback,
      native: handle,
      sentinel: undefined,
      poll: undefined,
      deliver: undefined,
      cleanup: undefined,
    };
    pending.set(handle, entry);
    arm(handle, entry, handle);
    return handle;
  };

  const cancelAnimationFrame = (handle: number) => {
    const entry = pending.get(handle);
    if (entry) {
      forget(handle, entry);
      withdraw(entry);
      return;
    }
    host.cancelAnimationFrame(handle);
  };

  host.onVisibilityChange(() => {
    const hidden = host.isHidden();
    const ticker = settle(hidden);
    if (hidden) {
      const how = host.loading() ? 'loading, so still drawing' : 'loaded, so not drawing';
      host.log(
        `tab hidden - game frames are driven by timers (${how})${ticker ? `, ${ticker.label} ticker on timers at ${HIDDEN_TWEEN_FPS} fps` : ''}`,
      );
      return;
    }
    let rearmed = 0;
    for (const [handle, entry] of pending) {
      if (entry.deliver === undefined) continue;
      clearTimers(entry);
      arm(handle, entry, host.requestAnimationFrame(entry.callback));
      rearmed++;
    }
    host.log(
      `tab visible - game frames are back on requestAnimationFrame${rearmed ? ` (${rearmed} parked callback${rearmed === 1 ? '' : 's'} moved onto a real frame)` : ''}`,
    );
  });

  return { requestAnimationFrame, cancelAnimationFrame };
};

type TweenLiteGlobal = {
  version?: unknown;
  ticker?: { useRAF?: unknown; fps?: unknown };
};

type StarlingLike = {
  get_contextValid: () => boolean;
  makeCurrent: () => void;
  updateViewPort: () => void;
  dispatchEventWith: (type: string) => void;
};

type GameGlobals = {
  aviad?: Record<string, { prototype?: Record<string, unknown> } | undefined>;
  aviad_am?: { get_isLoading?: unknown };
};

const gameGlobals = () => window as unknown as GameGlobals;

export const browserFrameKeepAliveHost = (): FrameKeepAliveHost => ({
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  now: () => performance.now(),
  isHidden: () => document.visibilityState === 'hidden',
  onVisibilityChange: (listener) => document.addEventListener('visibilitychange', listener),
  loading: () => {
    const model = gameGlobals().aviad_am;
    if (!model || typeof model.get_isLoading !== 'function') return true;
    try {
      return Boolean((model.get_isLoading as () => unknown).call(model));
    } catch {
      return false;
    }
  },
  tweenTicker: () => {
    const tweenLite = (window as unknown as { TweenLite?: TweenLiteGlobal }).TweenLite;
    const ticker = tweenLite?.ticker;
    if (typeof ticker?.useRAF !== 'function' || typeof ticker.fps !== 'function') return undefined;
    return {
      useRAF: (value: boolean) => (ticker.useRAF as (value: boolean) => unknown).call(ticker, value),
      fps: (value?: number) =>
        value === undefined
          ? Number((ticker.fps as () => unknown).call(ticker))
          : Number((ticker.fps as (value: number) => unknown).call(ticker, value)),
      label: `GSAP ${typeof tweenLite?.version === 'string' ? tweenLite.version : '?'}`,
    };
  },
  installDrawSkip: (shouldSkip) => {
    const proto = gameGlobals().aviad?.['starling.core.Starling']?.prototype;
    const draw = proto?.render;
    const intact =
      proto &&
      typeof draw === 'function' &&
      ['get_contextValid', 'makeCurrent', 'updateViewPort', 'dispatchEventWith'].every(
        (method) => typeof proto[method] === 'function',
      );
    if (!intact) return false;
    proto.render = function (this: StarlingLike) {
      if (!shouldSkip()) {
        (draw as (this: StarlingLike) => void).call(this);
        return;
      }
      // What Starling.render does before it draws, so listeners of its `render` event still run.
      if (!this.get_contextValid()) return;
      this.makeCurrent();
      this.updateViewPort();
      this.dispatchEventWith('render');
    };
    return true;
  },
  log: (message) => console.log(message),
});

/** Wire the keep-alive into the page. Must run before the game bundle so lime looks up the wrapper. */
export const keepFramesAliveWhileHidden = () => {
  const frames = installFrameKeepAlive(browserFrameKeepAliveHost());
  window.requestAnimationFrame = frames.requestAnimationFrame;
  window.cancelAnimationFrame = frames.cancelAnimationFrame;
};
