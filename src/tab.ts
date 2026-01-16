import { setupMessageListener, setupOtherPlayerCityUpdatedListener } from './chrome/messages';
import { createReactUi } from './city/createReactUi';
import { loadAccountManagerFromStorage } from './elvenar/AccountManager';
import { useTabStore } from './util/tabStore';

// Polyfill MV3 'action' to MV2 'browserAction'
if (typeof chrome.action === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chrome.action = (chrome as any).browserAction;
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAccountManagerFromStorage();
  setupMessageListener();
  setupOtherPlayerCityUpdatedListener(async () => {
    await loadAccountManagerFromStorage(true);
    useTabStore.getState()?.triggerForceUpdate();
    useTabStore.getState()?.setOtherCityUpdated(true);
  });
  createReactUi();
});
