import { sendTradeParsedMessage } from '../chrome/messages';
import { AccountData } from '../elvenar/AccountManager';
import { TradeSummary } from '../model/tradeSummary';

export const tradeOpenedCallback = async (accountData: AccountData) => {
  if (!accountData.trades || !accountData.cityQuery) {
    return;
  }

  const trades = accountData.trades;
  const boostedGoods = accountData.cityQuery.boostedGoods;
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

  sendTradeParsedMessage(summary);
};
