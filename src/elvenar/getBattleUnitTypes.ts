import { getFromStorage } from '../chrome/storage';
import { BattleUnitType } from '../model/battleUnitType';
import { smartDecompress } from '../util/compression';

export const getBattleUnitTypes = async () => {
  const compressed = await getFromStorage('battleUnitTypes');
  if (!compressed) {
    return [];
  }
  const json = await smartDecompress(compressed);
  if (json) {
    return JSON.parse(json) as BattleUnitType[];
  } else {
    return [];
  }
};
