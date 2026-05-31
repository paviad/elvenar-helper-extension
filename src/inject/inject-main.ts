import { InitialWorldMapData } from '../model/initialWorldMapData';
import { NeighbourHelpData } from '../model/neighbourHelpBuildings';
import { WorldNeighbor } from '../model/worldNeighbors';
import { CustomWebSocket } from './customWebSocket';
import { castEe, createSpellService } from './gameops/castEe';
import {
  createNeighbourlyHelpService,
  createOtherPlayerService,
  createWorldMapService,
  fetchInitialWorldMapData,
  getDiscoveredPlayerProvinces,
  getNeighborlyHelpBuildings,
} from './gameops/neighbourlyHelp';
import { injectMutate } from './injectMutate';
import { setupKeyHandlers } from './setupKeyHandlers';
import { GlobalHttpInterceptorService } from './xhrInterceptor';

console.log('ElvenAssist: injected script loaded');

const worldMapState = {
  initialWorldMapData: null as InitialWorldMapData | null,
  worldNeighbors: [] as WorldNeighbor[],
};

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
        console.log('Received CAST_EE message', payload);
      }
      break;
    case 'neighbourHelpBuildings':
      {
        const neighbourHelpData = event.data.payload as NeighbourHelpData;
        console.log('Received neighbourHelpBuildings message in inject script:', neighbourHelpData);
        void receivedNeighbourHelpBuildings(neighbourHelpData);
      }
      break;
    case 'getNeighborlyHelpBuildings':
      {
        const playerId = event.data.payload as number;
        console.log('Received getNeighborlyHelpBuildings message in inject script for playerId:', playerId);
        const service = createOtherPlayerService();
        getNeighborlyHelpBuildings(service, playerId);
      }
      break;
    case 'fetchWorldNeighbors':
      void fetchWorldNeighbors();
      break;
  }
});

const castEeOncePerSecond = async (entityIds: number[]) => {
  if (entityIds.length === 0) {
    return;
  }

  const service = createSpellService();
  if (!service) {
    console.error('ElvenAssist: SpellService not available, cannot cast EE');
    return;
  }
  for (const entityId of entityIds) {
    castEe(service, entityId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

const receivedNeighbourHelpBuildings = (neighbourHelpData: NeighbourHelpData) => {
  console.log('Handling received neighbour help buildings in inject script:', neighbourHelpData);
  const service = createNeighbourlyHelpService();

  const buildings = neighbourHelpData.buildings;

  const mainHall = buildings.find((r) => r.entityId === 1)!;
  const builders = buildings.find((r) => r.entityId === 2);
  const culture = buildings.find((r) => r.entityId !== 1 && r.entityId !== 2);

  const playerId = neighbourHelpData.player.player_id;

  if (builders) {
    console.log('Performing help action for builders');
    service?.performAction('limited_help', builders.entityId, playerId, (response) => {
      console.log('Perform help response for builders:', response);
    });
  } else if (culture) {
    console.log('Performing help action for culture building');
    service?.performAction('time_limited_help', culture.entityId, playerId, (response) => {
      console.log('Perform help response for culture building:', response);
    });
  } else {
    console.log('Performing help action for main hall');
    service?.performAction('unlimited_help', mainHall.entityId, playerId, (response) => {
      console.log('Perform help response for main hall:', response);
    });
  }
};

const fetchWorldNeighbors = async () => {
  const service = createWorldMapService();
  fetchInitialWorldMapData(service);
  await new Promise((resolve) => setTimeout(resolve, 200));
  getDiscoveredPlayerProvinces(service);
};

setupKeyHandlers();
