import { getFromStorage } from '../chrome/storage';
import { Tome } from '../model/tome';

export async function getTomes() {
  const json = await getFromStorage('tomes');
  if (json) {
    return JSON.parse(json) as Tome[];
  } else {
    return [];
  }
}
