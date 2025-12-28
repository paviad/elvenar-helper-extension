import { getFromStorage, saveToStorage } from '../chrome/storage';
import { BoostedGoods } from '../model/boostedGoods';
import { CityEntity } from '../model/cityEntity';
import { UnlockedArea } from '../model/unlockedArea';

let cityEntities: CityEntity[] = [];
let unlockedAreas: UnlockedArea[] = [];
let chapter: number;
let boostedGoods: string[] = [];

export async function sendCityDataQuery(refresh = false) {
  if (!refresh && cityEntities.length > 0 && unlockedAreas.length > 0) {
    console.log('City data already fetched, skipping fetch.');
    return;
  }

  const url = await getFromStorage('reqUrl');

  if (!url) {
    alert('No URL found in storage.');
    return;
  }

  const reqBody = await getFromStorage('reqBodyCity');

  if (!reqBody) {
    alert('No Request Body found in storage. Refresh the game tab and then refresh this tab.');
    return;
  }

  console.log('Retrieved URL from storage:', url);

  const response = await fetch(url, {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,he-IL;q=0.8,he;q=0.7',
      'content-type': 'application/json',
      'os-type': 'browser',
      priority: 'u=1, i',
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'ElvenarHaxeClient',
    },
    referrer: 'https://en3.elvenar.com/game',
    body: reqBody,
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  });

  if (!response.ok) {
    alert(
      'Your game session has expired since last time you used this tool. Please refresh the game tab and then refresh this tab.',
    );
    return;
  }

  const json = await response.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseData = json.find((r: any) => r.requestClass === 'StartupService')?.responseData;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chapter = Number(responseData?.featureFlags?.find((r: any) => r.feature.startsWith('ch'))?.feature.replace('ch', ''));
  console.log('Current Chapter:', chapter);
  saveToStorage('currentChapter', `${chapter}`);

  const boostedGoodsRaw: BoostedGoods[] = responseData?.relic_boost_good;
  boostedGoods = boostedGoodsRaw.map((bg) => `${bg.good_type === 'common' ? '' : bg.good_type}${bg.good_id}`);
  console.log('Boosted Goods:', boostedGoods);
  saveToStorage('boostedGoods', JSON.stringify(boostedGoods));

  const city_map = responseData?.city_map;
  if (!city_map) {
    alert('City map data not found in response.');
    return;
  }

  cityEntities = city_map.entities;
  unlockedAreas = city_map.unlocked_areas;

  console.log('City Entities:', cityEntities);

  // const postResponse = await fetch("https://localhost:7274/api/cityentities", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json", // Declare the content type
  //   },
  //   body: JSON.stringify(cityEntities),
  // });
}

export const getCityEntities = () => cityEntities;
export const getUnlockedAreas = () => unlockedAreas;
export const getCurrentChapter = async () => {
  const ch = await getFromStorage('currentChapter');
  if (ch === undefined) {
    await sendCityDataQuery();
    return chapter;
  }
  return ch ? Number(ch) : undefined;
};
export const getBoostedGoods = async () => {
  const bg = await getFromStorage('boostedGoods');
  if (bg === undefined) {
    await sendCityDataQuery();
    return boostedGoods;
  }
  return bg ? JSON.parse(bg) : [];
};
