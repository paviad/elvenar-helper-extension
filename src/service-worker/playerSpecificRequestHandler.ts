import {
  InterceptedPlayerSpecificRequest,
  sendCityDataUpdatedMessage,
  sendOtherPlayerCityDataUpdatedMessage,
} from '../chrome/messages';
import { getAccountBySessionId, loadAccountManagerFromStorage, saveAllAccounts } from '../elvenar/AccountManager';
import { processCauldron } from '../elvenar/processCauldron';
import { processCityData } from '../elvenar/processCityData';
import { processCityResourcesUpdate } from '../elvenar/processCityResourcesUpdate';
import { processInventory } from '../elvenar/processInventory';
import { processNotifications } from '../elvenar/processNotifications';
import { processOtherPlayerData } from '../elvenar/processOtherPlayerData';
import { processTradeData } from '../elvenar/processTradeData';
import { PlayerSpecificMessage } from '../inject/playerSpecificMessages';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { tradeOpenedCallback } from '../trade/tradeOpenedCallback';

type Processors = Record<
  PlayerSpecificMessage['type'],
  (untypedJson: unknown, sharedInfo: ExtensionSharedInfo) => Promise<unknown>
>;

export const playerSpecificRequestHandler = async (
  msg: InterceptedPlayerSpecificRequest,
  sender: chrome.runtime.MessageSender,
): Promise<void> => {
  switch (msg.payload.type) {
    case 'CITY_DATA_PROCESSED':
    case 'INVENTORY_DATA_PROCESSED':
    case 'TRADE_DATA_PROCESSED':
    case 'CAULDRON_DATA_PROCESSED':
    case 'OTHER_PLAYER_DATA_PROCESSED':
    case 'NOTIFICATIONS':
    case 'CITY_RESOURCES_UPDATE':
    case 'INVENTORY_UPDATED':
      break;
    default:
      msg.payload satisfies never;
      return;
  }

  const sharedInfo = msg.payload.payload.sharedInfo;
  sharedInfo.tabId = sender.tab?.id || -1;
  const untypedJson = JSON.parse(msg.payload.payload.decodedResponse);

  await loadAccountManagerFromStorage();

  const processors: Processors = {
    CITY_DATA_PROCESSED: processCityData,
    INVENTORY_DATA_PROCESSED: processInventory,
    TRADE_DATA_PROCESSED: processTradeData,
    CAULDRON_DATA_PROCESSED: processCauldron,
    OTHER_PLAYER_DATA_PROCESSED: processOtherPlayerData,
    NOTIFICATIONS: processNotifications,
    CITY_RESOURCES_UPDATE: processCityResourcesUpdate,
    INVENTORY_UPDATED: processInventory,
  };

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  const result = await processors[msg.payload.type](untypedJson, sharedInfo);

  await saveAllAccounts();

  switch (msg.payload.type) {
    case 'CITY_DATA_PROCESSED':
      sendCityDataUpdatedMessage(sharedInfo.tabId);
      break;
    case 'TRADE_DATA_PROCESSED':
      {
        if (accountData) {
          await tradeOpenedCallback(accountData);
        }
      }
      break;
    case 'OTHER_PLAYER_DATA_PROCESSED':
      await sendOtherPlayerCityDataUpdatedMessage();
      break;
      break;
    case 'INVENTORY_DATA_PROCESSED':
    case 'CAULDRON_DATA_PROCESSED':
    case 'NOTIFICATIONS':
    case 'CITY_RESOURCES_UPDATE':
    case 'INVENTORY_UPDATED':
      break;
    default:
      msg.payload satisfies never;
  }
};
