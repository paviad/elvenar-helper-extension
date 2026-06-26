import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { getAccountById, getAccountIdBySessionId, setAccountData } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export async function processSeasonalEvents(untypedJson: unknown, sharedInfo: ExtensionSharedInfo) {
  const json = untypedJson as [{ requestClass: string; responseData: unknown }];

  const seasonalEventsService = json.find((r) => r.requestClass === 'SeasonalEventsService')?.responseData as
    | {
        eventId: number;
        type: string;
        subType: string;
        name: string;
        state: string;
        remainingTime: number;
      }[]
    | undefined;

  if (!seasonalEventsService) {
    console.warn('ElvenAssist: No SeasonalEventsService data found in the provided JSON.');
    return;
  }

  const fa = seasonalEventsService.find(
    (r) => r.type === 'multiplayerEvent' && r.subType === 'mpe_i' && r.state === 'running',
  );

  const accountId = getAccountIdBySessionId(sharedInfo.sessionId);
  if (!accountId) {
    console.warn('ElvenAssist: Account data not found for the given session ID.');
    return;
  }
  const accountData = getAccountById(accountId);
  if (!accountData) {
    console.warn('ElvenAssist: Account data not found for the given session ID.');
    return;
  }
  accountData.faEndTime = fa ? fa.remainingTime * 1000 + Date.now() : undefined;

  if(!accountData.faEndTime) {
    // If the FA event is not running, clear the faDataStore to reset any stored data
    console.log('ElvenAssist: FA event not running, clearing faDataStore for account:', accountId);
    accountData.faDataStore = undefined;
  }

  setAccountData(accountId, accountData);
}
