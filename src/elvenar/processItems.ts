import { saveToStorage } from '../chrome/storage';
import { ItemDefinition } from '../model/itemDefinition';

export const processItems = async (decodedResponse: string) => {
  const items = JSON.parse(decodedResponse) as ItemDefinition[];

  await setItemDefinitions(items);
};

async function setItemDefinitions(items: ItemDefinition[]) {
  const plain = JSON.stringify(items);
  await saveToStorage('items', plain);
}
