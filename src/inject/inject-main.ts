import { InitialWorldMapData } from '../model/initialWorldMapData';
import { NeighbourHelpData } from '../model/neighbourHelpBuildings';
import { TournyFight } from '../model/tourny/tournyFight';
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
import {
  createBattlefieldService,
  createTournamentService,
  createUnlockEncounterService,
  createWorldMapTournamentService,
  getProvinceInformation,
  getProvincesOverview,
  getTournamentOverview,
  instantBattle,
  unlockEncounter,
} from './gameops/tourny';
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
      }
      break;
    case 'neighbourHelpBuildings':
      {
        const neighbourHelpData = event.data.payload as NeighbourHelpData;
        void receivedNeighbourHelpBuildings(neighbourHelpData);
      }
      break;
    case 'getNeighborlyHelpBuildings':
      {
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
  const service = createNeighbourlyHelpService();

  const buildings = neighbourHelpData.buildings;

  const mainHall = buildings.find((r) => r.entityId === 1)!;
  const builders = buildings.find((r) => r.entityId === 2);
  const culture = buildings.find((r) => r.entityId !== 1 && r.entityId !== 2);

  const playerId = neighbourHelpData.player.player_id;

  if (builders) {
    service?.performAction('limited_help', builders.entityId, playerId, (response) => {
      console.log('E Perform help response for builders:', response);
    });
  } else if (culture) {
    service?.performAction('time_limited_help', culture.entityId, playerId, (response) => {
      console.log('E Perform help response for culture building:', response);
    });
  } else {
    service?.performAction('unlimited_help', mainHall.entityId, playerId, (response) => {
      console.log('E Perform help response for main hall:', response);
    });
  }
};

const fetchWorldNeighbors = async () => {
  const service = createWorldMapService();
  fetchInitialWorldMapData(service);
  await new Promise((resolve) => setTimeout(resolve, 200));
  getDiscoveredPlayerProvinces(service);
};

const tournyFight = async (fightData: TournyFight) => {
  const service = createBattlefieldService();
  instantBattle(service, fightData);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const tournamentService = createTournamentService();
  getTournamentOverview(tournamentService);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const worldMapTournamentService = createWorldMapTournamentService();
  getProvincesOverview(worldMapTournamentService);
};

const tournyOpen = (payload: { q: number; r: number }) => {
  const worldMapService = createWorldMapService();
  getProvinceInformation(worldMapService, payload);
};

const tournyCater = async (payload: { q: number; r: number }) => {
  const unlockEncounterService = createUnlockEncounterService();
  unlockEncounter(unlockEncounterService, payload);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const tournamentService = createTournamentService();
  getTournamentOverview(tournamentService);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const worldMapTournamentService = createWorldMapTournamentService();
  getProvincesOverview(worldMapTournamentService);
};

setupKeyHandlers();
