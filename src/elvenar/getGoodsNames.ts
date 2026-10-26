import { getFromStorage } from '../chrome/storage';
import { GoodDefinition } from '../model/goodDefinition';

export async function getGoodsNames(): Promise<Record<string, string>> {
  const entries = await getGoodDefinitions();
  return Object.fromEntries(entries.map(({ id, name }) => [id, name]));
}

/** The goods as saved, with the tier, chain and set where the game gave them. */
export async function getGoodDefinitions(): Promise<GoodDefinition[]> {
  const json = await getFromStorage('goodsNames');
  if (json) {
    return JSON.parse(json) as GoodDefinition[];
  } else {
    return [];
  }
}
