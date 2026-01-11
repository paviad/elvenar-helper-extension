import { saveToStorage } from '../chrome/storage';
import { sendPremiumBuildingHintsQuery } from '../elvenar/sendPremiumBuildingHintsQuery';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export function matchPremiumBuildingHintsUrl(
  details: {
    url: string;
    initiator?: string;
    originUrl?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestBody?: any;
  },
  sharedInfo: ExtensionSharedInfo,
) {
  const premiumBuildingHintsUrlMatcher =
    /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.city\.PremiumBuildingHintsHumans_[a-f0-9]{32}\.json$/;

  if (premiumBuildingHintsUrlMatcher.test(details.url)) {
    sharedInfo.reqReferrer = details.originUrl || details.initiator || 'https://en3.elvenar.com/';
    sharedInfo.reqUrl = details.url;
    // You can add any additional logic here if needed
    async function Do() {
      const premiumBuildingHints = await sendPremiumBuildingHintsQuery(sharedInfo);
      await saveToStorage('premiumBuildingHints', JSON.stringify(premiumBuildingHints));
    }
    Do();
  }
}

// https://oxnl.innogamescdn.com/frontend//static/nl_NL/xml.balancing.research.ResearchTechnologiesHumans_49ac84f9c82d3069883718d96024fd20.json
