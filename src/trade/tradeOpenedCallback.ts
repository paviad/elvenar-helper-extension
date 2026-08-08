import { sendTradeParsedMessage } from '../chrome/messages';
import { AccountData } from '../elvenar/Accounts';
import { TradeSummary } from '../model/tradeSummary';

/**
 * @param tabId The tab that asked for the trades. A stored account carries the tab id it was saved
 *   with, which is not necessarily the tab in front of the player now.
 */
export const tradeOpenedCallback = async (accountData: AccountData, tabId: number) => {
  if (!accountData.trades || !accountData.cityQuery) {
    return;
  }

  const trades = accountData.trades;
  const boostedGoods = accountData.cityQuery.boostedGoods;

  if (trades.some((trade) => trade.__class__ !== 'PlayerTradeVO')) {
    console.error('ElvenAssist: Unexpected trade data format', accountData);
    return;
  }

  const boostedTrades = trades.filter((trade) => boostedGoods.includes(trade.need.good_id));
  const boostedAscendedTrades = boostedTrades.filter((trade) => trade.need.good_id.startsWith('ascended'));
  const tradesOfferingNotBoostedGoods = boostedAscendedTrades.filter(
    (trade) => !boostedGoods.includes(trade.offer.good_id),
  );

  const summary: TradeSummary[] = tradesOfferingNotBoostedGoods.map((trade) => ({
    offer: trade.offer.good_id,
    need: trade.need.good_id,
    player: trade.trader.name,
  }));

  await sendTradeParsedMessage(tabId > 0 ? tabId : accountData.cityQuery.tabId, summary);
};
