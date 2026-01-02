import { getFromStorage } from '../chrome/storage';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { Tome } from '../model/tome';

export async function sendTomesQuery(sharedInfo: ExtensionSharedInfo) {
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

  const tomes = (await response.json()) as Tome[];

  return tomes;
}

export async function getTomes() {
  const json = await getFromStorage('tomes');
  if (json) {
    return JSON.parse(json) as Tome[];
  } else {
    return [];
  }
}
