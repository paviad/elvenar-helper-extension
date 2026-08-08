import {
  setupCitySavedListener,
  setupInterceptedNonSpecificRequestListener,
  setupInterceptedPlayerSpecificRequestListener,
  setupMessageListener,
  setupOpenExtensionTabListener,
  setupRefreshCityListener,
  setupSpirePicksListener,
  SpirePicksMessage,
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
import { nonSpecificRequestHandler } from './nonSpecificRequestHandler';
import { openOrRestoreTab } from './openOrRestoreTab';
import { playerSpecificRequestHandler } from './playerSpecificRequestHandler';

// Polyfill MV3 'action' to MV2 'browserAction'
if (typeof chrome.action === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chrome.action = (chrome as any).browserAction;
}

console.log('Elvenar Extension: Service Worker Loaded');

/**
 * The accounts read back from storage, started as early as possible and awaited by any handler
 * that looks an account up. The service worker is torn down whenever it goes idle, so a message
 * can wake it and be delivered while `accounts` is still the empty object a fresh worker starts
 * with - a lookup made then finds nothing at all.
 */
const accountManagerReady = loadAccountManagerFromStorage();

async function initialize() {
  setupMessageListener();
  setupOpenExtensionTabListener(async (msg, sender) => {
    // The overlay is waiting on this handler's promise, and a rejection would reach it as a closed
    // message port - which it reads as the extension having gone away, and puts up the reload
    // cross for. Failures here are ours to report, not the overlay's.
    try {
      // Without this wait, a click that happens to wake the worker resolves to no account, and the
      // tab then opens on whichever city the UI falls back to rather than the one that sent us here.
      await accountManagerReady;
      let accountId: string | undefined;
      if (sender.tab?.id) {
        accountId = getAccountByTabId(sender.tab.id);
      }
      await openOrRestoreTab(accountId);
    } catch (error) {
      console.error('ElvenAssist: Error opening the extension tab:', error);
    }
  });
  setupCitySavedListener((msg) => {
    void loadAccountManagerFromStorage(true);
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
  setupInterceptedNonSpecificRequestListener((msg) => void nonSpecificRequestHandler(msg));
  setupInterceptedPlayerSpecificRequestListener((msg, sender) => void playerSpecificRequestHandler(msg, sender));
  setupSpirePicksListener((msg) => void forwardToOverlay(msg));
  await accountManagerReady;
  console.log('ElvenAssist: Account Manager loaded in Service Worker');
}

const forwardToOverlay = async (msg: SpirePicksMessage) => {
  console.log('Forwarding spirePicks message from Service Worker to overlay', msg);
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { ...msg, type: 'spirePicks' });
      } catch (error) {
        // Ignore errors, likely due to tabs that don't have the content script injected
      }
    }
  }
};

void initialize();

chrome.action.onClicked.addListener((tab) => {
  void openOrRestoreTab();
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
