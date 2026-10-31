import { CauldronSync } from '../cauldron/cauldronSync';
import { NonSpecificMessage } from '../inject/nonSpecificMessages';
import { PlayerSpecificMessage } from '../inject/playerSpecificMessages';
import { TradeSummary } from '../model/tradeSummary';
import { reportPossibleContextLoss } from './extensionContext';

// ============================================================================
// PROTOCOL
// ============================================================================
// Each entry is a message type and the fields the message carries besides `type`. These are
// interfaces rather than types so that another module can add messages to them.

type NoFields = Record<never, never>;

/** Sent with chrome.runtime.sendMessage, which reaches the service worker and every extension page. */
export interface RuntimeMessages {
  interceptedPlayerSpecificRequest: { payload: PlayerSpecificMessage };
  interceptedNonSpecificRequest: { payload: NonSpecificMessage };
  accountsSavedRuntime: { tabId: number };
  refreshCity: { accountId: string };
  cityEntitiesUpdated: { tabId: number };
  otherPlayerCityUpdated: NoFields;
  citySaved: { accountId: string };
  openExtensionTab: NoFields;
  /** The URL of the client script the game page runs, which the building pictures are read from. */
  gameClientScript: { url: string };
  /** The URL of the render config the game page loaded, which says how each building is drawn. */
  gameRenderConfig: { url: string };
  /** The Cauldron Optimizer's "Fill from the game" button asks for the latest cauldron data. */
  cauldronRequest: NoFields;
}

/** Sent with chrome.tabs.sendMessage, which reaches the content scripts of one tab. */
export interface TabMessages {
  /**
   * A game response the service worker has handled for this tab. It is sent once the service
   * worker has saved what the response changed, so a stored account read from here on includes it.
   */
  genericResponse: { reqRespType: string; payload: unknown };
  cityDataUpdated: { tabId: number };
  tradeParsed: { trades: TradeSummary[] };
  activeEffectsUpdated: { tabId: number };
  messagesUpdated: {
    tabId: number;
    // Which player-specific response triggered this (e.g. 'R:MessageService/fetchMessages').
    reqRespType: string;
  };
}

/** What a listener answers with, for the messages that are answered. The rest get no answer. */
export interface MessageResponses {
  refreshCity: MessageResponse;
  /** Null until a cauldron has been opened. */
  cauldronRequest: CauldronSync | null;
}

export interface MessageResponse {
  success: boolean;
  message?: string;
}

type AllMessageFields = RuntimeMessages & TabMessages;
export type MessageType = keyof AllMessageFields;
export type MessageOf<K extends MessageType> = { type: K } & AllMessageFields[K];
export type AllMessages = { [K in MessageType]: MessageOf<K> }[MessageType];
export type ResponseOf<K extends MessageType> = K extends keyof MessageResponses ? MessageResponses[K] : void;

/** A message with no fields is sent without a fields argument. */
type FieldsArg<F> = keyof F extends never ? [] : [fields: F];

export type InterceptedPlayerSpecificRequest = MessageOf<'interceptedPlayerSpecificRequest'>;
export type InterceptedNonSpecificRequest = MessageOf<'interceptedNonSpecificRequest'>;
export type GenericResponseMessage<T> = Omit<MessageOf<'genericResponse'>, 'payload'> & { payload: T };

// ============================================================================
// SENDING
// ============================================================================

/**
 * Sends a runtime message and resolves to its answer, which is undefined when no listener gave
 * one. Rejects when the message could not be delivered, typically because the extension has gone
 * away under this page.
 */
export const requestRuntime = async <K extends keyof RuntimeMessages>(
  type: K,
  ...[fields]: FieldsArg<RuntimeMessages[K]>
): Promise<ResponseOf<K> | undefined> => (await chrome.runtime.sendMessage({ type, ...fields })) as ResponseOf<K>;

/** Like {@link requestRuntime}, but a failure is reported and logged, and resolves to undefined. */
export const sendRuntime = async <K extends keyof RuntimeMessages>(
  type: K,
  ...fields: FieldsArg<RuntimeMessages[K]>
): Promise<ResponseOf<K> | undefined> => {
  try {
    return await requestRuntime(type, ...fields);
  } catch (e) {
    reportPossibleContextLoss(e);
    console.log(`ElvenAssist: Error sending ${type} message:`, e);
    return undefined;
  }
};

