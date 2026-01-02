import { saveToStorage } from '../chrome/storage';
import { sendItemsQuery } from '../elvenar/sendItemsQuery';
import { sharedInfo } from './svc';

export function matchItemsUrl(details: {
  url: string;
  initiator?: string;
  originUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestBody?: any;
}) {
  const itemsUrlMatcher = /^https:\/\/ox.*?\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.city\.Items_[a-f0-9]{32}\.json$/;

  if (itemsUrlMatcher.test(details.url)) {
    sharedInfo.reqReferrer = details.originUrl || details.initiator || 'https://en3.elvenar.com/';
    sharedInfo.reqUrl = details.url;
    console.log('Items URL matched:', details.url);
    // Add any additional logic here if needed
    async function Do() {
      const items = await sendItemsQuery(sharedInfo);
      await saveToStorage('itemDefinitions', JSON.stringify(items));
    }
    Do();
  }
}
