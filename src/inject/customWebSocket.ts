import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { parseSocketMessageRaw } from '../overlay/parseSocketMessage';
import { playerSpecificMatchers } from './playerSpecificMatchers';
import { createRepeatFilter, matchedSocketResponses, SocketResponseMessage } from './socketResponses';
import { ReceivedWebsocketMessage } from './websocketMessages';
import { getLatestSharedInfo } from './xhrInterceptor';

let globalSendHook: ((message: string) => void) | null = null;

export class CustomWebSocket extends WebSocket {
  private onmessageListenerCallbackOriginal: (event: MessageEvent) => void = () => {
    // Placeholder function
  };

  constructor(...args: ConstructorParameters<typeof WebSocket>) {
    super(...args);

    // Override onmessage property
    Object.defineProperty(this, 'onmessage', {
      set: (func: (event: MessageEvent) => void) => {
        this.onmessageListenerCallbackOriginal = func;
      },
      get: () => {
        return this.onmessageListenerCallbackOriginal;
      },
      configurable: true,
      enumerable: true,
    });

    super.onmessage = (event: MessageEvent) => {
      this.onmessageListenerCallbackOriginal(event);
    };

    // One interception per frame, whatever the game happens to be listening with. Doing it from
    // the listeners themselves meant a frame was intercepted once for `onmessage` and again for
    // every addEventListener('message') the game had registered - the STOMP client registers
    // several, so a single wonder contribution arrived five times over and was processed, saved
    // and relayed five times over with it.
    super.addEventListener('message', (event: MessageEvent) => {
      try {
        this.interceptReceivedMessage(event);
      } catch (error) {
        console.warn('ElvenAssist: Error in intercepting WebSocket message', error);
      }
    });
  }

  // The onmessage property is handled via Object.defineProperty in the constructor for compatibility.
  interceptReceivedMessage(event: MessageEvent) {
    // Intercept the received message and do whatever you like with it
    const data = {
      type: 'RECEIVED_WEBSOCKET_MESSAGE',
      payload: { value: event.data },
    } satisfies ReceivedWebsocketMessage;

    // Send the message to the window, where the content script can pick it up
    if (data.payload.value === '\n') {
      return;
    }

    if (typeof data.payload.value === 'string') {
      const { body, headers } = parseSocketMessageRaw(data.payload.value) || {};
      logFrame(body, headers);

      // Filtered once, above both consumers, so the local handlers are spared the server's
      // repeats too - they act on the game rather than reading it, and doing that five times
      // over is the one place the repetition could have been more than wasted work.
      const fresh = withoutRepeatedResponses(body);
      matchAgainstLocalHandlers(fresh);
      forwardMatchedResponses(fresh);
    }

    window.postMessage(data, '*');
  }

  override send(...args: Parameters<WebSocket['send']>): void {
    // install a hook to allow sending new messages if needed
    const sendMessageHook = (message: string) => {
      super.send(message);
    };

    globalSendHook = sendMessageHook;

    // Intercept the sent message and do whatever you like with it
    super.send(...args);
  }

  // addEventListener is deliberately not overridden. It used to be, only so that a 'message'
  // listener could be wrapped in an interception - which is what made a frame arrive once per
  // listener. Wrapping also meant removeEventListener was handed a function the game had never
  // registered, so a message listener could never be taken off again.
}

export function getWebSocketSendHook(): ((message: string) => void) | null {
  return globalSendHook;
}

/**
 * Hands socket-pushed responses to the service worker down the same road the HTTP ones take.
 *
 * The game answers some things by pushing them rather than by replying, and a contribution to
 * one of your ancient wonders is one of them: nobody asked for it, so it arrives here and
 * nowhere else. Without this the stored figures only moved when the page was reloaded.
 *
 * Local handlers are left out because `matchAgainstLocalHandlers` has already run them, here in
 * the page where they belong.
 */
/** Shared across frames, since that is where the server's repeats show up. */
const withoutRepeats = createRepeatFilter();

/**
 * What the frame carries that nobody has just been told already.
 *
 * A body that is not a list of responses is handed back untouched: chat traffic and STOMP
 * receipts are not what the server repeats, and chat discards what it has seen for itself.
 */
const withoutRepeatedResponses = (body: unknown): unknown =>
  Array.isArray(body) ? withoutRepeats(body as ElvenarRequestResponseEntry[], Date.now()) : body;

/**
 * Logged in the page, where a frame is still a frame — the relay on the other side counts
 * responses, so it cannot tell one frame arriving repeatedly from one arriving once. Above the
 * filter, so the server repeating itself stays visible after the repeats stop being acted on.
 */
const logFrame = (body: unknown, headers?: Record<string, string>) => {
  const matched = matchedSocketResponses(body);
  if (matched.length === 0) {
    return;
  }

  console.log(
    'E:',
    'socket frame',
    'uuid',
    headers?.['X-UUID'],
    'message-id',
    headers?.['message-id'],
    'subscription',
    headers?.['subscription'],
    'matched',
    matched.length,
  );
};

const forwardMatchedResponses = (body: unknown) => {
  const responses = matchedSocketResponses(body);
  if (responses.length === 0) {
    return;
  }

  // Nothing has identified the session yet, which means the game has not made a request in this
  // tab — there is no account for the service worker to attach these to, so they are dropped.
  const sharedInfo = getLatestSharedInfo();
  if (!sharedInfo) {
    return;
  }

  const message = {
    type: 'socketResponse',
    payload: { responses, sharedInfo },
  } satisfies SocketResponseMessage;

  window.postMessage(message, '*');
};

const matchAgainstLocalHandlers = (body: unknown) => {
  const respArr = body as ElvenarRequestResponseEntry[];
  if (!Array.isArray(respArr)) {
    return;
  }
  for (const resp of respArr) {
    if (resp?.__class__) {
      const requestClass = resp.requestClass;
      const requestMethod = resp.requestMethod;
      const matchers = playerSpecificMatchers.filter((r) => r.responseSelector && r.local);
      for (const matcher of matchers) {
        if (
          matcher.responseSelector!.requestClass === requestClass &&
          matcher.responseSelector!.requestMethod === requestMethod
        ) {
          matcher.local!([resp]).catch((error) => {
            console.error('Error in local handler for messageType', matcher, error);
          });
        }
      }
    }
  }
};
