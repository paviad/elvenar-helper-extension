import { getFromStorage } from '../chrome/storage';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { ItemDefinition } from '../model/itemDefinition';

export async function sendItemsQuery(sharedInfo: ExtensionSharedInfo) {
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

  const items = (await response.json()) as ItemDefinition[];

  return items;
}

export async function getItemDefinitions() {
  const json = await getFromStorage('itemDefinitions');
  if (json) {
    return JSON.parse(json) as ItemDefinition[];
  } else {
    return [];
  }
}
