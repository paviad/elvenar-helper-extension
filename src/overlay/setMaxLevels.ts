import { saveToStorage } from '../chrome/storage';

export async function setMaxLevels(maxLevels: Record<string, number>) {
  const plain = JSON.stringify(maxLevels);
  await saveToStorage('maxLevels', plain);
}
