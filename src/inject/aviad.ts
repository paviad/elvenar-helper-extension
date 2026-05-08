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
    };
  }
}
