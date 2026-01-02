import { BoostedGoods } from '../model/boostedGoods';
import { CityEntity } from '../model/cityEntity';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { UnlockedArea } from '../model/unlockedArea';
import { ElvenarUserData } from '../model/userData';
import { AccountData, getAccountId, setAccountData } from './AccountManager';

export async function sendCityDataQuery(sharedInfo: ExtensionSharedInfo) {
  const { reqUrl: url, reqReferrer: referrer, reqBodyCity: reqBody, worldId } = sharedInfo;

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
    referrer,
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

  const json = (await response.json()) as [{ requestClass: string; responseData: unknown }];

  const responseData = json.find((r) => r.requestClass === 'StartupService')?.responseData as {
    user_data: ElvenarUserData;
    featureFlags: { feature: string }[];
    city_map: { entities: CityEntity[]; unlocked_areas: UnlockedArea[] };
    relic_boost_good: BoostedGoods[];
  };

  console.log(responseData);

  const { user_data, featureFlags, city_map, relic_boost_good } = responseData;

  const maxChapter = Number(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    featureFlags?.find((r: any) => r.feature.startsWith('ch'))?.feature.replace('ch', ''),
  );

  const boostedGoods = relic_boost_good.map((bg) => `${bg.good_type === 'common' ? '' : bg.good_type}${bg.good_id}`);

  const chapter = user_data.technologySection.index;

  const cityEntities = city_map.entities;
  const unlockedAreas = city_map.unlocked_areas;

  const worldNames: Record<string, string> = {
    '1': 'Arendyll',
    '2': 'Wyniandor',
    '3': 'Felyndral',
  };
  const accountId = getAccountId(user_data.player_id, worldId);
  const worldName = worldNames[worldId[worldId.length - 1]] || 'Unknown World';
  const accountName = `${user_data.user_name} (${worldId} ${worldName})`;

  const data = {
    cityQuery: {
      maxChapter,
      boostedGoods,
      chapter,
      cityEntities,
      unlockedAreas,
      userData: user_data,
      accountId,
      accountName,
      url,
    },
    sharedInfo,
  } satisfies AccountData;

  await setAccountData(accountId, data);
}
