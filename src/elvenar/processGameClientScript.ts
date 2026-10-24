import { getFromStorage, saveManyToStorage } from '../chrome/storage';
import {
  assetBaseOf,
  BUILDING_PREVIEWS_KEY,
  BUILDING_PREVIEWS_SOURCE_KEY,
  BuildingPreviews,
  extractBuildingPreviews,
  GAME_CLIENT_SCRIPT_REGEX,
} from './buildingPreviews';

/** Several game tabs report the same script at once; this keeps it to one download. */
const inFlight = new Map<string, Promise<void>>();

/**
 * Reads the building pictures' file names out of the game's client script, once per release. The
 * script is about 33 MB (some 5 MB compressed over the wire), so it is downloaded only when its URL,
 * which carries its hash, changes.
 */
export const processGameClientScript = async (scriptUrl: string): Promise<void> => {
  if (!GAME_CLIENT_SCRIPT_REGEX.test(scriptUrl)) return;
  if ((await getFromStorage(BUILDING_PREVIEWS_SOURCE_KEY)) === scriptUrl) return;

  let pending = inFlight.get(scriptUrl);
  if (!pending) {
    pending = readBuildingPreviews(scriptUrl).finally(() => inFlight.delete(scriptUrl));
    inFlight.set(scriptUrl, pending);
  }
  await pending;
};

async function readBuildingPreviews(scriptUrl: string) {
  const response = await fetch(scriptUrl);
  if (!response.ok) {
    console.warn(`ElvenAssist: Could not download the game client script (${response.status})`);
    return;
  }

  const found = extractBuildingPreviews(await response.text());
  if (!found || Object.keys(found.files).length === 0) {
    console.warn('ElvenAssist: No building pictures found in the game client script');
    return;
  }

  const previews: BuildingPreviews = { assetBase: assetBaseOf(scriptUrl), ...found };
  await saveManyToStorage({
    [BUILDING_PREVIEWS_KEY]: JSON.stringify(previews),
    [BUILDING_PREVIEWS_SOURCE_KEY]: scriptUrl,
  });
}
