import { NonSpecificMessage } from '../inject/nonSpecificMessages';
import { PlayerSpecificMessage } from '../inject/playerSpecificMessages';
import { InitialWorldMapData } from '../model/initialWorldMapData';
import { NeighbourHelpData } from '../model/neighbourHelpBuildings';
import { TradeSummary } from '../model/tradeSummary';
import { WorldNeighbor } from '../model/worldNeighbors';

// ============================================================================
// 1. RUNTIME MESSAGES (Global / Background Bound) - TYPES
// ============================================================================
// Sent via chrome.runtime.sendMessage

export interface InterceptedPlayerSpecificRequest {
  type: 'interceptedPlayerSpecificRequest';
  payload: PlayerSpecificMessage;
}

export interface InterceptedNonSpecificRequest {
  type: 'interceptedNonSpecificRequest';
  payload: NonSpecificMessage;
}

export interface GenericResponseMessage<T> {
  type: `genericResponse:${string}`;
  reqRespType: string;
  payload: T;
}

export interface AccountsSavedRuntimeMessage {
  type: `accountsSavedRuntime`;
  tabId: number;
}

export interface RefreshCityMessage {
  type: 'refreshCity';
  accountId: string;
}

export interface CityEntitiesUpdatedMessage {
  type: 'cityEntitiesUpdated';
  tabId: number;
}

export interface OtherPlayerCityUpdatedMessage {
  type: 'otherPlayerCityUpdated';
}

export interface CitySavedMessage {
  type: 'citySaved';
  accountId: string;
}

export interface TradeOpenedMessage {
  type: 'tradeOpened';
}

export interface OpenExtensionTabMessage {
  type: 'openExtensionTab';
}

export interface SpirePicksMessage {
  type: 'spirePicks';
  picks: string[];
  /** Latest win probability from the Spire Wizard; absent on a fresh encounter. */
  prob?: string;
  /** 1-based ghost to spend a joker on; absent when a joker is not an option. */
  jokerGhost?: number;
  /** Round these values apply to. Optional: a wizard tab running a pre-update inject omits it. */
  turn?: number;
  /** Badge-only progress signal. When set there are no picks and nothing is relayed to the page. */
  status?: 'waiting' | 'timeout';
}

// ============================================================================
// 2. TAB MESSAGES (Content Script / UI Bound) - TYPES
// ============================================================================
// Sent via chrome.tabs.sendMessage (requires tabId)

export interface CityDataUpdatedMessage {
  type: 'cityDataUpdated';
  tabId: number;
}

export interface TradeParsedMessage {
  type: 'tradeParsed';
  trades: {
    offer: string;
    need: string;
    player: string;
  }[];
}

export interface ActiveEffectsUpdatedMessage {
  type: 'activeEffectsUpdated';
  tabId: number;
}

export interface MissingEeMessage {
  type: 'missingEe';
  tabId: number;
  entityIds: number[];
}

export interface MessagesUpdatedMessage {
  type: 'messagesUpdated';
  tabId: number;
  // Which player-specific response triggered this (e.g. 'R:MessageService/fetchMessages').
  reqRespType: string;
}

export interface RetrievingCounterUpdateMessage {
  type: 'retrievingCounterUpdate';
  retrievingCounter: number;
}

export interface KpHuntOpportunityMessage {
  type: 'kpHuntOpportunity';
  tabId: number;
}

export interface InitialWorldMapDataMessage {
  type: 'initialWorldMapData';
  initialWorldMapData: InitialWorldMapData;
}

export interface WorldNeighborsUpdatedMessage {
  type: 'worldNeighborsUpdated';
  worldNeighbors: WorldNeighbor[];
}

export interface NeighbourHelpDataMessage {
  type: 'neighbourHelpData';
  neighbourHelpData: NeighbourHelpData;
}

export interface HelpPerformedUpdateProvinceMessage {
  type: 'helpPerformedUpdateProvince';
  updatedProvince: WorldNeighbor;
}

// ============================================================================
// UNION TYPES & UTILITIES
// ============================================================================

