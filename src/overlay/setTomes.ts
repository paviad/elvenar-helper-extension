import { saveToStorage } from '../chrome/storage';
import { Tome } from '../model/tome';

export async function setTomes(items: Tome[]) {
  const plain = JSON.stringify(items);
  await saveToStorage('tomes', plain);
}
