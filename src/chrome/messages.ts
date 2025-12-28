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

export type AllMessages = TradeOpenedMessage | TradeParsedMessage;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const callbackMap: Record<string, (...args: any[]) => void> = {};

const messageReceiver = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: () => void,
): boolean | undefined => {
  console.log('Popup received message:', message, sender);
  const callback = callbackMap[(message as AllMessages).type];
  if (callback) {
    callback(message);
  }
  return undefined;
};

export const setupMessageListener = () => chrome.runtime.onMessage.addListener(messageReceiver);
export const setupTradeOpenedListener = (callback: () => void) => (callbackMap['tradeOpened'] = callback);
export const setupTradeParsedListener = (callback: (tradesMsg: TradeParsedMessage) => void) =>
  (callbackMap['tradeParsed'] = callback);
