import { getFromStorage } from '../chrome/storage';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export async function sendPremiumBuildingHintsQuery(sharedInfo: ExtensionSharedInfo) {
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

  const premiumBuildingHintsRaw = (await response.json()) as { id: string; section: string }[];

  const premiumBuildingHints = premiumBuildingHintsRaw.map((z) => ({ id: z.id, section: z.section }));

  return premiumBuildingHints;
}

export async function getPremiumBuildingHints(): Promise<{ id: string; section: string }[]> {
  const json = await getFromStorage('premiumBuildingHints');
  if (json) {
    return JSON.parse(json);
  } else {
    return [];
  }
}
