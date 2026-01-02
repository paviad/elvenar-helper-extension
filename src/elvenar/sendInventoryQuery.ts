import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { InventoryItem } from '../model/inventoryItem';
import { getAccountBySessionId } from './AccountManager';

export async function sendInventoryQuery(sharedInfo: ExtensionSharedInfo) {
  const { reqUrl: url, reqReferrer: referrer, reqBodyInventory: reqBody, worldId } = sharedInfo;

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

  const json = (await response.json()) as [unknown, { responseData: InventoryItem[] }];
  console.log('inventory response', json, sharedInfo.sessionId);

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  if (accountData) {
    accountData.inventoryItems = json[1].responseData;
  }
}
