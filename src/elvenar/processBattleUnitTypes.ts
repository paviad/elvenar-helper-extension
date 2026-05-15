import { saveToStorage } from '../chrome/storage';
import { BattleUnitType, BattleUnitTypesResponse } from '../model/battleUnitType';
import { smartCompress } from '../util/compression';

export const processBattleUnitTypes = async (decodedResponse: string): Promise<void> => {
  const battleUnitTypesRaw = JSON.parse(decodedResponse) as BattleUnitTypesResponse[];

  const battleUnitTypes = battleUnitTypesRaw.map((z) => ({
    unitTypeId: z.unitTypeId,
    name: z.name,
    strengths: z.strengths,
    attackBonus: z.attackBonus,
    defenseBonus: z.defenseBonus,
    unitWeight: z.unitWeight,
  }));

  await setBattleUnitTypes(battleUnitTypes);
};

const setBattleUnitTypes = async (battleUnitTypes: BattleUnitType[]) => {
  const plain = JSON.stringify(battleUnitTypes);
  const compressed = await smartCompress(plain);
  await saveToStorage('battleUnitTypes', compressed);
};
