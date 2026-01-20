import { saveToStorage } from '../chrome/storage';

export const processGoodsNames = async (responseText: string) => {
  const goodsNamesRaw = JSON.parse(responseText) as { id: string; name: string }[];

  const goodsNames = goodsNamesRaw.map((z) => ({ id: z.id, name: z.name }));

  await setGoodsNames(goodsNames);
};

async function setGoodsNames(items: { id: string; name: string }[]) {
  const plain = JSON.stringify(items);
  await saveToStorage('goodsNames', plain);
}
