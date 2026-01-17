import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { InventoryItem } from '../model/inventoryItem';
import { getAccountBySessionId } from './AccountManager';

export async function processInventory(untypedJson: unknown, sharedInfo: ExtensionSharedInfo) {
  const json = untypedJson as [unknown, { responseData: InventoryItem[]; }];

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  if (accountData) {
    accountData.inventoryItems = json[1].responseData;
  }
}
