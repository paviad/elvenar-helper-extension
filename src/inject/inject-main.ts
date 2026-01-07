import { MessageFromInjectedScript } from './MessageFromInjectedScript';

console.log('ElvenAssist: injected script loaded');

declare global {
  interface Window {
    WebSocketUnchanged: typeof WebSocket;
  }
}

// Source - https://stackoverflow.com/a/75762050
// Posted by ProgrammingSauce, modified by community. See post 'Timeline' for change history
// Retrieved 2026-01-06, License - CC BY-SA 4.0

window.WebSocketUnchanged = window.WebSocket;

class CustomWebSocket extends WebSocket {
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
      this.interceptReceivedMessage(event);
      this.onmessageListenerCallbackOriginal(event);
    };
  }

  // The onmessage property is handled via Object.defineProperty in the constructor for compatibility.

  interceptReceivedMessage(event: MessageEvent) {
    // Intercept the received message and do whatever you like with it

    const data = {
      type: 'MY_EXTENSION_MESSAGE',
      payload: { value: event.data },
    } satisfies MessageFromInjectedScript;

    // Send the message to the window, where the content script can pick it up
    if (data.payload.value === '\n') {
      return;
    }

    window.postMessage(data, '*');
  }

  override send(...args: Parameters<WebSocket['send']>): void {
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

window.WebSocket = CustomWebSocket;

console.log('ElvenAssist: Finished adding interceptor to WebSocket');
