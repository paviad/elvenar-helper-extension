import { BuildingFinder } from '../city/buildingFinder';
import { getAccountById } from '../elvenar/AccountManager';
import { getEffects } from '../elvenar/getEffects';
import { EnsorcelledEndowment } from '../model/ensorcelledEndowment';
import { getCulturalBuildings } from './getCulturalBuildings';

export interface EeMissingBuilding {
  id: number;
  name: string;
  x: number;
  y: number;
  height: number;
  length: number;
  helpEndTime?: number;
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

  const eeDictionary = eeData.eeEffects.reduce(
    (acc, effect) => {
      acc[effect.id] = effect;
      return acc;
    },
    {} as Record<number, EnsorcelledEndowment>,
  );

  const helpDictionary = eeData.neighborlyHelpEffects.reduce(
    (acc, effect) => {
      acc[effect.id] = effect;
      return acc;
    },
    {} as Record<number, EnsorcelledEndowment>,
  );

  const eeMissing = cultureBlocks.filter((block) => {
    const hasEffect = eeDictionary[block.id];
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
      helpEndTime: helpDictionary[block.id]?.endTime,
    };
  });

  return rc;
};
