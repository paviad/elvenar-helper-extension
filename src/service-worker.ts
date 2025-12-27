import { saveToStorage } from './chrome/storage';

console.log('Elvenar Extension: Service Worker Loaded');

const callbackRequest = (details: {
  url: string;
  requestBody?: any;
}): chrome.webRequest.BlockingResponse | undefined => {
  // Check if the URL matches the pattern and save it in a global variable
  if (/^https:\/\/en3\.elvenar\.com\/game\/json\?h=[\w\d]+$/.test(details.url)) {
    const decoder = new TextDecoder('utf-8'); // Specify the encoding, UTF-8 is common
    const decodedString = decoder.decode(details.requestBody.raw[0].bytes);
    // console.log('Decoded request body:', decodedString);

    saveToStorage('reqUrl', details.url);

    const expectedCity =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\["LoadFeatureManifestsCommand"],"requestClass":"LogService","requestMethod":"trackGameStartup","requestId":\d+},{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"StartupService","requestMethod":"getData","requestId":\d+}]/;

    if (expectedCity.test(decodedString)) {
      saveToStorage('reqBodyCity', decodedString);
      console.log('Saved city data request url and body (onBeforeRequest):', details.url, details.requestBody);
    }

    const expectedInventory =
      /[a-zA-Z0-9]+\[{"__class__":"ServerRequestVO","requestData":\[],"requestClass":"InventoryService","requestMethod":"getItems","requestId":\d+}]/;

    if (expectedInventory.test(decodedString)) {
      saveToStorage('reqBodyInventory', decodedString);
      console.log('Saved inventory data request url and body (onBeforeRequest):', details.url, details.requestBody);
    }
  }

  return;
};

const filter = {
  urls: ['https://en3.elvenar.com/*'],
};

console.log('Elvenar Extension: Setting up webRequest listeners');

chrome.webRequest.onBeforeRequest.addListener(callbackRequest, filter, ['requestBody']);
