import { getFromStorage } from '../chrome/storage';
import { CityEntity } from '../model/cityEntity';
import { UnlockedArea } from '../model/unlockedArea';

let cityEntities: CityEntity[] = [];
let unlockedAreas: UnlockedArea[] = [];

export async function sendCityDataQuery() {
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
  const city_map = json.find((r: any) => r.requestClass === 'StartupService')?.responseData?.city_map;
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
