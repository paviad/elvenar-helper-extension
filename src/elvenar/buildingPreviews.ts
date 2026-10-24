/**
 * The pictures the game's build menu shows for each building. They are plain PNGs on the game's CDN,
 * but under hashed file names, and the only map from building id to file is inlined in the game's
 * client script (`textureAssetFiles`, keys `<id>_preview` and `<id>_preview_large`).
 */

/** The game's client script. The game adds it as a script tag, under a new hash for every release. */
export const GAME_CLIENT_SCRIPT_REGEX =
  /^https:\/\/[a-z]+\.innogamescdn\.com\/cache\/elvenar-release-min-[0-9a-f]+\.js$/;

export const BUILDING_PREVIEWS_KEY = 'buildingPreviews';
/** The client script the stored previews were read from, so a release is read only once. */
export const BUILDING_PREVIEWS_SOURCE_KEY = 'buildingPreviewsSource';

export interface BuildingPreviews {
  /** Where the files are served from, ending in a slash. */
  assetBase: string;
  /** Building id -> file name of the build-menu picture, about 88 px wide. */
  files: Record<string, string>;
  /** Building id -> file name of the 176 x 176 picture. */
  largeFiles: Record<string, string>;
}

export type PreviewSize = 'small' | 'large';

const PREVIEW_SUFFIX = '_preview';
const LARGE_PREVIEW_SUFFIX = '_preview_large';

/** The assets sit on the same host as the client script. */
export function assetBaseOf(scriptUrl: string): string {
  return `${new URL(scriptUrl).origin}/frontend//assets/`;
}

/**
 * Reads both pictures of every building out of the client script's source. Returns undefined when
 * the map is not where it is expected, so a changed client is not read as having no pictures.
 */
export function extractBuildingPreviews(source: string): Omit<BuildingPreviews, 'assetBase'> | undefined {
  const start = /["']?textureAssetFiles["']?\s*:\s*\{/.exec(source);
  if (!start) return undefined;

  // Scanned pair by pair rather than up to the first closing brace: some keys are quoted and hold
  // one, e.g. "A_Evt_Easter_XXII_Ludibria_Ventis${chapter}16_1_atlas".
  const pair = /\s*,?\s*(?:"([^"]*)"|([\w$.-]+))\s*:\s*"([^"]*)"/y;
  pair.lastIndex = start.index + start[0].length;

  const files: Record<string, string> = {};
  const largeFiles: Record<string, string> = {};
  let match: RegExpExecArray | null;
  while ((match = pair.exec(source))) {
    const key = match[1] ?? match[2];
    if (key.endsWith(PREVIEW_SUFFIX)) {
      files[key.slice(0, -PREVIEW_SUFFIX.length)] = match[3];
    } else if (key.endsWith(LARGE_PREVIEW_SUFFIX)) {
      largeFiles[key.slice(0, -LARGE_PREVIEW_SUFFIX.length)] = match[3];
    }
  }
  return { files, largeFiles };
}

/** Event and sale buildings whose id ends in the chapter, e.g. A_Evt_Alien_Egg_10. */
const NEW_CHAPTER_ID = /(A_Evt|A_Sale).*\D+_\d+$/;

/**
 * The file the game shows for a building id. Mirrors the game's CityEntityUtil.getBuildingIcon:
 * a chapter-suffixed id is tried first in its old form (A_Evt_Alien_Egg_10 -> A_Evt_Alien_Egg10_1),
 * which is the only form most of them have a picture under.
 */
export function findBuildingPreview(files: Record<string, string>, id: string): string | undefined {
  if (NEW_CHAPTER_ID.test(id)) {
    const oldId = id.replace(/_(\d+)$/, '$1_1');
    if (files[oldId]) return files[oldId];
  }
  return files[id];
}

export function buildingPreviewUrl(
  previews: BuildingPreviews,
  id: string,
  size: PreviewSize = 'small',
): string | undefined {
  const file = findBuildingPreview(size === 'large' ? previews.largeFiles : previews.files, id);
  return file && previews.assetBase + file;
}
