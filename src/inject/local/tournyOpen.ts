import { createWorldMapService } from './neighbourlyHelp';
import { getProvinceInformation } from './tourny';

export const tournyOpen = (payload: { q: number; r: number }) => {
  const worldMapService = createWorldMapService();
  getProvinceInformation(worldMapService, payload);
};
