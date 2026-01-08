import { AccountData } from '../elvenar/AccountManager';
import { CityEntityEx } from '../model/cityEntity';
import { BuildingFinder } from './buildingFinder';

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
