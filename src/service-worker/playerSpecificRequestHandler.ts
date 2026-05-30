import { concatMap, from, Subject } from 'rxjs';
import {
  InterceptedPlayerSpecificRequest,
  sendActiveEffectsUpdatedMessage,
  sendCityDataUpdatedMessage,
  sendCityEntitiesUpdatedMessage,
  sendGenericResponse,
  sendOtherPlayerCityDataUpdatedMessage,
} from '../chrome/messages';
import { getAccountBySessionId, loadAccountManagerFromStorage, saveAllAccounts } from '../elvenar/AccountManager';
import { processActiveEffectsUpdate } from '../elvenar/processActiveEffectsUpdate';
import { processCauldron } from '../elvenar/processCauldron';
import { processCityData } from '../elvenar/processCityData';
import { processCityMapServiceUpdate } from '../elvenar/processCityMapServiceUpdate';
import { processCityResourcesUpdate } from '../elvenar/processCityResourcesUpdate';
import { processInventory } from '../elvenar/processInventory';
import { processNotifications } from '../elvenar/processNotifications';
import { processOtherPlayerData } from '../elvenar/processOtherPlayerData';
import { processQuestMilestoneUpdate } from '../elvenar/processQuestMilestoneUpdate';
import { processQuestUpdates } from '../elvenar/processQuestUpdates';
import { processSeasonalEvents } from '../elvenar/processSeasonalEvents';
import { processSpireDiplomacySubmit } from '../elvenar/processSpireDiplomacySubmit';
import { processSpireEncounterStart } from '../elvenar/processSpireEncounterStart';
import { processTradeData } from '../elvenar/processTradeData';
import { processTranscendenceService } from '../elvenar/processTranscendenceService';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { tradeOpenedCallback } from '../trade/tradeOpenedCallback';

type Processors = Record<
  string,
  (
    untypedResponseArray: ElvenarRequestResponseEntry[],
    sharedInfo: ExtensionSharedInfo,
    request: ElvenarRequestResponseEntry,
  ) => Promise<unknown>
>;

const handlerSubject = new Subject<{
  msg: InterceptedPlayerSpecificRequest;
  sender: chrome.runtime.MessageSender;
}>();

const subscription = handlerSubject
  .pipe(
    concatMap(({ msg, sender }) => {
      return from(playerSpecificRequestHandlerInternal(msg, sender));
    }),
  )
  .subscribe({
    error: (err) => {
      console.error('Error processing player specific request:', err);
    },
  });

export const playerSpecificRequestHandler = async (
  msg: InterceptedPlayerSpecificRequest,
  sender: chrome.runtime.MessageSender,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<void> => {
  handlerSubject.next({ msg, sender });
};

export const playerSpecificRequestHandlerInternal = async (
  msg: InterceptedPlayerSpecificRequest,
  sender: chrome.runtime.MessageSender,
): Promise<void> => {
  if (!/^(Q:|R:)/.test(msg.payload.type)) {
    return;
  }

  const sharedInfo = msg.payload.payload.sharedInfo;
  sharedInfo.tabId = sender.tab?.id || -1;
  const request = msg.payload.payload.request;
  const response = msg.payload.payload.response;

  await loadAccountManagerFromStorage();

  const processors: Processors = {
    'Q:NotificationService/getAllNotifications': processNotifications,
    'Q:NotificationService/getPreviewNotifications': processNotifications,
    'Q:StartupService/getData': processCityData,
    'Q:InventoryService/getItems': processInventory,
    'Q:TradeService/getOtherPlayersTrades': processTradeData,
    // 'Q:CauldronService/getIngredients': processCauldron,
    // 'Q:CauldronService/getPotionEffects': processCauldron,
    'Q:OtherPlayerService/visitPlayer': processOtherPlayerData,
    'Q:SpireService/getEncounter': processSpireEncounterStart,
    'Q:SpireDiplomacyService/submit': processSpireDiplomacySubmit,
    'R:SeasonalEventsService/getEvents': processSeasonalEvents,

    'R:CityResourcesService/getResources': processCityResourcesUpdate,
    'R:InventoryService/updateItems': processInventory,
    'R:CityMapService/reset': processCityMapServiceUpdate,
    'R:TranscendenceService/allBuildingsStates': processTranscendenceService,
    'R:EffectsService/update': processActiveEffectsUpdate,

    'R:QuestMilestoneService/updateQuestMilestone': processQuestMilestoneUpdate,

    'R:QuestService/getUpdates': processQuestUpdates,
  };

  const processorFunction = processors[msg.payload.type];
  if (!processorFunction) {
    console.warn(`ElvenAssist: No processor function found for message type: ${msg.payload.type}`);
    return;
  }

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  const result = await processorFunction(response, sharedInfo, request);

  await saveAllAccounts();

  await sendGenericResponse(msg.payload.type, result, sharedInfo.tabId);

  switch (msg.payload.type) {
    case 'Q:StartupService/getData':
      await sendCityDataUpdatedMessage(sharedInfo.tabId);
      break;
    case 'Q:TradeService/getOtherPlayersTrades':
      {
        if (accountData) {
          await tradeOpenedCallback(accountData);
        }
      }
      break;
    case 'Q:OtherPlayerService/visitPlayer':
      await sendOtherPlayerCityDataUpdatedMessage();
      break;
    case 'Q:SpireService/getEncounter':
      // await sendSpireEncounterStartedMessage();
      break;
    case 'R:TranscendenceService/allBuildingsStates':
    case 'R:CityMapService/reset':
      await sendCityEntitiesUpdatedMessage(sharedInfo.tabId);
      break;
    case 'R:EffectsService/update':
      await sendActiveEffectsUpdatedMessage(sharedInfo.tabId);
      break;
  }
};
