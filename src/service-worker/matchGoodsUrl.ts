import { saveToStorage } from '../chrome/storage';
import { sendGoodsQuery } from '../elvenar/sendGoodsQuery';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export function matchGoodsUrl(
  details: {
    url: string;
    initiator?: string;
    originUrl?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestBody?: any;
  },
  sharedInfo: ExtensionSharedInfo,
) {
  const goodsUrlMatcher =
    /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.Goods_[a-f0-9]{32}\.json$/

  if (goodsUrlMatcher.test(details.url)) {
    sharedInfo.reqReferrer = details.originUrl || details.initiator || 'https://en3.elvenar.com/';
    sharedInfo.reqUrl = details.url;
    // You can add any additional logic here if needed
    async function Do() {
      const goods = await sendGoodsQuery(sharedInfo);
      await saveToStorage('awbuildings', JSON.stringify(goods));
    }
    Do();
  }
}

// https://oxnl.innogamescdn.com/frontend//static/nl_NL/xml.balancing.research.ResearchTechnologiesHumans_49ac84f9c82d3069883718d96024fd20.json
