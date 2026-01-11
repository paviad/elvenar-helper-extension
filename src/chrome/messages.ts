import { TradeSummary } from '../model/tradeSummary';

export interface TradeOpenedMessage {
  type: 'tradeOpened';
}

export interface TradeParsedMessage {
  type: 'tradeParsed';
  trades: {
    offer: string;
    need: string;
    player: string;
  }[];
}

export interface RefreshCityMessage {
  type: 'refreshCity';
  accountId: string;
}

export interface OpenExtensionTabMessage {
  type: 'openExtensionTab';
}

export interface CityDataUpdatedMessage {
  type: 'cityDataUpdated';
  tabId: number;
}

export interface OtherPlayerCityUpdatedMessage {
  type: 'otherPlayerCityUpdated';
}

export interface CitySavedMessage {
  type: 'citySaved';
  accountId: string;
}

export type AllMessages =
  | TradeOpenedMessage
  | TradeParsedMessage
  | RefreshCityMessage
  | OpenExtensionTabMessage
  | CityDataUpdatedMessage
  | CitySavedMessage;

export interface MessageResponse {
  success: boolean;
  message?: string;
}

export const sendTradeOpenedMessage = async () => {
  try {
    await chrome.runtime.sendMessage({
      type: 'tradeOpened',
    } satisfies TradeOpenedMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending tradeOpened message:', e);
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

export const sendTradeParsedMessage = async (tabId: number, trades: TradeSummary[]) => {
  await chrome.tabs.sendMessage(tabId, {
    type: 'tradeParsed',
    trades,
  } satisfies TradeParsedMessage);
};

export const sendRefreshCityMessage = async (accountId: string): Promise<MessageResponse> => {
  let resolveFn: (response: MessageResponse) => void = () => {
    // Do nothing
  };
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

export const sendCityDataUpdatedMessage = async (tabId: number) => {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'cityDataUpdated', tabId } satisfies CityDataUpdatedMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending cityDataUpdated message:', e);
  }
};

export const sendOtherPlayerCityDataUpdatedMessage = async () => {
  try {
    await chrome.runtime.sendMessage({ type: 'otherPlayerCityUpdated' } satisfies OtherPlayerCityUpdatedMessage);
  } catch (e) {
    console.log('ElvenAssist: Error sending otherPlayerCityUpdated message:', e);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const callbackMap: Record<string, (...args: any[]) => any> = {};

const messageReceiver = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendResponse: (response?: any) => void,
): boolean | undefined => {
  const callback = callbackMap[(message as AllMessages).type];
  if (callback) {
    const rc = callback(message, sender);
    if (rc instanceof Promise) {
      rc.then((r) => sendResponse(r));
      return true;
    } else {
      sendResponse(rc);
    }
  } else {
    sendResponse();
  }
};

export const setupMessageListener = () => chrome.runtime.onMessage.addListener(messageReceiver);
export const setupTradeOpenedListener = (callback: () => void) => (callbackMap['tradeOpened'] = callback);
export const clearTradeParsedListener = () => {
  delete callbackMap['tradeParsed'];
};
export const setupTradeParsedListener = (callback: (tradesMsg: TradeParsedMessage) => void) =>
  (callbackMap['tradeParsed'] = callback);
export const setupRefreshCityListener = (callback: (message: RefreshCityMessage) => Promise<MessageResponse>) =>
  (callbackMap['refreshCity'] = callback);
export const setupOpenExtensionTabListener = (
  callback: (message: OpenExtensionTabMessage, sender: chrome.runtime.MessageSender) => void,
) => (callbackMap['openExtensionTab'] = callback);

export const setupCityDataUpdatedListener = (callback: (tabId: CityDataUpdatedMessage) => void) =>
  (callbackMap['cityDataUpdated'] = callback);

export const setupOtherPlayerCityUpdatedListener = (callback: (message: OtherPlayerCityUpdatedMessage) => void) =>
  (callbackMap['otherPlayerCityUpdated'] = callback);

export const setupCitySavedListener = (callback: (message: CitySavedMessage) => void) =>
  (callbackMap['citySaved'] = callback);
