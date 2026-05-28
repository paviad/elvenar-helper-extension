import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { parseSocketMessageRaw } from '../overlay/parseSocketMessage';
import { playerSpecificMatchers } from './playerSpecificMatchers';
import { ReceivedWebsocketMessage } from './websocketMessages';

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
      try {
        this.interceptReceivedMessage(event);
      } catch (error) {
        console.warn('ElvenAssist: Error in intercepting WebSocket message', error);
      }
      this.onmessageListenerCallbackOriginal(event);
    };
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
      const { body } = parseSocketMessageRaw(data.payload.value) || {};
      matchAgainstLocalHandlers(body);
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

  override addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (type === 'message') {
      super.addEventListener(
        'message',
        (event: MessageEvent) => {
          this.interceptReceivedMessage(event);
          listener.call(this, event as WebSocketEventMap[K]);
        },
        options,
      );
    } else {
      super.addEventListener(type, listener as EventListenerOrEventListenerObject, options);
    }
  }
}

export function getWebSocketSendHook(): ((message: string) => void) | null {
  return globalSendHook;
}

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
