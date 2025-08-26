import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const EVENT_API_URL = process.env.MAINNET_MARKET_API_URL;
const ORDER_BOOK_API_URL = process.env.ORDER_BOOK_API_URL || 'https://api.forkast.gg/api/v1/orderbook';
const LATEST_MARKET_ID = parseInt(process.env.LATEST_MARKET_ID || '600');

async function fetchActiveMarkets() {
  const numToCheck = 30;
  let marketsWithOutcomes: any[] = [];
  for (let eventId = LATEST_MARKET_ID; eventId > LATEST_MARKET_ID - numToCheck; eventId--) {
    try {
      const eventRes = await axios.get(EVENT_API_URL!, { params: { id: eventId } });
      const event = eventRes.data;
      if (!event || !Array.isArray(event.markets) || event.markets.length === 0) continue;
      for (const market of event.markets) {
        if (Array.isArray(market.outcomes) && market.outcomes.length > 0) {
          marketsWithOutcomes.push(market);
        }
      }
    } catch (e) {}
  }
  return marketsWithOutcomes.filter((m: any) => Array.isArray(m?.outcomes) && m.outcomes.length > 0);
}

async function fetchOrderBook(marketId: number, outcomeId: number, outcomeType: number) {
  const response = await axios.get(ORDER_BOOK_API_URL, {
    params: { marketId, outcomeId, outcomeType }
  });
  return response.data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const activeMarkets = await fetchActiveMarkets();
    const opportunities: any[] = [];
    for (const market of activeMarkets) {
      if (!market.outcomes || market.outcomes.length === 0) continue;
      const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
      const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
      if (!yesOutcome || !noOutcome) continue;
      try {
        const yesOrderBook = await fetchOrderBook(market.id, yesOutcome.id, yesOutcome.outcomeType || 0);
        const noOrderBook = await fetchOrderBook(market.id, noOutcome.id, noOutcome.outcomeType || 0);
        const yesPrice = parseFloat(yesOrderBook.asks[0]?.price || '0.5');
        const noPrice = parseFloat(noOrderBook.asks[0]?.price || '0.5');
        const midPrice = parseFloat(((yesPrice + noPrice) / 2).toFixed(2));
        const noOrderPrice = parseFloat((1 - midPrice).toFixed(2));
        const spread = Math.abs(yesPrice - noPrice).toFixed(2);
        opportunities.push({
          marketId: market.id,
          marketTitle: market.title,
          yesPrice,
          noPrice,
          midPrice,
          noOrderPrice,
          spread,
          yesOutcome,
          noOutcome
        });
      } catch (err) {
        // skip market if order book fetch fails
      }
    }
    res.status(200).json({ opportunities });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
