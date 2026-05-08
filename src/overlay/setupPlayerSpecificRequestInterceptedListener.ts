import { sendInterceptedPlayerSpecificRequest } from '../chrome/messages';
import { PlayerSpecificMessage } from '../inject/playerSpecificMessages';

export function setupPlayerSpecificRequestInterceptedListener() {
  window.addEventListener('message', (event: MessageEvent<PlayerSpecificMessage>) => {
    if (event.source !== window) {
      return;
    }

    switch (event.data.type) {
      case 'CITY_DATA_PROCESSED':
      case 'INVENTORY_DATA_PROCESSED':
      case 'TRADE_DATA_PROCESSED':
      case 'CAULDRON_DATA_PROCESSED':
      case 'OTHER_PLAYER_DATA_PROCESSED':
      case 'NOTIFICATIONS':
      case 'CITY_RESOURCES_UPDATE':
      case 'INVENTORY_UPDATED':
      case 'SPIRE_ENCOUNTER_START':
      case 'SPIRE_DIPLOMACY_SUBMIT':
      case 'QUEST':
      case 'CITY_MAP_SERVICE_UPDATE':
      case 'TRANSCENDENCE_SERVICE':
      case 'ACTIVE_EFFECTS_UPDATE':
        void sendInterceptedPlayerSpecificRequest(event.data);
        break;
      default:
        event.data satisfies never;
    }
  });
}
