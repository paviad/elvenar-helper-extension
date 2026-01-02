import { getFromStorage } from '../chrome/storage';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { GoodsBuilding } from '../model/goodsBuilding';

export async function sendRenderConfigQuery(sharedInfo: ExtensionSharedInfo) {
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

  const json = await response.json();

  const goodsRenderConfig = (json.building_configs as GoodsBuilding[]).map((r) => ({
    type: r.type,
    id: r.id,
    tile_width: r.tile_width,
    tile_length: r.tile_length,
  }));

  const maxLevels = goodsRenderConfig
    .filter((r) => /^[GPRHMO]_/.test(r.id))
    .map((r) => ({
      prefix: getPrefix(r),
      level: Number(/_(\d+)$/.exec(r.id)?.[1]),
    }))
    .reduce(
      (acc, curr) => ({
        ...acc,
        [curr.prefix]: Math.max(acc[curr.prefix] || 0, curr.level),
      }),
      {} as Record<string, number>,
    );

  return {
    goodsRenderConfig,
    maxLevels,
  };
}

export async function getGoodsBuildings() {
  const json = await getFromStorage('goodsRenderConfig');
  if (json) {
    return JSON.parse(json) as GoodsBuilding[];
  } else {
    return [];
  }
}

export async function getMaxLevels() {
  const json = await getFromStorage('maxLevels');
  if (json) {
    return JSON.parse(json) as Record<string, number>;
  } else {
    return {};
  }
}

export const getPrefix = (r: GoodsBuilding) => {
  const c = r.id[0];
  if (r.type.includes('premium')) return `X${c}`;
  if (c === 'M') return `M${r.id[2]}`;
  return c;
};