export type AllMessages =
  | InterceptedPlayerSpecificRequest
  | InterceptedNonSpecificRequest
  | RefreshCityMessage
  | CityEntitiesUpdatedMessage
  | OtherPlayerCityUpdatedMessage
  | CitySavedMessage
  | TradeOpenedMessage
  | OpenExtensionTabMessage
  | CityDataUpdatedMessage
  | TradeParsedMessage
  | ActiveEffectsUpdatedMessage
  | MissingEeMessage
  | MessagesUpdatedMessage
  | RetrievingCounterUpdateMessage
  | KpHuntOpportunityMessage
  | InitialWorldMapDataMessage
  | WorldNeighborsUpdatedMessage
  | NeighbourHelpDataMessage
  | HelpPerformedUpdateProvinceMessage
  | SpirePicksMessage;

export interface MessageResponse {
  success: boolean;
  message?: string;
}

// ============================================================================
// SENDER FUNCTIONS
// ============================================================================

/** --- 1. Runtime Senders (chrome.runtime) --- **/

export const sendInterceptedPlayerSpecificRequest = async (payload: PlayerSpecificMessage) => {
  try {
    await chrome.runtime.sendMessage({
      type: 'interceptedPlayerSpecificRequest',
      payload,
    } satisfies InterceptedPlayerSpecificRequest);
  } catch (e) {
    console.log('ElvenAssist: Error sending interceptedPlayerSpecificRequest:', e, payload);
  }
};

export const sendInterceptedNonSpecificRequest = async (payload: NonSpecificMessage) => {
  try {
    await chrome.runtime.sendMessage({
      type: 'interceptedNonSpecificRequest',
      payload,
    } satisfies InterceptedNonSpecificRequest);
  } catch (e) {
    console.log('ElvenAssist: Error sending interceptedNonSpecificRequest:', e);
  }
};

export const sendRefreshCityMessage = async (accountId: string): Promise<MessageResponse> => {
  let resolveFn: (response: MessageResponse) => void = () => {};
  const responsePromise = new Promise<MessageResponse>((resolve) => (resolveFn = resolve));
  chrome.runtime.sendMessage(
    {
      type: 'refreshCity',
      accountId,
    } satisfies RefreshCityMessage,
    undefined,
    resolveFn,
  );
  return await responsePromise;
};

export const sendCityEntitiesUpdatedMessage = async (tabId: number) => {
  try {
    await chrome.runtime.sendMessage({
      type: 'cityEntitiesUpdated',
      tabId,
    } satisfies CityEntitiesUpdatedMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending cityEntitiesUpdated message:', e);
  }
};

export const sendOtherPlayerCityDataUpdatedMessage = async () => {
  try {
    await chrome.runtime.sendMessage({ type: 'otherPlayerCityUpdated' } satisfies OtherPlayerCityUpdatedMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending otherPlayerCityUpdated message:', e);
  }
};

export const sendCitySavedMessage = async (accountId: string) => {
  try {
    await chrome.runtime.sendMessage({
      type: 'citySaved',
      accountId,
    } satisfies CitySavedMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending citySaved message:', e);
  }
};

export const sendTradeOpenedMessage = async () => {
  try {
    await chrome.runtime.sendMessage({
      type: 'tradeOpened',
    } satisfies TradeOpenedMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending tradeOpened message:', e);
  }
};

/** --- 2. Tab Senders (chrome.tabs) --- **/

export const sendGenericResponse = async <T>(reqRespType: string, payload: T, tabId: number) => {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: `genericResponse:${reqRespType}`,
      reqRespType,
      payload,
    } satisfies GenericResponseMessage<T>);
    await chrome.runtime.sendMessage({ type: 'accountsSavedRuntime', tabId } satisfies AccountsSavedRuntimeMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending genericResponse message:', e);
  }
};

export const sendCityDataUpdatedMessage = async (tabId: number) => {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'cityDataUpdated', tabId } satisfies CityDataUpdatedMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending cityDataUpdated message:', e);
  }
};

export const sendTradeParsedMessage = async (tabId: number, trades: TradeSummary[]) => {
  await chrome.tabs.sendMessage(tabId, {
    type: 'tradeParsed',
    trades,
  } satisfies TradeParsedMessage);
};

export const sendActiveEffectsUpdatedMessage = async (tabId: number) => {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'activeEffectsUpdated',
      tabId,
    } satisfies ActiveEffectsUpdatedMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending activeEffectsUpdated message:', e);
  }
};

export const sendMissingEeMessage = async (tabId: number, entityIds: number[]) => {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'missingEe', tabId, entityIds } satisfies MissingEeMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending missingEe message:', e);
  }
};

