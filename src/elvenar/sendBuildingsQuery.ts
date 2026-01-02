import { getFromStorage } from '../chrome/storage';
import { Building } from '../model/building';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export async function sendBuildingsQuery(sharedInfo: ExtensionSharedInfo) {
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

  const buildings = await response.json();

  return buildings;
}

export async function getBuildings() {
  const json = await getFromStorage('buildings');
  if (json) {
    return JSON.parse(json) as Building[];
  } else {
    return [];
  }
}
