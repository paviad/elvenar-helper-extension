import { ExtensionSharedInfo } from '../model/extensionSharedInfo';
import { Trade } from '../model/trade';
import { getAccountBySessionId } from './AccountManager';

// eslint-disable-next-line @typescript-eslint/require-await
export async function processTradeData(untypedJson: unknown, sharedInfo: ExtensionSharedInfo) {
  const json = untypedJson as [{ responseData: Trade[] }];

  const accountData = getAccountBySessionId(sharedInfo.sessionId);

  if (accountData) {
    accountData.trades = json[0].responseData;

    if (accountData.trades.some((r) => r.__class__ !== 'PlayerTradeVO')) {
      console.error('ElvenAssist: Unexpected trade data format', accountData);
    }
  }
}
