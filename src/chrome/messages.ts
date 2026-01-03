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

export type AllMessages = TradeOpenedMessage | TradeParsedMessage | RefreshCityMessage;

export const sendTradeOpenedMessage = async () => {
  try {
    await chrome.runtime.sendMessage({
      type: 'tradeOpened',
    } satisfies TradeOpenedMessage);
  } catch (e) {
    console.log('Error sending tradeOpened message:', e);
  }
};

export const sendTradeParsedMessage = async (trades: TradeSummary[]) => {
  const tabs = await chrome.tabs.query({ url: '*://*.elvenar.com/*' });
  if (tabs.length === 0 || !tabs[0].id) {
    console.warn('No tabs found for Elvenar to send tradeParsed message');
    return;
  }
  await chrome.tabs.sendMessage(tabs[0].id, {
    type: 'tradeParsed',
    trades,
  } satisfies TradeParsedMessage);
};

export const sendRefreshCityMessage = async (accountId: string) => {
  let resolveFn: () => void = () => {
    // Do nothing
  };
  const responsePromise = new Promise<void>((resolve) => (resolveFn = resolve));
  chrome.runtime.sendMessage(
    {
      type: 'refreshCity',
      accountId,
    } satisfies RefreshCityMessage,
    undefined,
    resolveFn,
  );

  await responsePromise;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const callbackMap: Record<string, (...args: any[]) => any> = {};

const messageReceiver = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: () => void,
): boolean | undefined => {
  const callback = callbackMap[(message as AllMessages).type];
  if (callback) {
    const rc = callback(message);
    if (rc instanceof Promise) {
      rc.then(() => sendResponse());
      return true;
    } else {
      sendResponse();
    }
  } else {
    sendResponse();
  }
  return undefined;
};

export const setupMessageListener = () => chrome.runtime.onMessage.addListener(messageReceiver);
export const setupTradeOpenedListener = (callback: () => void) => (callbackMap['tradeOpened'] = callback);
export const setupTradeParsedListener = (callback: (tradesMsg: TradeParsedMessage) => void) =>
  (callbackMap['tradeParsed'] = callback);
export const setupRefreshCityListener = (callback: (message: RefreshCityMessage) => Promise<void>) =>
  (callbackMap['refreshCity'] = callback);
