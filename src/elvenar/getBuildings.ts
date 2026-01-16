import { getFromStorage } from '../chrome/storage';
import { Building } from '../model/building';
import { smartDecompress } from '../util/compression';

export async function getBuildings() {
  const buildingsAll = await getBuildingsAll();
  const buildingsFeature = await getBuildingsFeature();
  return buildingsAll.concat(buildingsFeature);
}

async function getBuildingsAll() {
  const compressedAll = await getFromStorage('buildings');
  if (!compressedAll) {
    return [];
  }
  const json = await smartDecompress(compressedAll);
  if (json) {
    return JSON.parse(json) as Building[];
  } else {
    return [];
  }
}

async function getBuildingsFeature() {
  const compressedFeature = await getFromStorage('buildingsFeature');
  if (!compressedFeature) {
    return [];
  }
  const json = await smartDecompress(compressedFeature);
  if (json) {
    return JSON.parse(json) as Building[];
  } else {
    return [];
  }
}
