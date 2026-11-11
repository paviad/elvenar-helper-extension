/**
 * Which of the game's answers the world map is kept from. On its own, with nothing imported, because
 * the script injected into the game page reads it to know what to pass on, and should carry no
 * more of the map than these names.
 */

/**
 * The answers the map is kept from, as class and method. The count of completed provinces also
 * comes with the startup data, which is read where the rest of that data is.
 */
export const WORLD_MAP_RESPONSES: [requestClass: string, requestMethod: string][] = [
  ['WorldMapService', 'fetchInitialWorldMapData'],
  ['WorldMapService', 'fetchAreas'],
  ['WorldMapService', 'updateMapArea'],
  ['WorldMapService', 'getIncompleteProvinces'],
  ['WorldMapScoutService', 'startScouting'],
  ['WorldMapScoutService', 'findProvincesToScout'],
  ['WorldMapScoutService', 'removeScout'],
  ['UnlockEncounterService', 'unlockEncounterByTrading'],
  ['BattlefieldService', 'instantBattle'],
  ['EffectsService', 'updateSources'],
];

/** The same answers as the message types the service worker handles them under. */
export const WORLD_MAP_RESPONSE_TYPES = WORLD_MAP_RESPONSES.map(
  ([requestClass, requestMethod]) => `R:${requestClass}/${requestMethod}`,
);
