import { CityEntity } from '../model/cityEntity';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { OtherPlayerClass } from '../model/otherPlayer';
import { UnlockedArea } from '../model/unlockedArea';
import { ElvenarUserData } from '../model/userData';
import {
  AccountData,
  getAccountById,
  getAccountBySessionId,
  getAccountIdBySessionId,
  setAccountData,
} from './AccountManager';

export async function sendQuestQuery(sharedInfo: ExtensionSharedInfo) {
  const { reqUrl: url, reqReferrer: referrer, reqBodyQuest: reqBody, worldId } = sharedInfo;

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

  const json = (await response.json()) as { requestClass: string; responseData: unknown }[];

  const seasonalEventsService = json.find((r) => r.requestClass === 'SeasonalEventsService')?.responseData as {
    eventId: number;
    type: string;
    subType: string;
    name: string;
    state: string;
    remainingTime: number;
  }[];

  const fa = seasonalEventsService.find(
    (r) => r.type === 'multiplayerEvent' && r.subType === 'mpe_i' && r.state === 'running',
  );

  const accountId = getAccountIdBySessionId(sharedInfo.sessionId);
  if (!accountId) {
    throw new Error('ElvenAssist: Account data not found for the given session ID.');
  }
  const accountData = getAccountById(accountId);
  if (!accountData) {
    throw new Error('ElvenAssist: Account data not found for the given session ID.');
  }
  accountData.faEndTime = fa ? fa.remainingTime + Date.now() : undefined;

  console.log('Updated FA time remaining:', accountData.faEndTime);

  await setAccountData(accountId, accountData);
}