export const sendMessagesUpdatedMessage = async (tabId: number, reqRespType: string) => {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'messagesUpdated',
      tabId,
      reqRespType,
    } satisfies MessagesUpdatedMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending messagesUpdated message:', e);
  }
};

export const sendRetrievingCounterUpdateMessage = async (tabId: number, retrievingCounter: number) => {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'retrievingCounterUpdate',
      retrievingCounter,
    } satisfies RetrievingCounterUpdateMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending retrievingCounterUpdate message:', e);
  }
};

export const sendKpHuntOpportunity = async (tabId: number) => {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'kpHuntOpportunity' } satisfies {
      type: 'kpHuntOpportunity';
    });
  } catch (e) {
    console.log('ElvenAssist: Error sending kpHuntOpportunity message:', e);
  }
};

export const sendInitialWorldMapDataMessage = async (tabId: number, initialWorldMapData: InitialWorldMapData) => {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'initialWorldMapData',
      initialWorldMapData,
    } satisfies InitialWorldMapDataMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending initialWorldMapData message:', e);
  }
};

export const sendWorldNeighborsUpdatedMessage = async (tabId: number, worldNeighbors: WorldNeighbor[]) => {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'worldNeighborsUpdated',
      worldNeighbors,
    } satisfies WorldNeighborsUpdatedMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending worldNeighborsUpdated message:', e);
  }
};

export const sendNeighbourHelpDataMessage = async (tabId: number, neighbourHelpData: NeighbourHelpData) => {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'neighbourHelpData',
      neighbourHelpData,
    } satisfies NeighbourHelpDataMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending neighbourHelpData message:', e);
  }
};

export const sendHelpPerformedUpdateProvinceMessage = async (tabId: number, updatedProvince: WorldNeighbor) => {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'helpPerformedUpdateProvince', updatedProvince } satisfies {
      type: 'helpPerformedUpdateProvince';
      updatedProvince: WorldNeighbor;
    });
  } catch (e) {
    console.log('ElvenAssist: Error sending helpPerformedUpdateProvince message:', e);
  }
};

// ============================================================================
// LISTENER SETUP & ROUTING
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const callbackMap: Record<string, (...args: any[]) => any> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const callbackMap2: Record<string, { messageType: string; callback: (...args: any[]) => any }> = {};

const messageReceiver = (
  message: AllMessages,
  sender: chrome.runtime.MessageSender,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendResponse: (response?: any) => void,
): boolean | undefined => {
  const callback1 = callbackMap[message.type];
  const callbacks2 = Object.values(callbackMap2)
    .filter((entry) => entry.messageType === message.type)
    .map((entry) => entry.callback);
  const callbacks = callback1 ? [callback1, ...callbacks2] : callbacks2;

  let rc2: boolean | undefined = undefined;

  for (const callback of callbacks) {
    if (callback) {
      const rc = callback(message, sender);
      if (rc instanceof Promise) {
        rc.then((r) => sendResponse(r)).catch((e) => {
          console.log('ElvenAssist: Error in message handler for message', message, e);
        });
        rc2 = true;
      } else {
        sendResponse(rc);
      }
    } else {
      sendResponse();
    }
  }

  return rc2;
};

export const setupMessageListener = () => chrome.runtime.onMessage.addListener(messageReceiver);

/** --- 1. Runtime Listeners --- **/

export const setupInterceptedPlayerSpecificRequestListener = (
  callback: (message: InterceptedPlayerSpecificRequest, sender: chrome.runtime.MessageSender) => void,
) => (callbackMap['interceptedPlayerSpecificRequest'] = callback);

export const setupInterceptedNonSpecificRequestListener = (
  callback: (message: InterceptedNonSpecificRequest) => void,
) => (callbackMap['interceptedNonSpecificRequest'] = callback);

export const setupGenericResponseListener = <T>(
  reqRespType: string,
  callback: (message: GenericResponseMessage<T>) => void,
) => {
  const id = crypto.randomUUID();
  callbackMap2[id] = { messageType: `genericResponse:${reqRespType}`, callback };
  return id;
};

export const clearGenericResponseListener = (id: string) => {
  if (callbackMap2[id]) {
    delete callbackMap2[id];
  }
};

export const setupAccountsSavedRuntimeListener = (
  callback: (message: AccountsSavedRuntimeMessage) => Promise<void>,
) => {
  const id = crypto.randomUUID();
  callbackMap2[id] = { messageType: `accountsSavedRuntime`, callback };
  return id;
};

