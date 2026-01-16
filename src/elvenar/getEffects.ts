import { getFromStorage } from '../chrome/storage';
import { Effect } from '../model/effect';

export async function getEffects() {
  const json = await getFromStorage('effects');
  if (json) {
    return JSON.parse(json) as Effect[];
  } else {
    return [];
  }
}
