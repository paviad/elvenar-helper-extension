import { getFromStorage } from '../chrome/storage';
import { ResearchTechnology } from '../model/researchTechnology';
import { smartDecompress } from '../util/compression';

/** Empty until the game has loaded the balancing file at least once. */
export const getResearchTechnologies = async () => {
  const compressed = await getFromStorage('researchTechnologies');
  if (!compressed) {
    return [];
  }
  const json = await smartDecompress(compressed);
  if (json) {
    return JSON.parse(json) as ResearchTechnology[];
  } else {
    return [];
  }
};
