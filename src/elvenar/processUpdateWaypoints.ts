import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { FAStoreData, processFaMapOverview, WaypointVO } from '../model/faStageProgress';
import { getAccountById, getAccountIdBySessionId } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export async function processUpdateWaypoints(
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

  const waypointsData = response.find(
    (entry) => entry.requestClass === 'MultiplayerEventService' && entry.requestMethod === 'updateWaypoints',
  ) as { responseData: WaypointVO[] } | undefined;

  if (waypointsData && Array.isArray(waypointsData.responseData)) {
    processFaMapOverview(faDataStore, waypointsData.responseData);
  }

  accountData.faDataStore = faDataStore; // Update the account data with the modified faDataStore

  return faDataStore;
}
