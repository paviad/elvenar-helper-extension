/**
 * Where each building's isometric sprites are: a texture atlas of DXT-compressed pixels (`.atf`)
 * and an XML file naming the pictures in it. Like the build-menu pictures, the files sit on the
 * game's CDN under hashed names, and the map from atlas to file is inlined in the client script,
 * in `rawAssetFiles` and `xmlAssetFiles`, keyed `<atlas>_atlas`.
 */

export const BUILDING_ATLASES_KEY = 'buildingAtlases';
/**
 * The client script the stored atlases were read from. Kept apart from the pictures' own marker,
 * so the atlases are read on the first load after they were added, not only on the next release.
 */
export const BUILDING_ATLASES_SOURCE_KEY = 'buildingAtlasesSource';

export interface BuildingAtlases {
  /** Where the files are served from, ending in a slash. */
  assetBase: string;
  /** Atlas -> file name of its pixels. */
  atf: Record<string, string>;
  /** Atlas -> file name of the XML naming the pictures in it. */
  xml: Record<string, string>;
}

const ATLAS_SUFFIX = '_atlas';

/** The `<atlas>_atlas` entries of one of the client script's file tables. */
const readTable = (source: string, table: string): Record<string, string> | undefined => {
  const start = new RegExp(`["']?${table}["']?\\s*:\\s*\\{`).exec(source);
  if (!start) return undefined;

  // Pair by pair, as for the pictures: some keys are quoted and hold characters a closing brace
  // search would trip on.
  const pair = /\s*,?\s*(?:"([^"]*)"|([\w$.-]+))\s*:\s*"([^"]*)"/y;
  pair.lastIndex = start.index + start[0].length;

  const files: Record<string, string> = {};
  let match: RegExpExecArray | null;
  while ((match = pair.exec(source))) {
    const key = match[1] ?? match[2];
    if (key.endsWith(ATLAS_SUFFIX)) {
      files[key.slice(0, -ATLAS_SUFFIX.length)] = match[3];
    }
  }
  return files;
};

/**
 * Reads both file tables out of the client script's source. Undefined when either is not where it
 * is expected, so a changed client is not read as having no sprites.
 */
export function extractBuildingAtlases(source: string): Omit<BuildingAtlases, 'assetBase'> | undefined {
  const atf = readTable(source, 'rawAssetFiles');
  const xml = readTable(source, 'xmlAssetFiles');
  return atf && xml ? { atf, xml } : undefined;
}
