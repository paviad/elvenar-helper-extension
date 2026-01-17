import { sendInterceptedPlayerSpecificRequest } from '../chrome/messages';
import { PlayerSpecificMessage } from '../inject/playerSpecificMessages';

export function setupPlayerSpecificRequestInterceptedListener() {
  window.addEventListener('message', async (event: MessageEvent<PlayerSpecificMessage>) => {
    if (event.source !== window) {
      return;
    }

    switch (event.data.type) {
      case 'CITY_DATA_PROCESSED':
      case 'INVENTORY_DATA_PROCESSED':
      case 'TRADE_DATA_PROCESSED':
      case 'CAULDRON_DATA_PROCESSED':
      case 'OTHER_PLAYER_DATA_PROCESSED':
        sendInterceptedPlayerSpecificRequest(event.data);
        break;
      default:
        event.data satisfies never;
    }
  });
}
