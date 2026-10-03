jest.mock('./extensionContext', () => ({ reportPossibleContextLoss: jest.fn() }));

type Receiver = (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | undefined;

let receiver: Receiver;
let runtimeSendMessage: jest.Mock;
let tabsSendMessage: jest.Mock;

// The module keeps its listeners in module state, so every test loads a fresh copy of it.
const loadModule = (): typeof import('./messages') => {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const messages = require('./messages') as typeof import('./messages');
  messages.setupMessageListener();
  return messages;
};

/** Delivers a message the way Chrome does, and records what the receiver answered. */
const deliver = (message: unknown) => {
  const sendResponse = jest.fn();
  const keepOpen = receiver(message, {}, sendResponse);
  return { sendResponse, keepOpen };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  runtimeSendMessage = jest.fn();
  tabsSendMessage = jest.fn();
  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: {
      sendMessage: runtimeSendMessage,
      onMessage: { addListener: (r: Receiver) => (receiver = r) },
    },
    tabs: { sendMessage: tabsSendMessage },
  };
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('listeners', () => {
  it('leaves a message no listener is waiting for unanswered', () => {
    loadModule();
    const { sendResponse, keepOpen } = deliver({ type: 'citySaved', accountId: 'a' });
    expect(keepOpen).toBeUndefined();
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('replaces the listener setListener set before', () => {
    const { setListener } = loadModule();
    const first = jest.fn();
    const second = jest.fn();
    setListener('citySaved', first);
    setListener('citySaved', second);
    deliver({ type: 'citySaved', accountId: 'a' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ type: 'citySaved', accountId: 'a' }, {});
  });

  it('keeps every listener added with listen, until it is removed', () => {
    const { listen, setListener } = loadModule();
    const named = jest.fn();
    const first = jest.fn();
    const second = jest.fn();
    setListener('citySaved', named);
    const removeFirst = listen('citySaved', first);
    listen('citySaved', second);

    deliver({ type: 'citySaved', accountId: 'a' });
    removeFirst();
    deliver({ type: 'citySaved', accountId: 'b' });

    expect(named).toHaveBeenCalledTimes(2);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('clears only the listener setListener set', () => {
    const { listen, setListener, clearListener } = loadModule();
    const named = jest.fn();
    const other = jest.fn();
    setListener('tradeParsed', named);
    listen('tradeParsed', other);
    clearListener('tradeParsed');
    deliver({ type: 'tradeParsed', trades: [] });
    expect(named).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('still runs the other listeners when one throws', () => {
    const { listen } = loadModule();
    const after = jest.fn();
    listen('citySaved', () => {
      throw new Error('boom');
    });
    listen('citySaved', after);
    deliver({ type: 'citySaved', accountId: 'a' });
    expect(after).toHaveBeenCalledTimes(1);
  });
});

describe('answers', () => {
  it('answers at once with what a listener returns', () => {
    const { listen } = loadModule();
    listen('refreshCity', () => undefined as never);
    listen('refreshCity', () => ({ success: true }));
    const { sendResponse, keepOpen } = deliver({ type: 'refreshCity', accountId: 'a' });
    expect(keepOpen).toBeUndefined();
    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  it('answers once, with the first value a pending listener resolves to', async () => {
    const { listen } = loadModule();
    let resolveSlow: (r: { success: boolean }) => void = () => {};
    listen('refreshCity', () => new Promise((resolve) => (resolveSlow = resolve)));
    listen('refreshCity', () => Promise.resolve({ success: true, message: 'fast' }));

    const { sendResponse, keepOpen } = deliver({ type: 'refreshCity', accountId: 'a' });
    expect(keepOpen).toBe(true);
    await flush();
    expect(sendResponse).toHaveBeenCalledWith({ success: true, message: 'fast' });

    resolveSlow({ success: false });
    await flush();
    expect(sendResponse).toHaveBeenCalledTimes(1);
  });

  it('answers undefined once every pending listener has finished without a value', async () => {
    const { listen } = loadModule();
    listen('citySaved', () => Promise.resolve());
    listen('citySaved', () => Promise.reject(new Error('boom')));

    const { sendResponse, keepOpen } = deliver({ type: 'citySaved', accountId: 'a' });
    expect(keepOpen).toBe(true);
    await flush();
    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith(undefined);
  });
});

describe('generic responses', () => {
  it('reaches the listeners for its request type and the ones for any type, until removed', () => {
    const { listen, listenForGenericResponse } = loadModule();
    const matching = jest.fn();
    const other = jest.fn();
    const any = jest.fn();
    const removeMatching = listenForGenericResponse('R:A/b', matching);
    listenForGenericResponse('R:C/d', other);
    listen('genericResponse', any);

    const message = { type: 'genericResponse', reqRespType: 'R:A/b', payload: 1 };
    deliver(message);
    removeMatching();
    deliver(message);

    expect(matching).toHaveBeenCalledTimes(1);
    expect(matching).toHaveBeenCalledWith(message);
    expect(other).not.toHaveBeenCalled();
    expect(any).toHaveBeenCalledTimes(2);
  });

  it('is sent to the tab, then announced as saved', async () => {
    const { sendGenericResponse } = loadModule();
    await sendGenericResponse('R:A/b', { x: 1 }, 7);
    expect(tabsSendMessage).toHaveBeenCalledWith(7, {
      type: 'genericResponse',
      reqRespType: 'R:A/b',
      payload: { x: 1 },
    });
    expect(runtimeSendMessage).toHaveBeenCalledWith({ type: 'accountsSavedRuntime', tabId: 7 });
  });
});

describe('sending', () => {
  it('sends the type and fields as one message', async () => {
    const { sendRuntime } = loadModule();
    await sendRuntime('citySaved', { accountId: 'a' });
    await sendRuntime('otherPlayerCityUpdated');
    expect(runtimeSendMessage).toHaveBeenNthCalledWith(1, { type: 'citySaved', accountId: 'a' });
    expect(runtimeSendMessage).toHaveBeenNthCalledWith(2, { type: 'otherPlayerCityUpdated' });
  });

  it('reports a runtime message that could not be delivered, and resolves to undefined', async () => {
    const { sendRuntime } = loadModule();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { reportPossibleContextLoss } = require('./extensionContext') as { reportPossibleContextLoss: jest.Mock };
    const error = new Error('Extension context invalidated.');
    runtimeSendMessage.mockRejectedValue(error);
    await expect(sendRuntime('citySaved', { accountId: 'a' })).resolves.toBeUndefined();
    expect(reportPossibleContextLoss).toHaveBeenCalledWith(error);
  });

  it('lets requestRuntime callers see the failure', async () => {
    const { requestRuntime } = loadModule();
    runtimeSendMessage.mockRejectedValue(new Error('gone'));
    await expect(requestRuntime('openExtensionTab')).rejects.toThrow('gone');
  });

  it('resolves a tab message that could not be delivered to undefined', async () => {
    const { sendToTab } = loadModule();
    tabsSendMessage.mockRejectedValue(new Error('Receiving end does not exist.'));
    await expect(sendToTab(3, 'tradeParsed', { trades: [] })).resolves.toBeUndefined();
  });

  it('turns an unanswered refresh into a failure', async () => {
    const { sendRefreshCityMessage } = loadModule();
    runtimeSendMessage.mockResolvedValue(undefined);
    await expect(sendRefreshCityMessage('a')).resolves.toEqual({
      success: false,
      message: 'No answer from the extension',
    });
  });
});
