export const createOtherPlayerService = () => {
  const serviceConstructor = window.aviad?.['de.innogames.onyx.city.service.OtherPlayerService'];
  return serviceConstructor ? new serviceConstructor() : null;
};

export const createNeighbourlyHelpService = () => {
  const serviceConstructor = window.aviad?.['de.innogames.onyx.city.service.NeighborlyHelpService'];
  return serviceConstructor ? new serviceConstructor() : null;
};

export const getNeighborlyHelpBuildings = (service: ReturnType<typeof createOtherPlayerService>, playerId: number) => {
  service?.getNeighbourlyHelpBuildings(playerId, (response) => {
    console.log('Neighborly help buildings response:', response);
  });
};

export const performHelp = (
  service: ReturnType<typeof createNeighbourlyHelpService>,
  action: 'unlimited_help' | 'limited_help' | 'time_limited_help',
  entityId: number,
  playerId: number,
) => {
  service?.performAction(action, entityId, playerId, (response) => {
    console.log('Perform help response:', response);
  });
};

export const createWorldMapService = () => {
  const serviceConstructor = window.aviad?.['de.innogames.onyx.worldmap.service.WorldMapService'];
  return serviceConstructor ? new serviceConstructor() : null;
};

export const getDiscoveredPlayerProvinces = (service: ReturnType<typeof createWorldMapService>) => {
  service?.getDiscoveredPlayerProvinces((response) => {
    console.log('Discovered player provinces response:', response);
  });
};

export const fetchInitialWorldMapData = (service: ReturnType<typeof createWorldMapService>) => {
  service?.startup((response) => {
    console.log('Initial world map data response:', response);
  });
};
