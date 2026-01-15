import { getFromStorage } from '../chrome/storage';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { GoodsBuilding, GoodsBuildingRaw } from '../model/goodsBuilding';
import { getPrefix } from '../util/getPrefix';

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

  const goodsRenderConfig = (json.building_configs as GoodsBuildingRaw[]).map(
    (r) =>
      ({
        t: r.type,
        id: r.id,
        w: r.tile_width,
        l: r.tile_length,
      } as GoodsBuilding),
  );

  const maxLevels = goodsRenderConfig
    .filter((r) => /^[GPRHMOYDBZ]_/.test(r.id))
    .map((r) => ({
      prefix: getPrefix(r.id, r.t),
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
    return decompress(JSON.parse(json) as GoodsBuilding[]);
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

const decompression: Record<string, string> = {
  c: 'culture',
  cr: 'culture_residential',
  e: 'expiring',
  g: 'goods',
  a: 'ancient_wonder',
  gu: 'guardian',
  po: 'portal',
  ac: 'academy',
  mb: 'main_building',
  m: 'military',
  ar: 'armory',
  pp: 'premium_production',
  p: 'production',
  pr: 'premium_residential',
  r: 'residential',
  s: 'street',
  t: 'trader',
  wh: 'worker_hut',
};

function decompress(goodsRenderConfig: GoodsBuilding[]): GoodsBuilding[] {
  return goodsRenderConfig.map((r) => ({
    t: decompression[r.t],
    id: r.id,
    w: r.w,
    l: r.l,
  }));
}
