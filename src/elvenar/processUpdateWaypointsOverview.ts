import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { FAOverviewData } from '../model/faOverview';
import { FAStoreData } from '../model/faStageProgress';
import { getAccountById, getAccountIdBySessionId } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export async function processUpdateWaypointsOverview(
  untypedJson: unknown,
  sharedInfo: ExtensionSharedInfo,
): Promise<FAStoreData | undefined> {
  const response = untypedJson as ElvenarRequestResponseEntry[];

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

  const faDataStore = accountData.faDataStore || { waypoints: {}, chests: {}, currentStage: 1 };

  const overviewData = response.find(
    (entry) => entry.requestClass === 'MultiplayerEventService' && entry.requestMethod === 'updateOverview',
  ) as { responseData: FAOverviewData } | undefined;

  if (overviewData) {
    faDataStore.currentStage = overviewData.responseData.difficulty;
  }

  accountData.faDataStore = faDataStore; // Update the account data with the modified faDataStore

  console.log('difficulty', faDataStore);

  return faDataStore;
}
