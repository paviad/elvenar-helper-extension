import { NeighbourHelpData } from '../model/neighbourHelpBuildings';
import { TournyFight } from '../model/tourny/tournyFight';
import { compareVersion } from './compareVersion';
import { CustomWebSocket } from './customWebSocket';
import { injectMutate } from './injectMutate';
import { castEeOncePerSecond } from './local/castEeOncePerSecond';
import { fetchWorldNeighbors } from './local/fetchWorldNeighbors';
import { localHelpPlayer } from './local/localHelpPlayer';
import { localNextPage } from './local/localNextPage';
import { localVisitPlayer } from './local/localVisitPlayer';
import { createOtherPlayerService, getNeighborlyHelpBuildings } from './local/neighbourlyHelp';
import { receivedNeighbourHelpBuildings } from './local/receivedNeighbourHelpBuildings';
import { tournyCater } from './local/tournyCater';
import { tournyFight } from './local/tournyFight';
import { tournyOpen } from './local/tournyOpen';
import { setupKeyHandlers } from './setupKeyHandlers';
import { storePicksForLaterUse } from './spirePicksStore';
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

new GlobalHttpInterceptorService();
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
    case 'helpPlayer':
      if (compareVersion('1.239') >= 0) {
        localHelpPlayer(event.data.payload as number);
      }
      break;
    case 'neighbourHelpBuildings':
      if (compareVersion('1.239') < 0) {
        const neighbourHelpData = event.data.payload as NeighbourHelpData;
        void receivedNeighbourHelpBuildings(neighbourHelpData);
      }
      break;
    case 'getNeighborlyHelpBuildings':
      if (compareVersion('1.239') < 0) {
        const playerId = event.data.payload as number;
        const service = createOtherPlayerService();
        getNeighborlyHelpBuildings(service, playerId);
      }
      break;
    case 'fetchWorldNeighbors':
      void fetchWorldNeighbors();
      break;
    case 'tournyFight':
      void tournyFight(event.data.payload as TournyFight);
      break;
    case 'tournyOpen':
      void tournyOpen(event.data.payload as { q: number; r: number });
      break;
    case 'tournyCater':
      void tournyCater(event.data.payload as { q: number; r: number });
      break;
    case 'spirePicks':
      storePicksForLaterUse(event.data.payload as string[]);
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
