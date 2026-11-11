import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { WorldMapStatus, worldMapStatus } from '../worldmap/deriveWorldMap';
import { applyWorldMapResponse, emptyWorldMap } from '../worldmap/worldMapState';
import { getAccountBySessionId } from './accountStore';

/**
 * Keeps the city's world map as the game tells of it: when the player opens or pans the map,
 * lists their incomplete provinces, sends the scout, or wins an encounter. Nothing is ever asked
 * of the game. Answers with what the overlay shows about the map.
 */
export const processWorldMap = async (
  responses: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<WorldMapStatus | undefined> => {
  const accountData = getAccountBySessionId(sharedInfo.sessionId);
  if (!accountData) {
    return undefined;
  }

  const now = Date.now();
  const before = accountData.worldMap ?? emptyWorldMap();
  const after = responses.reduce((state, entry) => applyWorldMapResponse(state, entry, now), before);
  if (after !== before) {
    accountData.worldMap = after;
  }
  return worldMapStatus(after, now);
};

/**
 * The startup data carries the count of completed provinces among everything else. It answers
 * with nothing, so that what goes back for the startup data is still the city's own answer.
 */
export const processWorldMapAtStartup = async (
  responses: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
): Promise<void> => {
  await processWorldMap(responses, sharedInfo);
};
