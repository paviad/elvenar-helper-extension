import { getAccountById } from '../elvenar/AccountManager';
import { CityEntityEx } from '../model/cityEntity';
import { BuildingFinder } from './buildingFinder';

export async function generateCity(accountId: string) {
  const accountData = getAccountById(accountId);
  if (!accountData || !accountData.cityQuery) {
    return;
  }

  const finder = new BuildingFinder();
  await finder.ensureInitialized();

  const cityEntities = accountData.cityQuery.cityEntities;
  const unlockedAreas = accountData.cityQuery.unlockedAreas;

  const q = cityEntities.map((entity) => ({
    ...entity,
    ...finder.getCityEntityExtraData(entity.cityentity_id, entity.level),
  })) satisfies CityEntityEx[];

  return { q, unlockedAreas };
}
