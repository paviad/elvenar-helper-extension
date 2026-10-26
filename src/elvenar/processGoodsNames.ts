import { saveToStorage } from '../chrome/storage';
import { GoodDefinition } from '../model/goodDefinition';

export const processGoodsNames = async (responseText: string) => {
  const goodsNamesRaw = JSON.parse(responseText) as GoodDefinition[];

  // The tier, chain and set are what a reward naming a boosted good is worked out from.
  const goodsNames = goodsNamesRaw.map(({ id, name, quality, chain, type }) => ({ id, name, quality, chain, type }));

  await setGoodsNames(goodsNames);
};

async function setGoodsNames(items: GoodDefinition[]) {
  const plain = JSON.stringify(items);
  await saveToStorage('goodsNames', plain);
}
