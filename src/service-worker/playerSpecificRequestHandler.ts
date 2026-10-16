import { catchError, concatMap, EMPTY, from, Subject } from 'rxjs';
import { InterceptedPlayerSpecificRequest, sendGenericResponse, sendRuntime, sendToTab } from '../chrome/messages';
import { getAccountBySessionId, loadAccount, saveAccount } from '../elvenar/accountStore';
import { processActiveEffectsUpdate } from '../elvenar/processActiveEffectsUpdate';
import { processAncientWonderPhaseUpdate } from '../elvenar/processAncientWonderPhaseUpdate';
import { processCauldron } from '../elvenar/processCauldron';
import { processCauldronOpened } from '../elvenar/processCauldronOpened';
import { processCauldronWonder } from '../elvenar/processCauldronWonder';
import { processCityData } from '../elvenar/processCityData';
import { processCityMapServiceUpdate } from '../elvenar/processCityMapServiceUpdate';
import { processCityResourcesUpdate } from '../elvenar/processCityResourcesUpdate';
import { processInventory } from '../elvenar/processInventory';
import { processMessageMarkedAsRead } from '../elvenar/processMessageMarkedAsRead';
import { processMessageOverview } from '../elvenar/processMessageOverview';
import { processMessages } from '../elvenar/processMessages';
import { processNewMessage } from '../elvenar/processNewMessage';
import { processNotifications } from '../elvenar/processNotifications';
import { processOtherPlayerData } from '../elvenar/processOtherPlayerData';
import { processPotionEffects, processPotionEffectToggled } from '../elvenar/processPotionEffects';
import { processQuestMilestoneUpdate } from '../elvenar/processQuestMilestoneUpdate';
import { processQuestUpdates } from '../elvenar/processQuestUpdates';
import { processReplyMessage } from '../elvenar/processReplyMessage';
import { processResearchStatus } from '../elvenar/processResearchStatus';
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
import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { tradeOpenedCallback } from '../trade/tradeOpenedCallback';
import { accountManagerReady } from './accountManagerReady';

type Processor = (
  untypedResponseArray: ElvenarRequestResponseEntry[],
  sharedInfo: ExtensionSharedInfo,
  request: ElvenarRequestResponseEntry,
) => Promise<unknown>;

/**
 * A type holds either a processor or a list of them, run in the order given. One response can
 * be of interest to more than one part of the extension, and a list says so plainly rather than
 * having one processor call another for reasons unrelated to it. What is passed on afterwards is
 * the last result that was not `undefined`, since a processor that only writes to the stored
 * account has nothing to say.
 */
type Processors = Record<string, Processor | Processor[]>;

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

  // A message is often what woke the worker, so the accounts may still be on their way in from
  // storage. Waited for here, inside the concatMap, so the messages keep the order they arrived in.
  await accountManagerReady;

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

    await loadAccount(accountId);
  }

  const processors: Processors = {
    'Q:NotificationService/getAllNotifications': processNotifications,
    'Q:NotificationService/getPreviewNotifications': processNotifications,
    'Q:StartupService/getData': processCityData,
    'Q:InventoryService/getItems': processInventory,
    'Q:TradeService/getOtherPlayersTrades': processTradeData,
    'Q:CauldronService/getIngredients': processCauldron,
    'Q:CauldronService/getPotionEffects': processPotionEffects,
    'Q:CauldronService/setPotionEffectEnabled': processPotionEffectToggled,
    'Q:IndicatorsService/clearIndicator': processCauldronOpened,
    'Q:OtherPlayerService/visitPlayer': processOtherPlayerData,
    'Q:SpireService/getEncounter': processSpireEncounterStart,
    'Q:SpireDiplomacyService/submit': processSpireDiplomacySubmit,
    'R:SeasonalEventsService/getEvents': processSeasonalEvents,

    'R:CityResourcesService/getResources': processCityResourcesUpdate,
    'R:InventoryService/updateItems': processInventory,
    'R:CityMapService/reset': processCityMapServiceUpdate,
    'R:TranscendenceService/allBuildingsStates': processTranscendenceService,
    'R:EffectsService/update': [processActiveEffectsUpdate, processCauldronWonder],
    'R:AncientWonderService/phaseUpdated': processAncientWonderPhaseUpdate,
    'R:AncientWonderService/getOtherPlayerAncientWonders': processAncientWonderPhaseUpdate,
    'R:ResearchService/startup': processResearchStatus,

    'R:QuestMilestoneService/updateQuestMilestone': processQuestMilestoneUpdate,

    'R:QuestService/getUpdates': processQuestUpdates,

    'R:MultiplayerEventService/updateWaypoints': processUpdateWaypoints,
    'R:ChestsService/updateChestPayInProgress': processUpdateChestPayInProgress,
    'R:MultiplayerEventService/updateOverview': processUpdateWaypointsOverview,

    'R:MessageService/getMessageOverview': processMessageOverview,
    'R:MessageService/fetchMessages': processMessages,
    'R:MessageService/markMessageAsRead': processMessageMarkedAsRead,
    'R:MessageService/replyMessage': processReplyMessage,
    'R:MessageService/sendGuildMessage': processNewMessage,
    'R:MessageService/sendMessage': processNewMessage,

    'R:TournamentService/getProvincesOverview': processTournyProvincesOverview,
    'R:WorldMapService/getProvinceInformation': processTournyProvinceInformation,
    'R:WorldMapService/updateTournamentTime': processTournyUpdateTime,
    'R:ArmyService/addUnit': processTournyAddUnits,
  };

  const processorsForType = processors[msg.payload.type];
  if (!processorsForType) {
    console.warn(`ElvenAssist: No processor function found for message type: ${msg.payload.type}`);
    return;
  }

  let result: unknown;
  for (const processor of [processorsForType].flat()) {
    const answer = await processor(response, sharedInfo, request);
    if (answer !== undefined) {
      result = answer;
    }
  }

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

  await saveAccount(accountId);

  await sendGenericResponse(msg.payload.type, result, sharedInfo.tabId);

  switch (msg.payload.type) {
    case 'Q:StartupService/getData':
      await sendToTab(sharedInfo.tabId, 'cityDataUpdated', { tabId: sharedInfo.tabId });
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
      await saveAccount(result as string);
      await sendRuntime('otherPlayerCityUpdated');
      break;
    case 'Q:SpireService/getEncounter':
      // await sendSpireEncounterStartedMessage();
      break;
    case 'R:TranscendenceService/allBuildingsStates':
    case 'R:CityMapService/reset':
      await sendRuntime('cityEntitiesUpdated', { tabId: sharedInfo.tabId });
      break;
    case 'R:EffectsService/update':
      await sendToTab(sharedInfo.tabId, 'activeEffectsUpdated', { tabId: sharedInfo.tabId });
      break;
    case 'R:MessageService/getMessageOverview':
    case 'R:MessageService/fetchMessages':
    case 'R:MessageService/markMessageAsRead':
    case 'R:MessageService/replyMessage':
    case 'R:MessageService/sendGuildMessage':
    case 'R:MessageService/sendMessage':
      await sendToTab(sharedInfo.tabId, 'messagesUpdated', { tabId: sharedInfo.tabId, reqRespType: msg.payload.type });
      break;
  }
};
