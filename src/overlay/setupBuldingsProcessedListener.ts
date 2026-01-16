import { InjectMessage } from '../inject/injectMessages';
import { setAwBuildings } from './setAwBuildings';
import { setBuildingsAll } from './setBuildingsAll';
import { setBuildingsFeature } from './setBuildingsFeature';
import { setEffects } from './setEffects';
import { setItemDefinitions } from './setItemDefinitions';
import { setMaxLevels } from './setMaxLevels';
import { setTomes } from './setTomes';

export function setupBuldingsProcessedListener() {
  window.addEventListener('message', async (event: MessageEvent<InjectMessage>) => {
    if (event.source !== window) {
      return;
    }

    switch (event.data.type) {
      case 'BUILDINGS_PROCESSED':
        if (event.data.payload.matcherAll) {
          await setBuildingsAll(event.data.payload.buildings);
        } else if (event.data.payload.matcherFeature) {
          await setBuildingsFeature(event.data.payload.buildings);
        }
        console.log('Service Worker: Buildings data updated from intercepted XHR request');
        break;

      case 'MAX_LEVELS_PROCESSED':
        await setMaxLevels(event.data.payload.maxLevels);
        console.log('Service Worker: Buildings data updated from intercepted XHR request');
        break;

      case 'ITEMS_PROCESSED':
        await setItemDefinitions(event.data.payload.items);
        console.log('Service Worker: Items data updated from intercepted XHR request');
        break;

      case 'EFFECTS_PROCESSED':
        await setEffects(event.data.payload.effects);
        console.log('Service Worker: Effects data updated from intercepted XHR request');
        break;

      case 'TOMES_PROCESSED':
        await setTomes(event.data.payload.tomes);
        console.log('Service Worker: Tomes data received from intercepted XHR request');
        break;

      case 'AWBUILDINGS_PROCESSED':
        // Assuming you have a function setAwBuildings similar to the others
        await setAwBuildings(event.data.payload.awBuildings);
        console.log('Service Worker: AW Buildings data received from intercepted XHR request');
        break;

      default:
        event.data satisfies never;
    }
  });
}
