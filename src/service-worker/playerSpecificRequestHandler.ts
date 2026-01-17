import {
  InterceptedPlayerSpecificRequest,
  sendCityDataUpdatedMessage,
  sendOtherPlayerCityDataUpdatedMessage,
} from '../chrome/messages';
import { loadAccountManagerFromStorage, getAccountBySessionId, saveAllAccounts } from '../elvenar/AccountManager';
import { processCauldron } from '../elvenar/processCauldron';
import { processCityData } from '../elvenar/processCityData';
import { processInventory } from '../elvenar/processInventory';
import { processOtherPlayerData } from '../elvenar/processOtherPlayerData';
import { processTradeData } from '../elvenar/processTradeData';
import { tradeOpenedCallback } from '../trade/tradeOpenedCallback';

export const playerSpecificRequestHandler = async (
  msg: InterceptedPlayerSpecificRequest,
  sender: chrome.runtime.MessageSender,
): Promise<void> => {
  const sharedInfo = msg.payload.payload.sharedInfo;
  sharedInfo.tabId = sender.tab?.id || -1;
  const untypedJson = JSON.parse(msg.payload.payload.decodedResponse);
  switch (msg.payload.type) {
    case 'CITY_DATA_PROCESSED':
    case 'INVENTORY_DATA_PROCESSED':
    case 'TRADE_DATA_PROCESSED':
    case 'CAULDRON_DATA_PROCESSED':
    case 'OTHER_PLAYER_DATA_PROCESSED':
      break;
    default:
      msg.payload satisfies never;
      return;
  }

  await loadAccountManagerFromStorage();

  switch (msg.payload.type) {
    case 'CITY_DATA_PROCESSED':
      await processCityData(untypedJson, sharedInfo);
      sendCityDataUpdatedMessage(sharedInfo.tabId);
      break;
    case 'INVENTORY_DATA_PROCESSED':
      await processInventory(untypedJson, sharedInfo);
      break;
    case 'TRADE_DATA_PROCESSED':
      await processTradeData(untypedJson, sharedInfo);
      {
        const accountData = getAccountBySessionId(sharedInfo.sessionId);
        if (accountData) {
          await tradeOpenedCallback(accountData);
        }
      }
      break;
    case 'CAULDRON_DATA_PROCESSED':
      await processCauldron(untypedJson, sharedInfo);
      break;
    case 'OTHER_PLAYER_DATA_PROCESSED':
      await processOtherPlayerData(untypedJson, sharedInfo);
      await sendOtherPlayerCityDataUpdatedMessage();
      break;
    default:
      msg.payload satisfies never;
  }

  await saveAllAccounts();
};
