import { getFromStorage } from '../chrome/storage';

export async function getGoodsNames(): Promise<Record<string, string>> {
  const json = await getFromStorage('goodsNames');
  if (json) {
    const entries = JSON.parse(json) as { id: string; name: string }[];
    return Object.fromEntries(entries.map(({ id, name }) => [id, name]));
  } else {
    return {};
  }
}
