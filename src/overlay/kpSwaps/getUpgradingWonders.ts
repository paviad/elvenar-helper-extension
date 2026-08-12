import { CityEntity } from '../../model/cityEntity';

/** The game's own name for the state a building is in while its new level goes up. */
const UPGRADING = 'UpgradingVO';

/**
 * The wonders currently building a new level, by base name.
 *
 * Worth telling apart, because the game opens the next level's research phase while the
 * building is still going up — so a wonder that has just been finished reports needing a whole
 * fresh round of knowledge, and the swap list would offer that figure as though it were room to
 * ask for. What it is is a wonder that has had its fill and is busy with it.
 */
export function getUpgradingWonders(cityEntities: CityEntity[] | undefined): Set<string> {
  const upgrading = (cityEntities ?? [])
    .filter((entity) => entity.type === 'ancient_wonder' && entity.state?.__class__ === UPGRADING)
    // Entity ids carry a level suffix — `B_Humans_AW1_3` — which base names do not.
    .map((entity) => entity.cityentity_id?.replace(/_\d+$/, ''))
    .filter(Boolean);

  return new Set(upgrading);
}
