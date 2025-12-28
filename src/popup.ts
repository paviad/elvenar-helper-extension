import { createReactUi } from './popup/createReactUi';

document.addEventListener('DOMContentLoaded', async () => {
  const extensionId = chrome.runtime.id;
  const url = `chrome-extension://${extensionId}/tab.html`;
  const extensionTab = await chrome.tabs.query({ url });
  if (window.location.href.endsWith('popup.html')) {
    if (extensionTab.length === 0) {
      chrome.tabs.create({
        url: 'tab.html',
        active: true,
      });
    }
  } else {
    createReactUi();
  }
});
