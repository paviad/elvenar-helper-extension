import { InterceptedNonSpecificRequest } from '../chrome/messages';
import { processBuildings } from '../elvenar/processBuildings';
import { processEffects } from '../elvenar/processEffects';
import { processItems } from '../elvenar/processItems';
import { processMaxLevels } from '../elvenar/processMaxLevels';
import { processPremiumBuildingHints } from '../elvenar/processPremiumBuildingHints';
import { processTomes } from '../elvenar/processTomes';

export const nonSpecificRequestHandler = async (msg: InterceptedNonSpecificRequest): Promise<void> => {
  switch (msg.payload.type) {
    case 'BUILDINGS_ALL':
      await processBuildings(msg.payload.payload.decodedResponse, true);
      break;
    case 'BUILDINGS_FEATURE':
      await processBuildings(msg.payload.payload.decodedResponse, false);
      break;
    case 'MAX_LEVELS':
      await processMaxLevels(msg.payload.payload.decodedResponse);
      break;
    case 'ITEMS':
      await processItems(msg.payload.payload.decodedResponse);
      break;
    case 'EFFECTS':
      await processEffects(msg.payload.payload.decodedResponse);
      break;
    case 'TOMES':
      await processTomes(msg.payload.payload.decodedResponse);
      break;
    case 'PREMIUM_BUILDING_HINTS':
      await processPremiumBuildingHints(msg.payload.payload.decodedResponse);
      break;
    default:
      msg.payload satisfies never;
  }
};
