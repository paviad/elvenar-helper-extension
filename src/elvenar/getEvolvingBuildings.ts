import { getFromStorage } from '../chrome/storage';
import { StageProvision } from '../model/stageProvision';

export const getEvolvingBuildings = async () => {
  const json = await getFromStorage('evolvingBuildings');
  if (json) {
    return JSON.parse(json) as StageProvision[];
  } else {
    return [];
  }
};
