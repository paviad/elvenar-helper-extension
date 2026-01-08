import { getFromStorage } from '../chrome/storage';
import { Effect } from '../model/effect';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export async function sendEffectsQuery(sharedInfo: ExtensionSharedInfo) {
  const { reqUrl: url, reqReferrer: referrer } = sharedInfo;

  const response = await fetch(url, {
    headers: {
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
    referrer,
    body: null,
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
  });

  const effectsRaw = await response.json() as Effect[];

  const effects = effectsRaw.filter((r) => r.action === 'manufactories_production_boost');

  console.log('Filtered Effects:', effects);

  return effects;
}

export async function getEffects() {
  const json = await getFromStorage('effects');
  if (json) {
    return JSON.parse(json) as Effect[];
  } else {
    return [];
  }
}
