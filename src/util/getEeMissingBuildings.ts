import { BuildingFinder } from '../city/buildingFinder';
import { getAccountById } from '../elvenar/AccountManager';
import { getEffects } from '../elvenar/getEffects';
import { getCulturalBuildings } from './getCulturalBuildings';

export interface EeMissingBuilding {
  id: number;
  name: string;
  x: number;
  y: number;
  height: number;
  length: number;
}

export const getEeMissingBuildings = async (accountId: string): Promise<EeMissingBuilding[]> => {
  const accountData = getAccountById(accountId);
  const eeData = accountData?.ensorcelledEndowmentData;

  if (!eeData || accountData.isDetached || !accountData.cityQuery) {
    return [];
  }

  const cityEntities = accountData.cityQuery.cityEntities;
  const buildingFinder = new BuildingFinder();
  await buildingFinder.ensureInitialized();
  const effects = await getEffects();
  const cultureBlocks = getCulturalBuildings(cityEntities, buildingFinder, effects, 2, 2);

  const eeMissing = cultureBlocks.filter((block) => {
    const hasEffect = eeData.some((effect) => effect.id === block.id);
    return !hasEffect;
  });

  const rc = eeMissing.map((block) => {
    const buildingDef = buildingFinder.getBuildingExact(block.cityentity_id);
    return {
      id: block.id,
      name: buildingDef ? buildingDef.name : block.cityentity_id,
      x: block.x,
      y: block.y,
      height: buildingDef?.width || 0,
      length: buildingDef?.length || 0,
    };
  });

  return rc;
};
