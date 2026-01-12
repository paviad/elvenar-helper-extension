import { pl } from 'date-fns/locale';
import { MessageFromInjectedScript, MessageToInjectedScript } from './MessageFromInjectedScript';

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

let globalSendHook: ((message: string) => void) | null = null;
let globalTopicId: string | null = null;

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
    // install a hook to allow sending new messages if needed

    const topicIdRegex = /^X-SocketServer-Topic:guild\.(\w+)$/m;
    globalTopicId = null;
    if (typeof args[0] === 'string') {
      const match = args[0].match(topicIdRegex);
      if (match) {
        const topicId = match[1];
        globalTopicId = topicId;
      }
    }

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

/* 
implement sending a "mark as read message" that looks like this:

SEND
X-SocketServer-Plugin:chat/markasread
X-SocketServer-Method:update
X-SocketServer-Topic:guild.169
X-Correlation:848933052
destination:/queue
content-length:2

{}
*/

async function sendMarkAsReadMessage(playerId: number, guildId: number) {
  if (!globalSendHook) {
    console.warn('ElvenAssist: WebSocket send hook is not installed yet.');
    return;
  }

  // if (!globalTopicId) {
  //   console.warn('ElvenAssist: Topic ID is not available.');
  //   return;
  // }

  globalSendHook(`SEND
X-SocketServer-Plugin:chat/markasread
X-SocketServer-Method:update
X-SocketServer-Topic:guild.${guildId}
X-Correlation:${playerId}
destination:/queue
content-length:2

{}\0`);
}

window.WebSocket = CustomWebSocket;

console.log('ElvenAssist: Finished adding interceptor to WebSocket');

const messageHandler = (event: MessageEvent<MessageToInjectedScript>) => {
  if (event.source !== window || event.data.type !== 'MY_OUTGOING_MESSAGE') {
    return;
  }

  const playerId = event.data.payload.playerId;
  const guildId = event.data.payload.guildId;

  if (event.data.payload.type === 'MARK_AS_READ') {
    sendMarkAsReadMessage(playerId, guildId);
  }
};

window.addEventListener('message', messageHandler);
