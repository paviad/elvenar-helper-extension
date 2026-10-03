import { debounceTime, groupBy, mergeMap, Subject } from 'rxjs';
import { listen, setListener, setupMessageListener } from './chrome/messages';
import { createReactUi } from './city/createReactUi';
import { getAccountByTabId, loadAccount, loadAllAccounts } from './elvenar/accountStore';
import { useTabStore } from './util/tabStore';

// Polyfill MV3 'action' to MV2 'browserAction'
if (typeof chrome.action === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chrome.action = (chrome as any).browserAction;
}

document.addEventListener('DOMContentLoaded', () => {
  void (async () => {
    await loadAllAccounts();
    setupMessageListener();

    setupAccountsSavedHandler();

    setListener('otherPlayerCityUpdated', async () => {
      await loadAllAccounts();
      useTabStore.getState()?.triggerForceUpdate();
      useTabStore.getState()?.setOtherCityUpdated(true);
    });
    setListener('cityEntitiesUpdated', async (msg) => {
      await loadAllAccounts();
      // The views showing an account redraw by themselves; this is for the city grid, which takes
      // the new layout only when told to, since it would otherwise throw away unsaved moves.
      useTabStore.getState()?.triggerForceUpdate();
    });
    createReactUi();
  })();
});

const setupAccountsSavedHandler = () => {
  const updateSubject = new Subject<number>();
  const updateObservable = updateSubject.pipe(
    groupBy((tabId) => tabId),
    mergeMap((group) => group.pipe(debounceTime(300))),
  );
  updateObservable.subscribe((tabId) => {
    async function handleUpdate() {
      const accountId = useTabStore.getState()?.accountId;
      const accountIdInMessage = getAccountByTabId(tabId);
      if (accountId && accountId === accountIdInMessage) {
        await loadAccount(accountId);
      }
    }
    handleUpdate().catch((error) => {
      console.error('ElvenAssist: Error handling update for tabId:', tabId, error);
    });
  });
  // eslint-disable-next-line @typescript-eslint/require-await
  listen('accountsSavedRuntime', async (msg) => {
    updateSubject.next(msg.tabId);
  });
};
