import { getFromStorage } from '../chrome/storage';
import { GoodsBuilding } from '../model/goodsBuilding';

let goodsRenderConfig: GoodsBuilding[] = [];
let maxLevels: Record<string, number> = {};

export async function sendRenderConfigQuery(refresh = false) {
  if (!refresh && goodsRenderConfig.length > 0) {
    return;
  }

  const referrer = await getFromStorage('reqReferrer');

  if (!referrer) {
    alert("I didn't see your city, please refresh the game tab and then refresh this tab.");
    return;
  }

  const response = await fetch(
    'https://oxen.innogamescdn.com/frontend//assets/renderconfigdata-8411549d767bbd93af72ff579b5c865f.json',
    {
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
    },
  );

  const json = await response.json();

  goodsRenderConfig = json.building_configs;

  maxLevels = goodsRenderConfig
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

  console.log('Max Levels:', maxLevels);

  // const postResponse = await fetch("https://localhost:7274/api/goods", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json", // Declare the content type
  //   },
  //   body: JSON.stringify(goodsRenderConfig),
  // });
}

export const getPrefix = (r: GoodsBuilding) => {
  const c = r.id[0];
  if (r.type.includes('premium')) return `X${c}`;
  if (c === 'M') return `M${r.id[2]}`;
  return c;
};

export const getGoodsBuildings = () => goodsRenderConfig;
export const getMaxLevels = () => maxLevels;
