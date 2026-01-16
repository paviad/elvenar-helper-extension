import { saveToStorage } from '../chrome/storage';
import { ItemDefinition } from '../model/itemDefinition';

export async function setItemDefinitions(items: ItemDefinition[]) {
  const plain = JSON.stringify(items);
  await saveToStorage('items', plain);
}
