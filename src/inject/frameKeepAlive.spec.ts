import {
  HIDDEN_TWEEN_FPS,
  installFrameKeepAlive,
  LOADED_PERIOD_MS,
  LOADING_PERIOD_MS,
  TweenTicker,
} from './frameKeepAlive';

/**
 * A stand-in for the browser and the game: frames are queued and only arrive when the test says
 * so, which is exactly what a hidden tab looks like from the page's point of view.
 */
const fakeBrowser = () => {
  const frames = new Map<number, FrameRequestCallback>();
  const listeners: (() => void)[] = [];
  const logs: string[] = [];
  let nextHandle = 1;
  let hidden = false;
  let loading = true;
  let rendererUp = false;
  let skipDraw: (() => boolean) | undefined;
  let ticker: (TweenTicker & { calls: unknown[] }) | undefined;

  const host = {
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      const handle = nextHandle++;
      frames.set(handle, callback);
      return handle;
    },
    cancelAnimationFrame: (handle: number) => {
      frames.delete(handle);
    },
    now: () => Date.now(),
    isHidden: () => hidden,
    onVisibilityChange: (listener: () => void) => {
      listeners.push(listener);
    },
    loading: () => loading,
    tweenTicker: () => ticker,
    installDrawSkip: (shouldSkip: () => boolean) => {
      if (!rendererUp) return false;
      skipDraw = shouldSkip;
      return true;
    },
    log: (message: string) => {
      logs.push(message);
    },
  };

  return {
    host,
    logs,
    queuedFrames: () => frames.size,
    /** The browser paints a frame: every queued callback runs with the frame's timestamp. */
    deliverFrame: (timestamp: number) => {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(timestamp));
    },
    setHidden: (value: boolean) => {
      hidden = value;
      listeners.forEach((listener) => listener());
    },
    setLoading: (value: boolean) => {
      loading = value;
    },
    bringRendererUp: () => {
      rendererUp = true;
    },
    drawSkipped: () => skipDraw?.(),
    loadTweenEngine: (rate = 60) => {
      const calls: unknown[] = [];
      let fps = rate;
      ticker = {
        label: 'GSAP 2.1.3',
        calls,
        useRAF: (value: boolean) => {
          calls.push(`useRAF ${value}`);
        },
        fps: (value?: number) => {
          if (value !== undefined) {
            calls.push(`fps ${value}`);
            fps = value;
          }
          return fps;
        },
      };
      return ticker;
    },
  };
};

// The hop through the timer queue costs one extra tick under fake timers.
const hop = 1;

