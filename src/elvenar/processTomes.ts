import { saveToStorage } from '../chrome/storage';
import { Tome } from '../model/tome';

export const processTomes = async (responseText: string) => {
  const tomes = JSON.parse(responseText) as Tome[];

  await setTomes(tomes);
};

async function setTomes(items: Tome[]) {
  const plain = JSON.stringify(items);
  await saveToStorage('tomes', plain);
}
