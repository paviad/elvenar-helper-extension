import { getFromStorage } from '../chrome/storage';
import { BuildingSet } from '../model/buildingSet';

export async function getBuildingSets() {
  const json = await getFromStorage('buildingSets');
  if (json) {
    return JSON.parse(json) as BuildingSet[];
  } else {
    return [];
  }
}
