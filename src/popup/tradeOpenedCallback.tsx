import { sendTradeParsedMessage } from '../chrome/messages';
import { getBoostedGoods } from '../elvenar/sendCityDataQuery';
import { sendTradeQuery, getTradeItems } from '../elvenar/sendTradeQuery';
import { Trade } from '../model/trade';
import { TradeSummary } from '../model/tradeSummary';

export const tradeOpenedCallback = async () => {
  await sendTradeQuery(true);
  const trades = getTradeItems();
  const boostedGoods = await getBoostedGoods();
  const boostedTrades = trades.filter((trade) => boostedGoods.includes(trade.need.good_id));
  const boostedAscendedTrades = boostedTrades.filter((trade) => trade.need.good_id.startsWith('ascended'));
  const tradesOfferingNotBoostedGoods = boostedAscendedTrades.filter(
    (trade) => !boostedGoods.includes(trade.offer.good_id)
  );
  const byGoodId = tradesOfferingNotBoostedGoods.reduce((acc, trade) => {
    if (!acc[trade.need.good_id]) {
      acc[trade.need.good_id] = [];
    }
    acc[trade.need.good_id].push(trade);
    return acc;
  }, {} as Record<string, Trade[]>);

  const goodNames: Record<string, string> = {
    ascendedmarble: 'Primordial Minerals',
    ascendedsteel: 'Ignited Ingots',
    ascendedplanks: 'Scholarly Sprouts',
    ascendedcrystal: 'Ethereal Aerosols',
    ascendedscrolls: 'Wonder Wax',
    ascendedsilk: 'Finest Flying Powder',
    ascendedelixir: 'Spicy Spread',
    ascendedmagic_dust: 'Genius Granule',
    ascendedgems: 'Marvellous Marbles',
  };

  const summary: TradeSummary[] = tradesOfferingNotBoostedGoods.map((trade) => ({
    offer: trade.offer.good_id,
    need: trade.need.good_id,
    player: trade.trader.name,
  }));

  sendTradeParsedMessage(summary);
};
