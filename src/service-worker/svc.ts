import {
  setupMessageListener,
  setupOpenExtensionTabListener,
  setupRefreshCityListener,
  setupCitySavedListener,
  setupInterceptedPlayerSpecificRequestListener,
  setupInterceptedNonSpecificRequestListener,
} from '../chrome/messages';
import {
  getAccountById,
  getAccountByTabId,
  loadAccountManagerFromStorage,
  saveAllAccounts,
} from '../elvenar/AccountManager';
import { sendCityDataQuery } from '../elvenar/sendCityDataQuery';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { matchTechTreeUrl } from './matchTechTreeUrl';
import { openOrRestoreTab } from './openOrRestoreTab';
import { playerSpecificRequestHandler } from './playerSpecificRequestHandler';
import { nonSpecificRequestHandler } from './nonSpecificRequestHandler';

// Polyfill MV3 'action' to MV2 'browserAction'
if (typeof chrome.action === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chrome.action = (chrome as any).browserAction;
}

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
      await loadAccountManagerFromStorage();
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
  setupInterceptedNonSpecificRequestListener(nonSpecificRequestHandler);
  setupInterceptedPlayerSpecificRequestListener(playerSpecificRequestHandler);
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
    reqBody: '',
  };

  matchTechTreeUrl(details, sharedInfo);

  return;
};

const filter = {
  urls: ['https://*.elvenar.com/*', 'https://*.innogamescdn.com/*'],
};

chrome.webRequest.onBeforeRequest.addListener(callbackRequest, filter, ['requestBody']);