/** Sends a message to one tab and resolves to its answer. A failure is logged and resolves to undefined. */
export const sendToTab = async <K extends keyof TabMessages>(
  tabId: number,
  type: K,
  ...[fields]: FieldsArg<TabMessages[K]>
): Promise<ResponseOf<K> | undefined> => {
  try {
    return (await chrome.tabs.sendMessage(tabId, { type, ...fields })) as ResponseOf<K>;
  } catch (e) {
    console.log(`ElvenAssist: Error sending ${type} message:`, e);
    return undefined;
  }
};

/** Asks the service worker to read a city again. A refresh nobody answers counts as a failure. */
export const sendRefreshCityMessage = async (accountId: string): Promise<MessageResponse> =>
  (await sendRuntime('refreshCity', { accountId })) ?? { success: false, message: 'No answer from the extension' };

/**
 * Sends a game response the service worker has handled to the tab it came from, then tells the
 * extension pages that the accounts it changed have been saved.
 */
export const sendGenericResponse = async <T>(reqRespType: string, payload: T, tabId: number) => {
  await sendToTab(tabId, 'genericResponse', { reqRespType, payload });
  await sendRuntime('accountsSavedRuntime', { tabId });
};

// ============================================================================
// LISTENING
// ============================================================================

type Listener = (message: AllMessages, sender: chrome.runtime.MessageSender) => unknown;

/** The listeners for each message type, keyed by whatever their registration removes them with. */
const listeners = new Map<string, Map<unknown, Listener>>();

/** The key of the one listener per type that {@link setListener} replaces. */
const SLOT = Symbol('slot');

const addListener = (type: MessageType, key: unknown, listener: Listener) => {
  let forType = listeners.get(type);
  if (!forType) {
    forType = new Map();
    listeners.set(type, forType);
  }
  forType.set(key, listener);
  return () => {
    if (forType.get(key) === listener) {
      forType.delete(key);
    }
  };
};

export type MessageListener<K extends MessageType> = (
  message: MessageOf<K>,
  sender: chrome.runtime.MessageSender,
) => ResponseOf<K> | Promise<ResponseOf<K>>;

/**
 * Calls `listener` for every message of this type that reaches this page, alongside any other
 * listeners for it. Returns a function that removes it.
 */
export const listen = <K extends MessageType>(type: K, listener: MessageListener<K>) =>
  addListener(type, Symbol(type), listener as Listener);

/** Sets this page's one replaceable listener for a message type, replacing the previous one. */
export const setListener = <K extends MessageType>(type: K, listener: MessageListener<K>) =>
  addListener(type, SLOT, listener as Listener);

export const clearListener = (type: MessageType) => {
  listeners.get(type)?.delete(SLOT);
};

/**
 * Runs the listeners for a message. The answer is the first one a listener gives that is not
 * undefined; when none gives one, an undefined answer goes back once they have all finished.
 */
const messageReceiver = (
  message: AllMessages,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean | undefined => {
  const forType = listeners.get(message.type);
  if (!forType?.size) {
    return undefined;
  }

  const logError = (e: unknown) => console.log('ElvenAssist: Error in message handler for message', message, e);

  const results = [...forType.values()].map((listener) => {
    try {
      return listener(message, sender);
    } catch (e) {
      logError(e);
      return undefined;
    }
  });
  const pending = results.filter((r): r is Promise<unknown> => r instanceof Promise);
  const answer = results.find((r) => !(r instanceof Promise) && r !== undefined);

  if (answer !== undefined || pending.length === 0) {
    pending.forEach((p) => void p.catch(logError));
    sendResponse(answer);
    return undefined;
  }

  let answered = false;
  const respond = (r: unknown) => {
    if (!answered) {
      answered = true;
      sendResponse(r);
    }
  };
  void Promise.allSettled(
    pending.map((p) =>
      p.then((r) => {
        if (r !== undefined) {
          respond(r);
        }
      }, logError),
    ),
  ).then(() => respond(undefined));
  return true;
};

export const setupMessageListener = () => chrome.runtime.onMessage.addListener(messageReceiver);

/** Calls `callback` for each game response of one type the service worker has handled for this tab. */
export const listenForGenericResponse = <T>(
  reqRespType: string,
  callback: (message: GenericResponseMessage<T>) => void,
) =>
  listen('genericResponse', (message) => {
    if (message.reqRespType === reqRespType) {
      callback(message as GenericResponseMessage<T>);
    }
  });
