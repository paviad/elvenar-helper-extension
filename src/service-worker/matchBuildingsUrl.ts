import { saveToStorage } from '../chrome/storage';
import { sendBuildingsQuery } from '../elvenar/sendBuildingsQuery';
import { sharedInfo } from './svc';

export function matchBuildingsUrl(details: {
  url: string;
  initiator?: string;
  originUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestBody?: any;
}) {
  const buildingsUrlMatcher = /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/feature_flags\/ch(\d+)\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.city\.Buildings_[a-f0-9]{32}\.json$/;

  if (buildingsUrlMatcher.test(details.url)) {
    sharedInfo.reqReferrer = details.originUrl || details.initiator || 'https://en3.elvenar.com/';
    sharedInfo.reqUrl = details.url;
    // You can add any additional logic here if needed
    async function Do() {
      const buildings = await sendBuildingsQuery(sharedInfo);
      await saveToStorage('buildings', JSON.stringify(buildings));
    }
    Do();
  }
}

// https://oxnl.innogamescdn.com/frontend//static/nl_NL/xml.balancing.research.ResearchTechnologiesHumans_49ac84f9c82d3069883718d96024fd20.json