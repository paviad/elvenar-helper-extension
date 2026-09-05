import { createWorldMapService, fetchInitialWorldMapData, getDiscoveredPlayerProvinces } from './neighbourlyHelp';

export const fetchWorldNeighbors = async () => {
  const service = createWorldMapService();
  fetchInitialWorldMapData(service);
  await new Promise((resolve) => setTimeout(resolve, 200));
  getDiscoveredPlayerProvinces(service);
};
