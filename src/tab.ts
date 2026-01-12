import { setupMessageListener, setupOtherPlayerCityUpdatedListener } from './chrome/messages';
import { createReactUi } from './city/createReactUi';
import { loadAccountManagerFromStorage } from './elvenar/AccountManager';
import { useTabStore } from './util/tabStore';

document.addEventListener('DOMContentLoaded', async () => {
  await loadAccountManagerFromStorage();
  setupMessageListener();
  setupOtherPlayerCityUpdatedListener(async () => {
    await loadAccountManagerFromStorage(true);
    useTabStore.getState()?.triggerForceUpdate();
  });
  createReactUi();
});
