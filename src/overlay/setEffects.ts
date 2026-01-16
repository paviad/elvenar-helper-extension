import { saveToStorage } from '../chrome/storage';
import { Effect } from '../model/effect';

export async function setEffects(items: Effect[]) {
  const plain = JSON.stringify(items);
  await saveToStorage('effects', plain);
}
