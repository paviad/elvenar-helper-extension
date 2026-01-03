import { saveToStorage } from '../chrome/storage';
import { sendTomesQuery } from '../elvenar/sendTomesQuery';
import { sharedInfo } from './svc';

export function matchTomesUrl(details: {
  url: string;
  initiator?: string;
  originUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestBody?: any;
}) {
  const rewardSelectionKitMatcher = /^https:\/\/[a-z]+\.innogamescdn\.com\/frontend\/\/static\/[a-z]{2}_[A-Z]{2}\/xml\.balancing\.rewards\.reward_selection_kit\.RewardSelectionKit_[a-f0-9]{32}\.json$/;

  if (rewardSelectionKitMatcher.test(details.url)) {
    sharedInfo.reqReferrer = details.originUrl || details.initiator || 'https://en3.elvenar.com/';
    sharedInfo.reqUrl = details.url;
    // Add any additional logic here if needed
    async function Do() {
      const tomes = await sendTomesQuery(sharedInfo);
      await saveToStorage('tomes', JSON.stringify(tomes));
    }
    Do();
  }
}
