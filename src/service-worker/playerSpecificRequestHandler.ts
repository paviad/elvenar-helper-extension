import { catchError, concatMap, EMPTY, from, Subject } from 'rxjs';
import {
  InterceptedPlayerSpecificRequest,
  sendActiveEffectsUpdatedMessage,
  sendCityDataUpdatedMessage,
  sendCityEntitiesUpdatedMessage,
  sendGenericResponse,
  sendHelpPerformedUpdateProvinceMessage,
  sendInitialWorldMapDataMessage,
  sendKpHuntOpportunity,
  sendMessagesUpdatedMessage,
  sendNeighbourHelpDataMessage,
  sendOtherPlayerCityDataUpdatedMessage,
  sendWorldNeighborsUpdatedMessage,
} from '../chrome/messages';
import { getAccountBySessionId, loadSingleAccountFromStorage } from '../elvenar/AccountManager';
import { saveSingleAccount } from '../elvenar/Accounts';
import { processActiveEffectsUpdate } from '../elvenar/processActiveEffectsUpdate';
import { processAncientWonderPhaseUpdate } from '../elvenar/processAncientWonderPhaseUpdate';
import { processCityData } from '../elvenar/processCityData';
import { processCityMapServiceUpdate } from '../elvenar/processCityMapServiceUpdate';
import { processCityResourcesUpdate } from '../elvenar/processCityResourcesUpdate';
import { processGuildData } from '../elvenar/processGuildData';
import { processHelpPerformedUpdateProvince } from '../elvenar/processHelpPerformedUpdateProvince';
import { processInitialWorldMapData } from '../elvenar/processInitialWorldMapData';
import { processInventory } from '../elvenar/processInventory';
import { processMessageMarkedAsRead } from '../elvenar/processMessageMarkedAsRead';
import { processMessageOverview } from '../elvenar/processMessageOverview';
import { processMessages } from '../elvenar/processMessages';
import { processNeighborAncientWondersData } from '../elvenar/processNeighborAncientWondersData';
import { processNeighbourHelpBuildings } from '../elvenar/processNeighbourHelpBuildings';
import { processNotifications } from '../elvenar/processNotifications';
import { processOtherPlayerData } from '../elvenar/processOtherPlayerData';
import { processQuestMilestoneUpdate } from '../elvenar/processQuestMilestoneUpdate';
import { processQuestUpdates } from '../elvenar/processQuestUpdates';
import { processReplyMessage } from '../elvenar/processReplyMessage';
import { processRankingData } from '../elvenar/processRankingData';
import { processSeasonalEvents } from '../elvenar/processSeasonalEvents';
import { processSpireDiplomacySubmit } from '../elvenar/processSpireDiplomacySubmit';
import { processSpireEncounterStart } from '../elvenar/processSpireEncounterStart';
import { processTournyAddUnits } from '../elvenar/processTournyAddUnits';
import { processTournyProvinceInformation } from '../elvenar/processTournyProvinceInformation';
import { processTournyProvincesOverview } from '../elvenar/processTournyProvincesOverview';
import { processTournyUpdateTime } from '../elvenar/processTournyUpdateTime';
import { processTradeData } from '../elvenar/processTradeData';
import { processTranscendenceService } from '../elvenar/processTranscendenceService';
import { processUpdateChestPayInProgress } from '../elvenar/processUpdateChestPayInProgress';
import { processUpdateWaypoints } from '../elvenar/processUpdateWaypoints';
import { processUpdateWaypointsOverview } from '../elvenar/processUpdateWaypointsOverview';
import { processWorldNeighbors } from '../elvenar/processWorldNeighbors';
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { InitialWorldMapData } from '../model/initialWorldMapData';
import { NeighbourHelpData } from '../model/neighbourHelpBuildings';
import { WorldNeighbor } from '../model/worldNeighbors';
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

