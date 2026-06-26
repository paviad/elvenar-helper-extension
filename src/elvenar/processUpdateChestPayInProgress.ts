import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { ChestPayInProgressVO, FAStoreData, processFaNodeDetails } from '../model/faStageProgress';
import { getAccountIdBySessionId, getAccountById } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export async function processUpdateChestPayInProgress(
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

  const chestPayInProgressData = response.find(
    (entry) => entry.requestClass === 'ChestsService' && entry.requestMethod === 'updateChestPayInProgress',
  ) as { responseData: ChestPayInProgressVO[] } | undefined;

  if (chestPayInProgressData && Array.isArray(chestPayInProgressData.responseData)) {
    processFaNodeDetails(faDataStore, chestPayInProgressData.responseData);
  }

  accountData.faDataStore = faDataStore; // Update the account data with the modified faDataStore

  console.log('node progress', faDataStore);

  return faDataStore;
}
