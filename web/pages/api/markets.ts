
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only fetch max 30 markets, skip 429 errors and continue
    const latestMarketId = parseInt(process.env.LATEST_MARKET_ID || '600');
    const numToCheck = 75; // Check last 75 events for markets
    let allMarkets: any[] = [];
    for (let eventId = latestMarketId; eventId > latestMarketId - numToCheck && allMarkets.length < 30; eventId--) {
      try {
        const eventRes = await axios.get(process.env.MAINNET_MARKET_API_URL!, { params: { id: eventId } });
        const event = eventRes.data;
        if (event && Array.isArray(event.markets) && event.markets.length > 0) {
          for (const m of event.markets) {
            if (allMarkets.length < 30) {
              allMarkets.push(m);
            } else {
              break;
            }
          }
        }
      } catch (e: any) {
        // Skip 429 errors and continue
        if (e?.response?.status === 429) {
          continue;
        }
        // Ignore other errors for missing events
      }
    }
    res.status(200).json({ markets: allMarkets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
