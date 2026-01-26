import { getFromStorage } from '../chrome/storage';
import { ItemDefinition } from '../model/itemDefinition';

export async function getItemDefinitions() {
  const json = await getFromStorage('items');
  if (json) {
    return JSON.parse(json) as ItemDefinition[];
  } else {
    return [];
  }
}
