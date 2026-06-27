import { Subject, groupBy, mergeMap, debounceTime } from 'rxjs';
import {
  setupCityEntitiesUpdatedListener,
  setupAccountsSavedRuntimeListener,
  setupMessageListener,
  setupOtherPlayerCityUpdatedListener,
} from './chrome/messages';
import { createReactUi } from './city/createReactUi';
import { getAccountById, getAccountByTabId, loadAccountManagerFromStorage } from './elvenar/AccountManager';
import { useTabStore } from './util/tabStore';

// Polyfill MV3 'action' to MV2 'browserAction'
if (typeof chrome.action === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chrome.action = (chrome as any).browserAction;
}

document.addEventListener('DOMContentLoaded', () => {
  void (async () => {
    await loadAccountManagerFromStorage();
    setupMessageListener();

    setupAccountsSavedHandler();

    setupOtherPlayerCityUpdatedListener(async () => {
      await loadAccountManagerFromStorage(true);
      useTabStore.getState()?.triggerForceUpdate();
      useTabStore.getState()?.setOtherCityUpdated(true);
    });
    setupCityEntitiesUpdatedListener(async (msg) => {
      await loadAccountManagerFromStorage(true);
      useTabStore.getState()?.triggerForceUpdate();
    });
    createReactUi();
  })();
});

const setupAccountsSavedHandler = () => {
  const updateSubject = new Subject<number>();
  const updateObservable = updateSubject.pipe(
    groupBy((tabId) => tabId),
    mergeMap((group) => group.pipe(debounceTime(300)))
  );
  updateObservable.subscribe((tabId) => {
    async function handleUpdate() {
      const accountId = useTabStore.getState()?.accountId;
      const accountIdInMessage = getAccountByTabId(tabId);
      if (accountId && accountId === accountIdInMessage) {
        await loadAccountManagerFromStorage(true);
        const accountData = getAccountById(accountId);
        useTabStore.getState()?.setAccountData(accountData);
      }
    }
    handleUpdate().catch((error) => {
      console.error('ElvenAssist: Error handling update for tabId:', tabId, error);
    });
  });
  // eslint-disable-next-line @typescript-eslint/require-await
  setupAccountsSavedRuntimeListener(async (msg) => {
    updateSubject.next(msg.tabId);
  });
};
