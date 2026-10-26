import { getManyFromStorage, saveManyToStorage } from '../chrome/storage';
import {
  BUILDING_ATLASES_KEY,
  BUILDING_ATLASES_SOURCE_KEY,
  BuildingAtlases,
  extractBuildingAtlases,
} from './buildingAtlases';
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
 * Reads the file names of the building pictures and of the sprite atlases out of the game's client
 * script, once per release. The script is about 33 MB (some 5 MB compressed over the wire), so it
 * is downloaded only when its URL, which carries its hash, changes - or when either was never
 * read from it, as after an update that added the atlases.
 */
export const processGameClientScript = async (scriptUrl: string): Promise<void> => {
  if (!GAME_CLIENT_SCRIPT_REGEX.test(scriptUrl)) return;
  const read = await getManyFromStorage([BUILDING_PREVIEWS_SOURCE_KEY, BUILDING_ATLASES_SOURCE_KEY]);
  if (read[BUILDING_PREVIEWS_SOURCE_KEY] === scriptUrl && read[BUILDING_ATLASES_SOURCE_KEY] === scriptUrl) return;

  let pending = inFlight.get(scriptUrl);
  if (!pending) {
    pending = readClientScript(scriptUrl).finally(() => inFlight.delete(scriptUrl));
    inFlight.set(scriptUrl, pending);
  }
  await pending;
};

async function readClientScript(scriptUrl: string) {
  const response = await fetch(scriptUrl);
  if (!response.ok) {
    console.warn(`ElvenAssist: Could not download the game client script (${response.status})`);
    return;
  }

  const source = await response.text();
  const items: Record<string, string> = {};

  const found = extractBuildingPreviews(source);
  if (found && Object.keys(found.files).length > 0) {
    const previews: BuildingPreviews = { assetBase: assetBaseOf(scriptUrl), ...found };
    items[BUILDING_PREVIEWS_KEY] = JSON.stringify(previews);
    items[BUILDING_PREVIEWS_SOURCE_KEY] = scriptUrl;
  } else {
    console.warn('ElvenAssist: No building pictures found in the game client script');
  }

  const atlases = extractBuildingAtlases(source);
  if (atlases && Object.keys(atlases.atf).length > 0) {
    const stored: BuildingAtlases = { assetBase: assetBaseOf(scriptUrl), ...atlases };
    items[BUILDING_ATLASES_KEY] = JSON.stringify(stored);
    items[BUILDING_ATLASES_SOURCE_KEY] = scriptUrl;
  } else {
    console.warn('ElvenAssist: No sprite atlases found in the game client script');
  }

  if (Object.keys(items).length) {
    await saveManyToStorage(items);
  }
}
