import { saveToStorage } from '../chrome/storage';
import { Building } from '../model/building';
import { smartCompress } from '../util/compression';

export async function setBuildingsFeature(buildings: Building[]) {
  const plain = JSON.stringify(buildings);
  const compressed = await smartCompress(plain);
  await saveToStorage('buildingsFeature', compressed);
}
