import { getFromStorage } from '../chrome/storage';
import { ResearchStatus } from '../model/researchStatus';
import { smartDecompress } from '../util/compression';

/** Null until the city has sent its research progress at least once. */
export const getResearchStatus = async (accountId: string): Promise<ResearchStatus | null> => {
  const compressed = await getFromStorage(`research_${accountId}`);
  if (!compressed) {
    return null;
  }
  const json = await smartDecompress(compressed);
  if (!json) {
    return null;
  }
  return JSON.parse(json) as ResearchStatus;
};
