declare global {
  interface Window {
    WebSocketUnchanged: typeof WebSocket;
    aviad: {
      'de.innogames.onyx.city.ancientwonders.services.AncientWonderService': new () => {
        getOtherPlayerAncientWonders: (playerId: number, callback: (response: unknown) => void) => void;
      };
      'de.innogames.onyx.shared.spells.services.SpellService': new () => {
        castSpellOnBuilding: (spellName: string, buildingId: number, callback: (response: unknown) => void) => void;
      };
      'de.innogames.onyx.worldmap.service.WorldMapService': new () => {
        getDiscoveredPlayerProvinces: (callback: (response: unknown) => void) => void;
        startup: (callback: (response: unknown) => void) => void;
      };
      'de.innogames.onyx.city.service.OtherPlayerService': new () => {
        getNeighbourlyHelpBuildings: (playerId: number, callback: (response: unknown) => void) => void;
      };
      'de.innogames.onyx.city.service.NeighborlyHelpService': new () => {
        performAction: (
          action: 'unlimited_help' | 'limited_help' | 'time_limited_help',
          entityId: number,
          playerId: number,
          callback: (response: unknown) => void,
        ) => void;
      };
    };
  }
}
