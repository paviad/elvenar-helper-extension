import { setupMessageListener, setupRefreshCityListener } from '../chrome/messages';
import { saveToStorage } from '../chrome/storage';
import {
  getAccountById,
  getAccountBySessionId,
  loadAccountManagerFromStorage,
  saveAllAccounts,
} from '../elvenar/AccountManager';
import { sendCityDataQuery } from '../elvenar/sendCityDataQuery';
import { sendInventoryQuery } from '../elvenar/sendInventoryQuery';
import { sendTradeQuery } from '../elvenar/sendTradeQuery';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { tradeOpenedCallback } from '../trade/tradeOpenedCallback';
import { matchBuildingsUrl } from './matchBuildingsUrl';
import { matchItemsUrl } from './matchItemsUrl';
import { matchRenderConfigUrl } from './matchRenderConfigUrl';
import { matchTomesUrl } from './matchTomesUrl';

console.log('Elvenar Extension: Service Worker Loaded');

async function initialize() {
  await loadAccountManagerFromStorage();
  console.log('Account Manager loaded in Service Worker');
  setupMessageListener();
  setupRefreshCityListener(async (msg) => {
    const accountData = getAccountById(msg.accountId);
    if (!accountData || !accountData.cityQuery) {
      return;
    }
    console.log('refreshCity message received in Service Worker');
    await sendCityDataQuery({ ...accountData.sharedInfo, reqUrl: accountData.cityQuery.url });
    await saveAllAccounts();
    console.log('refreshCity message received handled');
  });
}

initialize();

chrome.action.onClicked.addListener(async (tab) => {
  const views = await chrome.runtime.getContexts({ contextTypes: ['TAB'] });

  if (views.length === 0) {
    chrome.tabs.create({
      url: 'tab.html',
      active: true,
    });
  } else {
    chrome.tabs.update(views[0].tabId, { active: true });
  }
});

export const sharedInfo: ExtensionSharedInfo = {
  reqUrl: '',
  reqReferrer: '',
  worldId: '',
  sessionId: '',
};

const callbackRequest = (details: {
  url: string;
  initiator?: string;
  originUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestBody?: any;
}): chrome.webRequest.BlockingResponse | undefined => {
  // Chrome
  if (details.initiator?.startsWith('chrome-extension://')) {
    return;
  }

  // Firefox
  if (details.originUrl?.startsWith('moz-extension://')) {
    return;
  }

  // Safety
  const originCombined = details.originUrl || details.initiator || '';
  if (!originCombined.includes('elvenar') && !originCombined.includes('innogamescdn')) {
    return;
  }

  matchBuildingsUrl(details);

  matchRenderConfigUrl(details);

  matchItemsUrl(details);

  matchTomesUrl(details);

  const urlMatcher = /^(https:\/\/(.*?)\.elvenar\.com\/)game\/json\?h=([\w\d]+)$/;
  // Check if the URL matches the pattern and save it in a global variable
  const urlMatch = details.url.match(urlMatcher);

  if (urlMatch) {
    const referer = urlMatch[1];
    const worldId = urlMatch[2];
    const sessionId = urlMatch[3];

    sharedInfo.reqReferrer = referer;
    sharedInfo.worldId = worldId;
    sharedInfo.reqUrl = details.url;
    sharedInfo.sessionId = sessionId;

    const decoder = new TextDecoder('utf-8'); // Specify the encoding, UTF-8 is common
    const decodedString = decoder.decode(details.requestBody.raw[0].bytes);

    const expectedCity =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\["LoadFeatureManifestsCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"StartupService","requestMethod":"getData","requestId":\d+}]/;

    if (expectedCity.test(decodedString)) {
      async function Do() {
        sharedInfo.reqBodyCity = decodedString;
        await sendCityDataQuery(sharedInfo);
        await saveAllAccounts();
      }
      Do();
    }

    const expectedInventory =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"InventoryService","requestMethod":"getItems","requestId":\d+}]/;

    if (expectedInventory.test(decodedString)) {
      console.log('Inventory request detected');
      async function Do() {
        sharedInfo.reqBodyInventory = decodedString;
        await sendInventoryQuery(sharedInfo);
        await saveAllAccounts();
      }
      Do();
    }

    const expectedTrade =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"TradeService","requestMethod":"getOtherPlayersTrades","requestId":\d+}]/;

    if (expectedTrade.test(decodedString)) {
      async function Do() {
        sharedInfo.reqBodyTrade = decodedString;
        await sendTradeQuery(sharedInfo);
        await saveAllAccounts();
        const accountData = getAccountBySessionId(sessionId);
        if (accountData) {
          await tradeOpenedCallback(accountData);
        }
      }
      Do();
    }
  }

  return;
};

const filter = {
  urls: ['https://*.elvenar.com/*', 'https://*.innogamescdn.com/*'],
};

chrome.webRequest.onBeforeRequest.addListener(callbackRequest, filter, ['requestBody']);
