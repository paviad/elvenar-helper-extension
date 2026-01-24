import { CustomWebSocket } from './customWebSocket';
import { sendMarkAsReadMessage } from './sendMarkAsReadMessage';
import { SendWebsocketMessage } from './websocketMessages';
import { GlobalHttpInterceptorService } from './xhrInterceptor';

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

window.WebSocket = CustomWebSocket;
console.log('ElvenAssist: Finished adding interceptor to WebSocket');

const xhrInterceptor = new GlobalHttpInterceptorService();
console.log('ElvenAssist: Finished adding interceptor to XMLHttpRequest');

const messageHandler = (event: MessageEvent<SendWebsocketMessage>) => {
  if (event.source !== window || event.data.type !== 'SEND_WEBSOCKET_MESSAGE') {
    return;
  }

  const playerId = event.data.payload.playerId;
  const guildId = event.data.payload.guildId;

  if (event.data.payload.type === 'MARK_AS_READ') {
    sendMarkAsReadMessage(playerId, guildId);
  }
};

window.addEventListener('message', messageHandler);
