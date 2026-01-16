import { saveToStorage } from '../chrome/storage';

export async function setAwBuildings(awBuildings: { id: string; name: string }[]) {
  const plain = JSON.stringify(awBuildings);
  await saveToStorage('awbuildings', plain);
}
