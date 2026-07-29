import { AccountData } from '../elvenar/Accounts';
import { CityEntity, CityEntityEx } from '../model/cityEntity';
import { getBuildingFinder } from './buildingFinder';
import { CityBlock } from './CityBlock';

export async function generateCity(accountData: AccountData) {
  const finder = getBuildingFinder();
  await finder.ensureInitialized();

  const cityEntities = accountData.cityQuery!.cityEntities;
  const unlockedAreas = accountData.cityQuery!.unlockedAreas;
  const expirationsEnd = accountData.cityQuery!.expirationsEnd;

  const q = cityEntities.map((entity) => ({
    ...entity,
    ...finder.getCityEntityExtraData(entity.cityentity_id, entity.level),
    expirationEnd: expirationsEnd?.[entity.id],
  })) satisfies CityEntityEx[];

  return { q, unlockedAreas };
}

export function saveBack(cityBlocks: CityBlock[]) {
  const updatedCityEntities = cityBlocks.map(
    (block) =>
      ({
        ...block.entity,
        x: block.x,
        y: block.y,
        level: block.level,
      }) satisfies CityEntity,
  );

  return updatedCityEntities;
}

export function resetMovedInPlace(cityBlocks: CityBlock[]) {
  cityBlocks.forEach((block) => {
    if (block.moved) {
      block.originalX = block.x;
      block.originalY = block.y;
      block.moved = false;
    }
  });
}
