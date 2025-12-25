import { saveToStorage } from "./chrome/storage";

console.log("Elvenar Extension: Service Worker Loaded");

const callback = async (details: { url: string }): Promise<void> => {
  console.log('Request intercepted:', details);
  // Check if the URL matches the pattern and save it in a global variable
  if (/^https:\/\/en3\.elvenar\.com\/game\/json\?h=[\w\d]+$/.test(details.url)) {
    await saveToStorage('reqUrl', details.url);
    console.log('Saved game JSON URL:', details.url);
  }

  // if (/^https:\/\/oxen\.innogamescdn\.com\/frontend\/\/static\/feature_flags\/ch24\/en_DK\/xml\.balancing\.city\.Buildings_[a-fA-F0-9]+\.json$/.test(details.url)) {
  //   await saveToStorage('xmlUrl', details.url);
  //   console.log('Matched feature flags JSON URL:', details.url);
  // }

  return;
};

const filter = {
  urls: ["https://en3.elvenar.com/*"]
};

const opt_extraInfoSpec: chrome.webRequest.OnCompletedOptions[] = [
  "responseHeaders"
];

console.log('hi', chrome.webRequest);
chrome.webRequest.onCompleted.addListener(
  callback, filter, opt_extraInfoSpec);
