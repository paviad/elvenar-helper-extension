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
        break;

      case 'MAX_LEVELS_PROCESSED':
        await setMaxLevels(event.data.payload.maxLevels);
        break;

      case 'ITEMS_PROCESSED':
        await setItemDefinitions(event.data.payload.items);
        break;

      case 'EFFECTS_PROCESSED':
        await setEffects(event.data.payload.effects);
        break;

      case 'TOMES_PROCESSED':
        await setTomes(event.data.payload.tomes);
        break;

      case 'AWBUILDINGS_PROCESSED':
        // Assuming you have a function setAwBuildings similar to the others
        await setAwBuildings(event.data.payload.awBuildings);
        break;

      default:
        event.data satisfies never;
    }
  });
}
