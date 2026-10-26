import { sendRuntime } from '../chrome/messages';
import { NonSpecificMessage } from '../inject/nonSpecificMessages';

export function setupNonSpecificRequestInterceptedListener() {
  window.addEventListener('message', (event: MessageEvent<NonSpecificMessage>) => {
    if (event.source !== window) {
      return;
    }

    switch (event.data.type) {
      case 'BUILDINGS_ALL':
      case 'BUILDINGS_FEATURE':
      case 'ITEMS':
      case 'EFFECTS':
      case 'TOMES':
      case 'FLEXIBLE_REWARDS':
      case 'PREMIUM_BUILDING_HINTS':
      case 'GOODS_NAMES':
      case 'EVOLVING_BUILDINGS':
      case 'BUILDING_SETS':
      case 'BATTLE_UNIT_TYPES':
      case 'RESEARCH_TECHNOLOGIES':
        void sendRuntime('interceptedNonSpecificRequest', { payload: event.data });
        break;
      default:
        event.data satisfies never;
    }
  });
}
