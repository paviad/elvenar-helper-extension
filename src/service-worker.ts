import { sendTradeOpenedMessage } from './chrome/messages';
import { saveToStorage } from './chrome/storage';
import { tradeOpenedCallback } from './trade/tradeOpenedCallback';

console.log('Elvenar Extension: Service Worker Loaded');

chrome.action.onClicked.addListener(async (tab) => {
  const extensionId = chrome.runtime.id;
  const url = `chrome-extension://${extensionId}/tab.html`;
  const extensionTab = await chrome.tabs.query({ url });
  if (extensionTab.length === 0 || !extensionTab[0].id) {
    chrome.tabs.create({
      url: 'tab.html',
      active: true,
    });
  } else {
    chrome.tabs.update(extensionTab[0].id, { active: true });
  }
});

const callbackRequest = (details: {
  url: string;
  initiator?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestBody?: any;
}): chrome.webRequest.BlockingResponse | undefined => {
  const extensionId = chrome.runtime.id;
  const thisExtensionInitiatorUrl = `chrome-extension://${extensionId}`;

  if (details.initiator === thisExtensionInitiatorUrl) {
    return;
  }

  // Check if the URL matches the pattern and save it in a global variable
  if (/^https:\/\/en3\.elvenar\.com\/game\/json\?h=[\w\d]+$/.test(details.url)) {
    const decoder = new TextDecoder('utf-8'); // Specify the encoding, UTF-8 is common
    const decodedString = decoder.decode(details.requestBody.raw[0].bytes);

    saveToStorage('reqUrl', details.url);

    const expectedCity =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\["LoadFeatureManifestsCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"StartupService","requestMethod":"getData","requestId":\d+}]/;

    if (expectedCity.test(decodedString)) {
      saveToStorage('reqBodyCity', decodedString);
    }

    const expectedInventory =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"InventoryService","requestMethod":"getItems","requestId":\d+}]/;

    if (expectedInventory.test(decodedString)) {
      saveToStorage('reqBodyInventory', decodedString);
    }

    const expectedTrade =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"TradeService","requestMethod":"getOtherPlayersTrades","requestId":\d+}]/;

    if (expectedTrade.test(decodedString)) {
      async function Do() {
        await saveToStorage('reqBodyTrade', decodedString);
        await sendTradeOpenedMessage();
        await tradeOpenedCallback();
      }
      Do();
    }
  }

  return;
};

const filter = {
  urls: ['https://en3.elvenar.com/*'],
};

chrome.webRequest.onBeforeRequest.addListener(callbackRequest, filter, ['requestBody']);
