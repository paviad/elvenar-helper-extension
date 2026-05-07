import {
  InterceptedPlayerSpecificRequest,
  sendCityDataUpdatedMessage,
  sendCityEntitiesUpdatedMessage,
  sendOtherPlayerCityDataUpdatedMessage,
} from '../chrome/messages';
import { getAccountBySessionId, loadAccountManagerFromStorage, saveAllAccounts } from '../elvenar/AccountManager';
import { processCauldron } from '../elvenar/processCauldron';
import { processCityData } from '../elvenar/processCityData';
import { processCityResourcesUpdate } from '../elvenar/processCityResourcesUpdate';
import { processInventory } from '../elvenar/processInventory';
import { processNotifications } from '../elvenar/processNotifications';
import { processOtherPlayerData } from '../elvenar/processOtherPlayerData';
import { processSpireDiplomacySubmit } from '../elvenar/processSpireDiplomacySubmit';
import { processSpireEncounterStart } from '../elvenar/processSpireEncounterStart';
import { processTradeData } from '../elvenar/processTradeData';
import { processQuest } from '../elvenar/processQuest';
import { PlayerSpecificMessage } from '../inject/playerSpecificMessages';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { tradeOpenedCallback } from '../trade/tradeOpenedCallback';
import { processCityMapServiceUpdate } from '../elvenar/processCityMapServiceUpdate';
import { processTranscendenceService } from '../elvenar/processTranscendenceService';

type Processors = Record<
  PlayerSpecificMessage['type'],
  (untypedResponseArray: ElvenarRequestResponseEntry[], sharedInfo: ExtensionSharedInfo) => Promise<unknown>
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
    case 'SPIRE_ENCOUNTER_START':
    case 'SPIRE_DIPLOMACY_SUBMIT':
    case 'QUEST':
    case 'CITY_MAP_SERVICE_UPDATE':
    case 'TRANSCENDENCE_SERVICE':
      break;
    default:
      msg.payload satisfies never;
      return;
  }

  const sharedInfo = msg.payload.payload.sharedInfo;
  sharedInfo.tabId = sender.tab?.id || -1;
  const untypedJson = JSON.parse(msg.payload.payload.decodedResponse) as ElvenarRequestResponseEntry[];

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
    SPIRE_ENCOUNTER_START: processSpireEncounterStart,
    SPIRE_DIPLOMACY_SUBMIT: processSpireDiplomacySubmit,
    QUEST: processQuest,
    CITY_MAP_SERVICE_UPDATE: processCityMapServiceUpdate,
    TRANSCENDENCE_SERVICE: processTranscendenceService,
  };

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  const result = await processors[msg.payload.type](untypedJson, sharedInfo);

  await saveAllAccounts();

  switch (msg.payload.type) {
    case 'CITY_DATA_PROCESSED':
      await sendCityDataUpdatedMessage(sharedInfo.tabId);
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
    case 'SPIRE_ENCOUNTER_START':
      // await sendSpireEncounterStartedMessage();
      break;
    case 'TRANSCENDENCE_SERVICE':
    case 'CITY_MAP_SERVICE_UPDATE':
      await sendCityEntitiesUpdatedMessage(sharedInfo.tabId);
      break;
    case 'SPIRE_DIPLOMACY_SUBMIT':
    case 'INVENTORY_DATA_PROCESSED':
    case 'CAULDRON_DATA_PROCESSED':
    case 'NOTIFICATIONS':
    case 'CITY_RESOURCES_UPDATE':
    case 'INVENTORY_UPDATED':
    case 'QUEST':
      break;
    default:
      msg.payload satisfies never;
  }
};
