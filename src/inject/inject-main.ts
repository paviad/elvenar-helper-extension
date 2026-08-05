import { CustomWebSocket } from './customWebSocket';
import { injectMutate } from './injectMutate';
import { castEeOncePerSecond } from './local/castEeOncePerSecond';
import { localNextPage } from './local/localNextPage';
import { localVisitPlayer } from './local/localVisitPlayer';
import { setupKeyHandlers } from './setupKeyHandlers';
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

function onDOMContentLoaded() {
  injectMutate();
}

if (document.readyState !== 'loading') {
  onDOMContentLoaded();
} else {
  document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
}

window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }

  switch (event.data.type) {
    case 'CAST_EE':
      {
        const payload = event.data.payload as number[];
        void castEeOncePerSecond(payload);
      }
      break;
    case 'visitPlayer':
      localVisitPlayer(event.data.payload as { playerId: number; buildingId: string; baseName: string });
      break;
    case 'nextPage':
      localNextPage();
      break;
  }
});

setupKeyHandlers();
