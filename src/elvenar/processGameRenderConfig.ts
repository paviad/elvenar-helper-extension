import { getFromStorage, saveManyToStorage } from '../chrome/storage';
import { smartCompress } from '../util/compression';
import {
  BUILDING_RENDERS_KEY,
  BUILDING_RENDERS_SOURCE_KEY,
  RENDER_CONFIG_REGEX,
  slimRenderConfig,
} from './buildingRenders';

/** Several game tabs report the same file at once; this keeps it to one download. */
const inFlight = new Map<string, Promise<void>>();

/**
 * Reads how each building is drawn out of the game's render config, once per release. The file
 * is some 15 MB, so it is downloaded here, from its public URL, rather than handed over from the
 * page; only the sheet and anchor points of each building are kept.
 */
export const processGameRenderConfig = async (url: string): Promise<void> => {
  if (!RENDER_CONFIG_REGEX.test(url)) return;
  if ((await getFromStorage(BUILDING_RENDERS_SOURCE_KEY)) === url) return;

  let pending = inFlight.get(url);
  if (!pending) {
    pending = readRenders(url).finally(() => inFlight.delete(url));
    inFlight.set(url, pending);
  }
  await pending;
};

async function readRenders(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`ElvenAssist: Could not download the game render config (${response.status})`);
    return;
  }
  const renders = slimRenderConfig((await response.json()) as Parameters<typeof slimRenderConfig>[0]);
  if (Object.keys(renders).length === 0) {
    console.warn('ElvenAssist: No building renders found in the game render config');
    return;
  }
  await saveManyToStorage({
    [BUILDING_RENDERS_KEY]: await smartCompress(JSON.stringify(renders)),
    [BUILDING_RENDERS_SOURCE_KEY]: url,
  });
}
