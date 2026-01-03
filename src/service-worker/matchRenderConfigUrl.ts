import { saveToStorage } from '../chrome/storage';
import { sendRenderConfigQuery } from '../elvenar/sendRenderConfigQuery';
import { sharedInfo } from './svc';

export function matchRenderConfigUrl(details: {
  url: string;
  initiator?: string;
  originUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestBody?: any;
}) {
  const renderConfigMatcher = /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/assets\/renderconfigdata-[a-f0-9]{32}\.json$/;

  if (renderConfigMatcher.test(details.url)) {
    sharedInfo.reqReferrer = details.originUrl || details.initiator || 'https://en3.elvenar.com/';
    sharedInfo.reqUrl = details.url;
    // Add any additional logic here if needed
    async function Do() {
      const { goodsRenderConfig, maxLevels } = await sendRenderConfigQuery(sharedInfo);
      await saveToStorage('goodsRenderConfig', JSON.stringify(goodsRenderConfig));
      await saveToStorage('maxLevels', JSON.stringify(maxLevels));
    }
    Do();
  }
}
