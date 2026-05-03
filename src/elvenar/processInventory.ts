import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { InventoryItem } from '../model/inventoryItem';
import { getAccountBySessionId } from './AccountManager';
import { extractElvenarResponse } from './extractElvenarResponse';

// eslint-disable-next-line @typescript-eslint/require-await
export async function processInventory(
  untypedResponseArray: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
) {
  const inventoryItems = extractElvenarResponse<InventoryItem[]>(
    untypedResponseArray,
    'InventoryService',
    'updateItems',
  ).flatMap((items) => items);

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  if (accountData) {
    accountData.inventoryItems = inventoryItems;
  }
}
