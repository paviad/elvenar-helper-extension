import {
  sendCityDataUpdatedMessage,
  setupMessageListener,
  setupOpenExtensionTabListener,
  setupRefreshCityListener,
  setupCitySavedListener,
  sendOtherPlayerCityDataUpdatedMessage,
} from '../chrome/messages';
import {
  getAccountById,
  getAccountBySessionId,
  getAccountByTabId,
  getAllStoredAccounts,
  loadAccountManagerFromStorage,
  saveAllAccounts,
} from '../elvenar/AccountManager';
import { sendCauldronQuery } from '../elvenar/sendCauldronQuery';
import { sendCityDataQuery } from '../elvenar/sendCityDataQuery';
import { sendInventoryQuery } from '../elvenar/sendInventoryQuery';
import { sendTradeQuery } from '../elvenar/sendTradeQuery';
import { sendVisitPlayerQuery } from '../elvenar/sendVisitPlayerQuery';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { tradeOpenedCallback } from '../trade/tradeOpenedCallback';
import { matchBuildingsUrl } from './matchBuildingsUrl';
import { matchEffectsUrl } from './matchEffectsUrl';
import { matchGoodsUrl } from './matchGoodsUrl';
import { matchItemsUrl } from './matchItemsUrl';
import { matchPremiumBuildingHintsUrl } from './matchPremiumBuildingHintsUrl';
import { matchRenderConfigUrl } from './matchRenderConfigUrl';
import { matchTechTreeUrl } from './matchTechTreeUrl';
import { matchTomesUrl } from './matchTomesUrl';
import { openOrRestoreTab } from './openOrRestoreTab';

console.log('Elvenar Extension: Service Worker Loaded');

async function initialize() {
  setupMessageListener();
  setupOpenExtensionTabListener(async (msg, sender) => {
    let accountId: string | undefined;
    if (sender.tab?.id) {
      accountId = getAccountByTabId(sender.tab.id);
    }
    await openOrRestoreTab(accountId);
  });
  setupCitySavedListener(async (msg) => {
    await loadAccountManagerFromStorage(true);
    const allAccounts = getAllStoredAccounts();
    console.log('ElvenAssist: City saved for account:', msg.accountId, allAccounts);
  });
  setupRefreshCityListener(async (msg) => {
    await loadAccountManagerFromStorage();
    const accountData = getAccountById(msg.accountId);
    if (!accountData || !accountData.cityQuery) {
      return {
        success: false,
        message: 'Account data or city query not found',
      };
    }
    try {
      await sendCityDataQuery({ ...accountData.sharedInfo, reqUrl: accountData.cityQuery.url });
      await saveAllAccounts();
      return { success: true };
    } catch (error) {
      console.error('Error in refreshCityListener sendCityDataQuery:', error);
      return {
        success: false,
        message: 'Error in sendCityDataQuery',
      };
    }
  });
  await loadAccountManagerFromStorage();
  console.log('ElvenAssist: Account Manager loaded in Service Worker');
}

initialize();

chrome.action.onClicked.addListener(async (tab) => {
  await openOrRestoreTab();
});

const callbackRequest = (details: {
  url: string;
  initiator?: string;
  originUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestBody?: any;
  tabId: number;
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

  const sharedInfo: ExtensionSharedInfo = {
    reqUrl: '',
    reqReferrer: '',
    worldId: '',
    sessionId: '',
    tabId: -1,
  };

  matchBuildingsUrl(details, sharedInfo);

  matchRenderConfigUrl(details, sharedInfo);

  matchItemsUrl(details, sharedInfo);

  matchTomesUrl(details, sharedInfo);

  matchTechTreeUrl(details, sharedInfo);

  matchEffectsUrl(details, sharedInfo);

  matchGoodsUrl(details, sharedInfo);

  matchPremiumBuildingHintsUrl(details, sharedInfo);

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
    sharedInfo.tabId = details.tabId;

    const decoder = new TextDecoder('utf-8'); // Specify the encoding, UTF-8 is common
    const decodedString = decoder.decode(details.requestBody.raw[0].bytes);

    const expectedCity =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\["LoadFeatureManifestsCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"StartupService","requestMethod":"getData","requestId":\d+}]/;

    if (expectedCity.test(decodedString)) {
      async function Do() {
        sharedInfo.reqBodyCity = decodedString;
        try {
          await sendCityDataQuery(sharedInfo);
          await saveAllAccounts();
          sendCityDataUpdatedMessage(details.tabId);
        } catch (error) {
          console.error('Error in sendCityDataQuery:', error);
        }
      }
      Do();
    }

    const expectedInventory =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"InventoryService","requestMethod":"getItems","requestId":\d+}]/;

    if (expectedInventory.test(decodedString)) {
      async function Do() {
        sharedInfo.reqBodyInventory = decodedString;
        try {
          await sendInventoryQuery(sharedInfo);
          await saveAllAccounts();
        } catch (error) {
          console.error('Error in sendInventoryQuery:', error);
        }
      }
      Do();
    }

    const expectedTrade =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"TradeService","requestMethod":"getOtherPlayersTrades","requestId":\d+}]/;

    if (expectedTrade.test(decodedString)) {
      async function Do() {
        sharedInfo.reqBodyTrade = decodedString;
        try {
          await sendTradeQuery(sharedInfo);
          await saveAllAccounts();
          const accountData = getAccountBySessionId(sessionId);
          if (accountData) {
            await tradeOpenedCallback(accountData);
          }
        } catch (error) {
          console.error('Error in sendTradeQuery:', error);
        }
      }
      Do();
    }

    const expectedCauldron =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"CauldronService","requestMethod":"getIngredients","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"CauldronService","requestMethod":"getPotionEffects","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["ConfigureStartupDataCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["FlushUncaughtErrorBuffer"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["ConfigureWindowCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["ConfigureTooltipCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["ConfigureViewBehaviorsCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"TreasureService","requestMethod":"refresh","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\["ConfigureIsoEngineCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+}]/;

    if (expectedCauldron.test(decodedString)) {
      async function Do() {
        sharedInfo.reqBodyCauldron = decodedString;
        await sendCauldronQuery(sharedInfo);
        await saveAllAccounts();
      }
      Do();
    }

    const expectedVisitPlayer =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[\d+\],"requestClass":"OtherPlayerService","requestMethod":"visitPlayer","requestId":\d+}]/;

    if (expectedVisitPlayer.test(decodedString)) {
      async function Do() {
        sharedInfo.reqBodyCity = decodedString;
        try {
          await sendVisitPlayerQuery(sharedInfo);
          await saveAllAccounts();
          await sendOtherPlayerCityDataUpdatedMessage();
        } catch (error) {
          console.error('Error in sendVisitPlayerQuery:', error);
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
