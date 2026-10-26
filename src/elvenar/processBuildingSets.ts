import { saveToStorage } from '../chrome/storage';
import { BuildingSet } from '../model/buildingSet';

interface BuildingSetRaw {
  id: string;
  name: string;
  buildings?: { baseName: string; bonuses?: { adjacencyCount: number; type: string; factor: number }[] }[];
}

/**
 * The sets the game knows of, from the file it loads at startup. A building's name does not say
 * which set it is in - "Shuffle Garden" is the event, holding the Floating Garden and Boughsong
 * Terraces sets among others - so this is the only place membership can be read from. The
 * chapter sets share pieces between them; the event sets do not.
 */
export const processBuildingSets = async (responseText: string) => {
  const raw = JSON.parse(responseText) as BuildingSetRaw[];

  const sets = raw.map(
    (set) =>
      ({
        id: set.id,
        name: set.name,
        pieces: (set.buildings ?? []).map((piece) => ({
          baseName: piece.baseName,
          bonuses: (piece.bonuses ?? []).map(({ adjacencyCount, type, factor }) => ({ adjacencyCount, type, factor })),
        })),
      }) satisfies BuildingSet,
  );

  await saveToStorage('buildingSets', JSON.stringify(sets));
};