export const clearAccountsSavedRuntimeListener = (id: string) => {
  if (callbackMap2[id]) {
    delete callbackMap2[id];
  }
};

export const setupRefreshCityListener = (callback: (message: RefreshCityMessage) => Promise<MessageResponse>) =>
  (callbackMap['refreshCity'] = callback);

export const setupCityEntitiesUpdatedListener = (
  callback: (message: CityEntitiesUpdatedMessage) => void | Promise<void>,
) => (callbackMap['cityEntitiesUpdated'] = callback);

export const clearCityEntitiesUpdatedListener = () => {
  delete callbackMap['cityEntitiesUpdated'];
};

export const setupOtherPlayerCityUpdatedListener = (
  callback: (message: OtherPlayerCityUpdatedMessage) => void | Promise<void>,
) => (callbackMap['otherPlayerCityUpdated'] = callback);

export const setupCitySavedListener = (callback: (message: CitySavedMessage) => void) =>
  (callbackMap['citySaved'] = callback);

export const setupTradeOpenedListener = (callback: () => void) => (callbackMap['tradeOpened'] = callback);

export const setupOpenExtensionTabListener = (
  callback: (message: OpenExtensionTabMessage, sender: chrome.runtime.MessageSender) => void,
) => (callbackMap['openExtensionTab'] = callback);

/** --- 2. Tab Listeners --- **/

export const setupCityDataUpdatedListener = (callback: (tabId: CityDataUpdatedMessage) => void) =>
  (callbackMap['cityDataUpdated'] = callback);

export const setupTradeParsedListener = (callback: (tradesMsg: TradeParsedMessage) => void) =>
  (callbackMap['tradeParsed'] = callback);

export const clearTradeParsedListener = () => {
  delete callbackMap['tradeParsed'];
};

export const setupActiveEffectsUpdatedListener = (
  callback: (message: ActiveEffectsUpdatedMessage) => void | Promise<void>,
) => (callbackMap['activeEffectsUpdated'] = callback);

export const clearActiveEffectsUpdatedListener = () => {
  delete callbackMap['activeEffectsUpdated'];
};

export const setupMissingEeListener = (callback: (message: MissingEeMessage) => void) =>
  (callbackMap['missingEe'] = callback);

export const setupMessagesUpdatedListener = (callback: (message: MessagesUpdatedMessage) => void | Promise<void>) =>
  (callbackMap['messagesUpdated'] = callback);

export const clearMessagesUpdatedListener = () => {
  delete callbackMap['messagesUpdated'];
};

export const setupRetrievingCounterUpdateListener = (
  callback: (message: { tabId: number; retrievingCounter: number }) => void,
) => (callbackMap['retrievingCounterUpdate'] = callback);

export const setupKpHuntOpportunityListener = (callback: (message: KpHuntOpportunityMessage) => void) =>
  (callbackMap['kpHuntOpportunity'] = callback);

export const clearKpHuntOpportunityListener = () => {
  delete callbackMap['kpHuntOpportunity'];
};

export const setupInitialWorldMapDataListener = (callback: (message: InitialWorldMapDataMessage) => void) =>
  (callbackMap['initialWorldMapData'] = callback);

export const clearInitialWorldMapDataListener = () => {
  delete callbackMap['initialWorldMapData'];
};

export const setupWorldNeighborsUpdatedListener = (callback: (message: WorldNeighborsUpdatedMessage) => void) =>
  (callbackMap['worldNeighborsUpdated'] = callback);

export const clearWorldNeighborsUpdatedListener = () => {
  delete callbackMap['worldNeighborsUpdated'];
};

export const setupNeighbourHelpDataListener = (callback: (message: NeighbourHelpDataMessage) => void) =>
  (callbackMap['neighbourHelpData'] = callback);

export const clearNeighbourHelpDataListener = () => {
  delete callbackMap['neighbourHelpData'];
};

export const setupHelpPerformedUpdateProvinceListener = (
  callback: (message: HelpPerformedUpdateProvinceMessage) => void,
) => (callbackMap['helpPerformedUpdateProvince'] = callback);

export const clearHelpPerformedUpdateProvinceListener = () => {
  delete callbackMap['helpPerformedUpdateProvince'];
};

export const setupSpirePicksListener = (callback: (message: SpirePicksMessage) => void) =>
  (callbackMap['spirePicks'] = callback);

export const clearSpirePicksListener = () => {
  delete callbackMap['spirePicks'];
};
