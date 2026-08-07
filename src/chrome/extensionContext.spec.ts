// The module carries one-shot state - a lost context never comes back - so every test loads a
// fresh copy of it.
const loadModule = (): typeof import('./extensionContext') => {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./extensionContext');
};

let documentListeners: Record<string, (() => void)[]>;

/** `chrome.runtime.id` is the whole signal: it goes undefined when the context is invalidated. */
const setContextValid = (valid: boolean) => {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: valid ? { id: 'abcdefghijklmnop' } : {},
  };
};

beforeEach(() => {
  setContextValid(true);
  documentListeners = {};
  (globalThis as unknown as { document: unknown }).document = {
    addEventListener: (type: string, callback: () => void) => {
      (documentListeners[type] ??= []).push(callback);
    },
    removeEventListener: (type: string, callback: () => void) => {
      documentListeners[type] = (documentListeners[type] ?? []).filter((l) => l !== callback);
    },
  };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('isExtensionContextValid', () => {
  it('is true while the extension is reachable', () => {
    const { isExtensionContextValid } = loadModule();
    expect(isExtensionContextValid()).toBe(true);
  });

  it('is false once the context has been invalidated', () => {
    const { isExtensionContextValid } = loadModule();
    setContextValid(false);
    expect(isExtensionContextValid()).toBe(false);
  });
});

describe('reportPossibleContextLoss', () => {
  // The case that must not raise the alarm: under MV3 the service worker is unloaded whenever it
  // idles, and a send that lands in that gap is repaired by the wake-up it triggers.
  it('ignores a failed send while the context is intact', () => {
    const { onExtensionContextLost, reportPossibleContextLoss } = loadModule();
    const lost = jest.fn();
    onExtensionContextLost(lost);

    reportPossibleContextLoss(new Error('Could not establish connection. Receiving end does not exist.'));

    expect(lost).not.toHaveBeenCalled();
  });

  it('reports a send that failed after the context went away', () => {
    const { onExtensionContextLost, reportPossibleContextLoss } = loadModule();
    const lost = jest.fn();
    onExtensionContextLost(lost);

    setContextValid(false);
    reportPossibleContextLoss(new Error('Extension context invalidated.'));

    expect(lost).toHaveBeenCalledTimes(1);
  });

  it('believes the invalidation message even if the context still reads valid', () => {
    const { onExtensionContextLost, reportPossibleContextLoss } = loadModule();
    const lost = jest.fn();
    onExtensionContextLost(lost);

    reportPossibleContextLoss(new Error('Extension context invalidated.'));

    expect(lost).toHaveBeenCalledTimes(1);
  });

  it('copes with something thrown that is not an Error', () => {
    const { onExtensionContextLost, reportPossibleContextLoss } = loadModule();
    const lost = jest.fn();
    onExtensionContextLost(lost);

    reportPossibleContextLoss('Extension context invalidated');

    expect(lost).toHaveBeenCalledTimes(1);
  });
});

describe('onExtensionContextLost', () => {
  it('fires straight away when the context has already gone', () => {
    const { onExtensionContextLost } = loadModule();
    setContextValid(false);

    const lost = jest.fn();
    onExtensionContextLost(lost);

    expect(lost).toHaveBeenCalledTimes(1);
  });

  it('fires each subscriber once and no more', () => {
    const { onExtensionContextLost, reportPossibleContextLoss } = loadModule();
    const lost = jest.fn();
    onExtensionContextLost(lost);

    setContextValid(false);
    reportPossibleContextLoss(new Error('Extension context invalidated.'));
    reportPossibleContextLoss(new Error('Extension context invalidated.'));

    expect(lost).toHaveBeenCalledTimes(1);
  });
});

describe('watchExtensionContext', () => {
  it('spots the context going away with nothing else happening', () => {
    jest.useFakeTimers();
    const { onExtensionContextLost, watchExtensionContext } = loadModule();
    const lost = jest.fn();
    onExtensionContextLost(lost);
    watchExtensionContext();

    jest.advanceTimersByTime(10000);
    expect(lost).not.toHaveBeenCalled();

    setContextValid(false);
    jest.advanceTimersByTime(2000);
    expect(lost).toHaveBeenCalledTimes(1);
  });

  it('stops polling once the context is gone', () => {
    jest.useFakeTimers();
    const { watchExtensionContext } = loadModule();
    watchExtensionContext();
    setContextValid(false);
    jest.advanceTimersByTime(2000);

    expect(jest.getTimerCount()).toBe(0);
    expect(documentListeners['visibilitychange']).toEqual([]);
  });

  // A background tab throttles the poll to roughly once a minute, so coming back to the front is
  // its own reason to look.
  it('looks again when the tab is brought back to the front', () => {
    jest.useFakeTimers();
    const { onExtensionContextLost, watchExtensionContext } = loadModule();
    const lost = jest.fn();
    onExtensionContextLost(lost);
    watchExtensionContext();

    setContextValid(false);
    documentListeners['visibilitychange'].forEach((listener) => listener());

    expect(lost).toHaveBeenCalledTimes(1);
  });
});
