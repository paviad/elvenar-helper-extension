import { SpirePicksMessage } from '../chrome/kphuntMessages';
import '../chrome/recruitMessages';
import { setListener, setupMessageListener } from '../chrome/messages';
import { getAccountById, getAccountByTabId, loadAllAccounts, saveAccount } from '../elvenar/accountStore';
import { clearKpHuntOpportunities } from '../elvenar/clearKpHuntOpportunities';
import { processGameClientScript } from '../elvenar/processGameClientScript';
import { processGameRenderConfig } from '../elvenar/processGameRenderConfig';
import { setKpHuntAuto } from '../elvenar/processRankingData';
import { sendCityDataQuery } from '../elvenar/sendCityDataQuery';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { applyRecruitEdit } from '../recruits/editRecruit';
import { lookUpElvenStats, refreshAndRecheckElvenStats } from '../recruits/lookUpElvenStats';
import { clearDiagnostics, recordDiagnostic } from '../recruits/recruitBook';
import { withRecruitBook } from '../recruits/recruitStore';
import { accountManagerReady } from './accountManagerReady';
import { matchTechTreeUrl } from './matchTechTreeUrl';
import { nonSpecificRequestHandler } from './nonSpecificRequestHandler';
import { openOrRestoreTab } from './openOrRestoreTab';
import { playerSpecificRequestHandler } from './playerSpecificRequestHandler';
import { researchResourcesReport } from './researchResourcesReport';

// Polyfill MV3 'action' to MV2 'browserAction'
if (typeof chrome.action === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chrome.action = (chrome as any).browserAction;
}

console.log('Elvenar Extension: Service Worker Loaded');

/**
 * Diagnostics to call by hand from the service worker's own console, which is the one behind
 * "Inspect views: service worker" on chrome://extensions. They are on the global rather than
 * exported so that typing `ElvenAssist.` in that console lists what there is to run.
 */
(globalThis as unknown as { ElvenAssist: Record<string, unknown> }).ElvenAssist = {
  researchResources: researchResourcesReport,
};

async function initialize() {
  setupMessageListener();
  setListener('openExtensionTab', async (msg, sender) => {
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
  setListener('citySaved', (msg) => {
    void loadAllAccounts();
  });
  setListener('refreshCity', async (msg) => {
    await loadAllAccounts();
    const accountData = getAccountById(msg.accountId);
    if (!accountData || !accountData.cityQuery) {
      return {
        success: false,
        message: 'Account data or city query not found',
      };
    }
    try {
      await loadAllAccounts();
      await sendCityDataQuery({ ...accountData.sharedInfo, reqUrl: accountData.cityQuery.url });
      await saveAccount(msg.accountId);
      return { success: true };
    } catch (error) {
      console.error('Error in refreshCityListener sendCityDataQuery:', error);
      return {
        success: false,
        message: 'Error in sendCityDataQuery',
      };
    }
  });
  setListener('setKpHuntAuto', async (msg, sender) => {
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      return;
    }
    await setKpHuntAuto(tabId, msg.on);
  });
  setListener('clearKpHuntOpportunities', async (msg) => {
    try {
      await accountManagerReady;
      const left = await clearKpHuntOpportunities(msg.accountId, msg.opportunityId);
      return { success: left !== undefined };
    } catch (error) {
      console.error('ElvenAssist: Error clearing KP Hunt opportunities:', error);
      return { success: false };
    }
  });
  setListener('editRecruit', async ({ accountId, ...edit }) => {
    try {
      const done = await withRecruitBook(accountId, (book) => applyRecruitEdit(book, edit, Date.now()));
      return { success: done };
    } catch (error) {
      console.error('Error editing a recruit:', error);
      return { success: false };
    }
  });
  setListener('recordRecruitDiagnostic', async ({ accountId, diagnostic, stopRefresh }) => {
    try {
      await withRecruitBook(accountId, (book) => recordDiagnostic(book, diagnostic, stopRefresh));
      return { success: true };
    } catch (error) {
      console.error('Error keeping a recruit diagnostic:', error);
      return { success: false };
    }
  });
  setListener('lookUpElvenStats', async ({ accountId, playerId }) => {
    try {
      return await lookUpElvenStats(accountId, playerId);
    } catch (error) {
      console.error('Error looking a recruit up on ElvenStats:', error);
      return { success: false };
    }
  });
  setListener('refreshElvenStats', async ({ accountId, playerId }) => {
    try {
      return await refreshAndRecheckElvenStats(accountId, playerId);
    } catch (error) {
      console.error('Error refreshing a recruit on ElvenStats:', error);
      return { success: false };
    }
  });
  setListener('clearRecruitDiagnostics', async ({ accountId }) => {
    try {
      await withRecruitBook(accountId, clearDiagnostics);
      return { success: true };
    } catch (error) {
      console.error('Error clearing the recruit diagnostics:', error);
      return { success: false };
    }
  });
  setListener('interceptedNonSpecificRequest', (msg) => void nonSpecificRequestHandler(msg));
  setListener('interceptedPlayerSpecificRequest', (msg, sender) => void playerSpecificRequestHandler(msg, sender));
  setListener('gameClientScript', (msg) => void processGameClientScript(msg.url));
  setListener('gameRenderConfig', (msg) => void processGameRenderConfig(msg.url));
  setListener('spirePicks', (msg) => void forwardToOverlay(msg));
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

// Only the tech tree sprite is looked for here. Every request the game makes used to wake the
// worker, the bodies of its own calls copied across with them, just to be checked against it.
const filter = {
  urls: ['https://*.innogamescdn.com/*atlas-techtree.gui.chapternavigation-*'],
};

chrome.webRequest.onBeforeRequest.addListener(callbackRequest, filter);
