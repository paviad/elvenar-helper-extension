import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { Ingredient } from '../model/ingredient';
import { PotionEffect } from '../model/potionEffect';
import { getAccountBySessionId } from './AccountManager';

export async function sendCauldronQuery(sharedInfo: ExtensionSharedInfo) {
  const { reqUrl: url, reqReferrer: referrer, reqBodyCauldron: reqBody, worldId } = sharedInfo;

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
    throw new Error(
      'Your game session has expired since last time you used this tool. Please refresh the game tab and then refresh this tab.',
    );
  }

  const json = (await response.json()) as [unknown, { responseData: Ingredient[] }, { responseData: PotionEffect[] }];

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  if (accountData) {
    accountData.cauldron = {
      ingredients: json[1].responseData,
      potionEffects: json[2].responseData,
    };
  }
}
