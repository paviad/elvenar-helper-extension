import { BuildingFinder } from '../city/buildingFinder';
import { CityEntity } from '../model/cityEntity';
import { Effect } from '../model/effect';

export const getCulturalBuildings = (
  blocks: CityEntity[],
  buildingFinder: BuildingFinder,
  effects: Effect[],
  minWidth = 2,
  minLength = 2,
): CityEntity[] => {
  const keysSet = new Set<string>();
  const petBuildings = effects
    .filter((e) => e.action === 'spell_pet_food_1')
    .map((e) => e.targets || [])
    .flat();
  const rc = blocks
    .map((b) => ({ b, building: buildingFinder.getBuildingExact(b.cityentity_id) }))
    .filter((r) => !petBuildings.includes(r.building?.sourceBuilding.base_name || ''))
    .filter(
      (r) =>
        (r.building?.sourceBuilding.width ?? 0) >= minWidth && (r.building?.sourceBuilding.length ?? 0) >= minLength,
    )
    .filter((r) => r.building?.sourceBuilding.provisions?.resources?.resources?.culture);

  return rc.map((r) => r.b);
};
