import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { InventoryItem } from '../model/inventoryItem';
import { getAccountBySessionId } from './AccountManager';

export async function processInventory(untypedJson: unknown, sharedInfo: ExtensionSharedInfo) {
  const responseJson = untypedJson as {
    requestClass: string;
    requestMethod: string;
    responseData: unknown;
  }[];

  const json = responseJson.find(
    (entry) => entry.requestClass === 'InventoryService' && entry.requestMethod === 'updateItems',
  );

  const inventoryItems = json?.responseData as InventoryItem[];

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  if (accountData) {
    accountData.inventoryItems = inventoryItems;
  }
}
