import { getFromStorage } from '../chrome/storage';
import { Building } from '../model/building';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export async function sendGoodsQuery(sharedInfo: ExtensionSharedInfo) {
  const { reqUrl: url, reqReferrer: referrer } = sharedInfo;

  const response = await fetch(url, {
    headers: {
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
    referrer,
    body: null,
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
  });

  const goodsRaw = (await response.json()) as { id: string; name: string }[];

  const goods = goodsRaw
    .filter((r) => /aw.*?_shards$/.test(r.id) && r.name !== '!!Missing text')
    .map((r) => ({ id: r.id, name: r.name }));

  return goods;
}

export async function getAwBuildings() {
  const json = await getFromStorage('awbuildings');
  if (json) {
    return JSON.parse(json) as Building[];
  } else {
    return [];
  }
}
