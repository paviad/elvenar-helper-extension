import { GoodsBuilding } from '../model/goodsBuilding';

let goodsRenderConfig: GoodsBuilding[] = [];

export async function sendRenderConfigQuery(refresh = false) {
  if (!refresh && goodsRenderConfig.length > 0) {
    console.log('Goods render config already fetched, skipping fetch.');
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
      referrer: 'https://en3.elvenar.com/',
      body: null,
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    },
  );

  const json = await response.json();

  goodsRenderConfig = json.building_configs;

  console.log('Response JSON:', goodsRenderConfig);

  // const postResponse = await fetch("https://localhost:7274/api/goods", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json", // Declare the content type
  //   },
  //   body: JSON.stringify(goodsRenderConfig),
  // });
}

export const getGoodsBuildings = () => goodsRenderConfig;
