import { AncientWonder } from '../../city/buildingFinder';
import { CityEntity } from '../../model/cityEntity';

// The wonders you can actually be given knowledge points for are the ones standing in your
// city, so the copy list is filtered to those rather than the whole catalog. Asking for a
// wonder you have not built is the other easy way to waste a round.

/**
 * The catalog entries you have built, in the catalog's order (by display name). Entity ids
 * carry a level suffix — `Z_Abyss_9` — which the catalog's base names do not.
 */
export function getOwnedWonders(cityEntities: CityEntity[] | undefined, wonders: AncientWonder[]): AncientWonder[] {
  if (!cityEntities?.length || wonders.length === 0) {
    return [];
  }

  const built = new Set(cityEntities.map((entity) => entity.cityentity_id?.replace(/_\d+$/, '')).filter(Boolean));

  return wonders.filter((wonder) => built.has(wonder.baseName));
}