handlerSubject
  .pipe(
    concatMap(({ msg, sender }) => {
      // The processors read game JSON that Inno can reshape without warning, so a throw here is
      // expected eventually. It has to be caught inside the concatMap: an error reaching the
      // subscriber unsubscribes it, and from then on every response is silently dropped until the
      // service worker restarts. Catching per message costs us that one message instead.
      return from(playerSpecificRequestHandlerInternal(msg, sender)).pipe(
        catchError((err: unknown) => {
          console.error('Error processing player specific request:', msg.payload.type, err);
          return EMPTY;
        }),
      );
    }),
  )
  .subscribe();

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

  let accountData = getAccountBySessionId(sharedInfo.sessionId);
  let accountId = accountData?.cityQuery?.accountId;

  if (msg.payload.type !== 'Q:StartupService/getData') {
    if (!accountId) {
      console.warn(
        'ElvenAssist: Account ID not found for sessionId:',
        sharedInfo.sessionId,
        msg.payload.type,
        sharedInfo,
      );
      return;
    }

    await loadSingleAccountFromStorage(accountId);
  }

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
    'R:AncientWonderService/phaseUpdated': processAncientWonderPhaseUpdate,

    'R:QuestMilestoneService/updateQuestMilestone': processQuestMilestoneUpdate,

    'R:QuestService/getUpdates': processQuestUpdates,

    'R:MultiplayerEventService/updateWaypoints': processUpdateWaypoints,
    'R:ChestsService/updateChestPayInProgress': processUpdateChestPayInProgress,
    'R:MultiplayerEventService/updateOverview': processUpdateWaypointsOverview,

    'R:MessageService/getMessageOverview': processMessageOverview,
    'R:MessageService/fetchMessages': processMessages,
    'R:MessageService/markMessageAsRead': processMessageMarkedAsRead,
    'R:MessageService/replyMessage': processReplyMessage,

    'R:AncientWonderService/getOtherPlayerAncientWonders': processNeighborAncientWondersData,
    'R:RankingService/getRankingList': processRankingData,
    'R:GuildService/getGuild': processGuildData,

    'R:WorldMapService/fetchInitialWorldMapData': processInitialWorldMapData,
    'R:WorldMapService/getDiscoveredPlayerProvinces': processWorldNeighbors,
    'R:OtherPlayerService/getNeighbourlyHelpBuildings': processNeighbourHelpBuildings,
    'R:WorldMapService/updateProvince': processHelpPerformedUpdateProvince,

    'R:TournamentService/getProvincesOverview': processTournyProvincesOverview,
    'R:WorldMapService/getProvinceInformation': processTournyProvinceInformation,
    'R:WorldMapService/updateTournamentTime': processTournyUpdateTime,
    'R:ArmyService/addUnit': processTournyAddUnits,
  };

  const processorFunction = processors[msg.payload.type];
  if (!processorFunction) {
    console.warn(`ElvenAssist: No processor function found for message type: ${msg.payload.type}`);
    return;
  }

  const result = await processorFunction(response, sharedInfo, request);

  if (msg.payload.type === 'Q:StartupService/getData') {
    accountData = getAccountBySessionId(sharedInfo.sessionId);
    accountId = accountData?.cityQuery?.accountId;
  }

  if (!accountId) {
    console.warn(
      'ElvenAssist: Account ID not found after processing StartupService/getData for sessionId:',
      sharedInfo.sessionId,
      msg.payload.type,
      sharedInfo,
    );
    return;
  }

  await saveSingleAccount(accountId);

  await sendGenericResponse(msg.payload.type, result, sharedInfo.tabId);

  switch (msg.payload.type) {
    case 'Q:StartupService/getData':
      await sendCityDataUpdatedMessage(sharedInfo.tabId);
      break;
    case 'Q:TradeService/getOtherPlayersTrades':
      {
        // Read again rather than reusing the reference taken at the top: the load above replaces
        // the stored account object when another context saved it more recently, and the trades
        // the processor just wrote went to the replacement. The old one still carries the
        // previous fetch's trades and whatever tab id it was saved with.
        const current = getAccountBySessionId(sharedInfo.sessionId);
        if (current) {
          await tradeOpenedCallback(current, sharedInfo.tabId);
        }
      }
      break;
    case 'Q:OtherPlayerService/visitPlayer':
      await saveSingleAccount(result as string);
      await sendOtherPlayerCityDataUpdatedMessage();
      break;
    case 'Q:SpireService/getEncounter':
      // await sendSpireEncounterStartedMessage();
      break;
    case 'R:AncientWonderService/getOtherPlayerAncientWonders':
      if (result as boolean) {
        await sendKpHuntOpportunity(sharedInfo.tabId);
      }
      break;
    case 'R:TranscendenceService/allBuildingsStates':
    case 'R:CityMapService/reset':
      await sendCityEntitiesUpdatedMessage(sharedInfo.tabId);
      break;
    case 'R:EffectsService/update':
      await sendActiveEffectsUpdatedMessage(sharedInfo.tabId);
      break;
    case 'R:MessageService/getMessageOverview':
    case 'R:MessageService/fetchMessages':
    case 'R:MessageService/markMessageAsRead':
    case 'R:MessageService/replyMessage':
      await sendMessagesUpdatedMessage(sharedInfo.tabId, msg.payload.type);
      break;
    case 'R:WorldMapService/fetchInitialWorldMapData':
      await sendInitialWorldMapDataMessage(sharedInfo.tabId, result as InitialWorldMapData);
      break;
    case 'R:WorldMapService/getDiscoveredPlayerProvinces':
      await sendWorldNeighborsUpdatedMessage(sharedInfo.tabId, result as WorldNeighbor[]);
      break;
    case 'R:OtherPlayerService/getNeighbourlyHelpBuildings':
      await sendNeighbourHelpDataMessage(sharedInfo.tabId, result as NeighbourHelpData);
      break;
    case 'R:WorldMapService/updateProvince':
      await sendHelpPerformedUpdateProvinceMessage(sharedInfo.tabId, result as WorldNeighbor);
      break;
  }
};
