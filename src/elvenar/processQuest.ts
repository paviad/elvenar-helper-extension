import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountIdBySessionId, getAccountById, setAccountData } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export async function processQuest(untypedJson: unknown, sharedInfo: ExtensionSharedInfo) {
  const json = untypedJson as [{ requestClass: string; responseData: unknown; }];

  const seasonalEventsService = json.find((r) => r.requestClass === 'SeasonalEventsService')?.responseData as {
    eventId: number;
    type: string;
    subType: string;
    name: string;
    state: string;
    remainingTime: number;
  }[] | undefined;

  if (!seasonalEventsService) {
    console.warn('ElvenAssist: No SeasonalEventsService data found in the provided JSON.');
    return;
  }

  const fa = seasonalEventsService.find(
    (r) => r.type === 'multiplayerEvent' && r.subType === 'mpe_i' && r.state === 'running'
  );

  const accountId = getAccountIdBySessionId(sharedInfo.sessionId);
  if (!accountId) {
    throw new Error('ElvenAssist: Account data not found for the given session ID.');
  }
  const accountData = getAccountById(accountId);
  if (!accountData) {
    throw new Error('ElvenAssist: Account data not found for the given session ID.');
  }
  accountData.faEndTime = fa ? fa.remainingTime * 1000 + Date.now() : undefined;

  setAccountData(accountId, accountData);
}