describe('installFrameKeepAlive', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is a passthrough while the page is visible', () => {
    const browser = fakeBrowser();
    const frames = installFrameKeepAlive(browser.host);
    const callback = jest.fn();

    frames.requestAnimationFrame(callback);
    browser.deliverFrame(16.7);
    jest.advanceTimersByTime(10 * LOADED_PERIOD_MS);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(16.7);
  });

  it('delivers a parked callback from a timer once the page is hidden', () => {
    const browser = fakeBrowser();
    const frames = installFrameKeepAlive(browser.host);
    const callback = jest.fn();
    browser.setHidden(true);

    frames.requestAnimationFrame(callback);
    jest.advanceTimersByTime(LOADING_PERIOD_MS - 1);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1 + hop);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.any(Number));
    // The real request is withdrawn so the callback cannot run a second time when frames resume.
    expect(browser.queuedFrames()).toBe(0);
  });

  it('picks up a callback that was parked before the page went hidden', () => {
    const browser = fakeBrowser();
    const frames = installFrameKeepAlive(browser.host);
    const callback = jest.fn();

    frames.requestAnimationFrame(callback);
    jest.advanceTimersByTime(3 * LOADING_PERIOD_MS);
    expect(callback).not.toHaveBeenCalled();

    browser.setHidden(true);
    jest.advanceTimersByTime(LOADING_PERIOD_MS + hop);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('keeps a self-rescheduling loop going, faster while loading than once the city is up', () => {
    const browser = fakeBrowser();
    const frames = installFrameKeepAlive(browser.host);
    let ticks = 0;
    const loop = () => {
      ticks++;
      frames.requestAnimationFrame(loop);
    };
    browser.setHidden(true);

    frames.requestAnimationFrame(loop);
    jest.advanceTimersByTime(1000);
    // Each round trip is the period plus the hop through the timer queue.
    expect(ticks).toBeGreaterThanOrEqual(1000 / LOADING_PERIOD_MS - 1);
    expect(ticks).toBeLessThanOrEqual(1000 / LOADING_PERIOD_MS);

    browser.setLoading(false);
    ticks = 0;
    jest.advanceTimersByTime(1000);
    expect(ticks).toBeGreaterThanOrEqual(1000 / LOADED_PERIOD_MS - 1);
    expect(ticks).toBeLessThanOrEqual(1000 / LOADED_PERIOD_MS);
  });

  it('runs a callback only once when the real frame beats the fallback', () => {
    const browser = fakeBrowser();
    const frames = installFrameKeepAlive(browser.host);
    const callback = jest.fn();
    browser.setHidden(true);

    frames.requestAnimationFrame(callback);
    jest.advanceTimersByTime(LOADING_PERIOD_MS / 2);
    browser.deliverFrame(42);
    jest.advanceTimersByTime(10 * LOADING_PERIOD_MS);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(42);
  });

  it('honours cancelAnimationFrame on both paths', () => {
    const browser = fakeBrowser();
    const frames = installFrameKeepAlive(browser.host);
    const callback = jest.fn();
    browser.setHidden(true);

    const handle = frames.requestAnimationFrame(callback);
    frames.cancelAnimationFrame(handle);
    jest.advanceTimersByTime(10 * LOADING_PERIOD_MS);
    browser.deliverFrame(1);

    expect(callback).not.toHaveBeenCalled();
    expect(browser.queuedFrames()).toBe(0);
  });

  it('moves a callback parked in the timer queue onto a real frame when the page is shown', () => {
    const browser = fakeBrowser();
    const frames = installFrameKeepAlive(browser.host);
    const callback = jest.fn();
    browser.setHidden(true);

    const handle = frames.requestAnimationFrame(callback);
    // The fallback has looked and parked the callback, but the (possibly throttled) timer has not fired.
    jest.advanceTimersByTime(LOADING_PERIOD_MS);
    expect(callback).not.toHaveBeenCalled();

    browser.setHidden(false);
    expect(browser.queuedFrames()).toBe(2);
    browser.deliverFrame(99);
    jest.advanceTimersByTime(10 * LOADED_PERIOD_MS);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(99);
    expect(browser.logs[1]).toMatch(/1 parked callback moved onto a real frame/);

    // The handle the game holds still cancels the re-armed request.
    frames.cancelAnimationFrame(handle);
    expect(browser.queuedFrames()).toBe(0);
  });

  it('keeps its own frames off the stack when game code runs, on both paths', () => {
    const browser = fakeBrowser();
    const frames = installFrameKeepAlive(browser.host);
    const stacks: string[] = [];
    const callback = () => {
      stacks.push(new Error().stack ?? '');
    };

    frames.requestAnimationFrame(callback);
    browser.deliverFrame(1);
    browser.setHidden(true);
    frames.requestAnimationFrame(callback);
    jest.advanceTimersByTime(LOADING_PERIOD_MS + hop);

    expect(stacks).toHaveLength(2);
    stacks.forEach((stack) => expect(stack).not.toMatch(/frameKeepAlive\.ts/));
  });

  it('skips the draw only while the page is hidden and the city is loaded', () => {
    const browser = fakeBrowser();
    const frames = installFrameKeepAlive(browser.host);
    browser.bringRendererUp();
    browser.setHidden(true);
    frames.requestAnimationFrame(jest.fn());
    jest.advanceTimersByTime(LOADING_PERIOD_MS + hop);

    expect(browser.drawSkipped()).toBe(false);
    browser.setLoading(false);
    expect(browser.drawSkipped()).toBe(true);
    browser.setHidden(false);
    expect(browser.drawSkipped()).toBe(false);
  });

  it('installs the draw veto once the renderer exists, not before', () => {
    const browser = fakeBrowser();
    const frames = installFrameKeepAlive(browser.host);
    browser.setHidden(true);
    frames.requestAnimationFrame(jest.fn());
    jest.advanceTimersByTime(LOADING_PERIOD_MS + hop);
    expect(browser.drawSkipped()).toBeUndefined();

    browser.bringRendererUp();
    browser.setLoading(false);
    frames.requestAnimationFrame(jest.fn());
    jest.advanceTimersByTime(LOADED_PERIOD_MS + hop);
    expect(browser.drawSkipped()).toBe(true);
  });

  it('throttles the tween engine while hidden and restores it when shown', () => {
    const browser = fakeBrowser();
    const ticker = browser.loadTweenEngine(35);
    installFrameKeepAlive(browser.host);

    browser.setHidden(true);
    expect(ticker.calls).toEqual(['useRAF false', `fps ${HIDDEN_TWEEN_FPS}`]);

    browser.setHidden(false);
    expect(ticker.calls).toEqual(['useRAF false', `fps ${HIDDEN_TWEEN_FPS}`, 'fps 35', 'useRAF true']);
  });

  it('switches a tween engine that loads while the page is already hidden', () => {
    const browser = fakeBrowser();
    const frames = installFrameKeepAlive(browser.host);
    browser.setHidden(true);
    const ticker = browser.loadTweenEngine();

    frames.requestAnimationFrame(jest.fn());
    jest.advanceTimersByTime(LOADING_PERIOD_MS);

    expect(ticker.calls[0]).toBe('useRAF false');
  });

  it('copes without a tween engine or renderer and says what it did', () => {
    const browser = fakeBrowser();
    installFrameKeepAlive(browser.host);

    browser.setHidden(true);
    browser.setLoading(false);
    browser.setHidden(false);
    browser.setHidden(true);

    expect(browser.logs).toEqual([
      'tab hidden - game frames are driven by timers (loading, so still drawing)',
      'tab visible - game frames are back on requestAnimationFrame',
      'tab hidden - game frames are driven by timers (loaded, so not drawing)',
    ]);
  });
});
