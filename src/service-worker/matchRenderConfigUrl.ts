import { saveToStorage } from '../chrome/storage';
import { sendRenderConfigQuery } from '../elvenar/sendRenderConfigQuery';
import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { GoodsBuilding } from '../model/goodsBuilding';

export function matchRenderConfigUrl(
  details: {
    url: string;
    initiator?: string;
    originUrl?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestBody?: any;
  },
  sharedInfo: ExtensionSharedInfo,
) {
  const renderConfigMatcher =
    /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/assets\/renderconfigdata-[a-f0-9]{32}\.json$/;

  if (renderConfigMatcher.test(details.url)) {
    sharedInfo.reqReferrer = details.originUrl || details.initiator || 'https://en3.elvenar.com/';
    sharedInfo.reqUrl = details.url;
    // Add any additional logic here if needed
    async function Do() {
      const { goodsRenderConfig, maxLevels } = await sendRenderConfigQuery(sharedInfo);
      await saveToStorage('goodsRenderConfig', JSON.stringify(compress(goodsRenderConfig)));
      await saveToStorage('maxLevels', JSON.stringify(maxLevels));
    }
    Do();
  }
}

const compression: Record<string, string> = {
  culture: 'c',
  culture_residential: 'cr',
  expiring: 'e',
  goods: 'g',
  ancient_wonder: 'a',
  guardian: 'gu',
  portal: 'po',
  academy: 'ac',
  main_building: 'mb',
  military: 'm',
  armory: 'ar',
  premium_production: 'pp',
  production: 'p',
  premium_residential: 'pr',
  residential: 'r',
  street: 's',
  trader: 't',
  worker_hut: 'wh',
};

function compress(goodsRenderConfig: GoodsBuilding[]): GoodsBuilding[] {
  return goodsRenderConfig.map((r) => ({
    t: compression[r.t],
    id: r.id,
    w: r.w,
    l: r.l,
  }));
}
