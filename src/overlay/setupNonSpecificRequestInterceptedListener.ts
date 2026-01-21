import { sendInterceptedNonSpecificRequest } from '../chrome/messages';
import { NonSpecificMessage } from '../inject/nonSpecificMessages';

export function setupNonSpecificRequestInterceptedListener() {
  window.addEventListener('message', async (event: MessageEvent<NonSpecificMessage>) => {
    if (event.source !== window) {
      return;
    }

    switch (event.data.type) {
      case 'BUILDINGS_ALL':
      case 'BUILDINGS_FEATURE':
      case 'MAX_LEVELS':
      case 'ITEMS':
      case 'EFFECTS':
      case 'TOMES':
      case 'PREMIUM_BUILDING_HINTS':
      case 'GOODS_NAMES':
      case 'EVOLVING_BUILDINGS':
        sendInterceptedNonSpecificRequest(event.data);
        break;
      default:
        event.data satisfies never;
    }
  });
}
