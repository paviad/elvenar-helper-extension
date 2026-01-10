import { AccountData } from '../elvenar/AccountManager';
import { CityEntity, CityEntityEx } from '../model/cityEntity';
import { BuildingFinder } from './buildingFinder';
import { CityBlock } from './CityBlock';

export async function generateCity(accountData: AccountData) {
  const finder = new BuildingFinder();
  await finder.ensureInitialized();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const cityEntities = accountData.cityQuery!.cityEntities;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const unlockedAreas = accountData.cityQuery!.unlockedAreas;

  const q = cityEntities.map((entity) => ({
    ...entity,
    ...finder.getCityEntityExtraData(entity.cityentity_id, entity.level),
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
      } satisfies CityEntity),
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
