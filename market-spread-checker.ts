import axios from 'axios';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
const dotenv = require('dotenv');
dotenv.config();

const EVENT_API_URL = process.env.MAINNET_MARKET_API_URL;
const ORDER_BOOK_API_URL = process.env.ORDER_BOOK_API_URL || 'https://api.forkast.gg/api/v1/orderbook';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function getUserInput(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer));
    });
}

async function fetchMarket(marketId: number) {
    // According to docs, this returns an event object with all markets
    const response = await axios.get(EVENT_API_URL, { params: { id: marketId } });
    return response.data;
}

async function fetchOrderBook(marketId: number, outcomeId: number, outcomeType: number) {
    // According to docs, this returns orderbook for a market/outcome
    const response = await axios.get(ORDER_BOOK_API_URL, {
        params: { marketId, outcomeId, outcomeType }
    });
    return response.data;
}

function getSpread(orderBook: any): number | null {
    if (!orderBook.asks || !orderBook.bids || orderBook.asks.length === 0 || orderBook.bids.length === 0) return null;
    const bestAsk = parseFloat(orderBook.asks[0].price);
    const bestBid = parseFloat(orderBook.bids[0].price);
    return bestAsk - bestBid;
}

// Helper to get event slug for market link (from docs: event.slug is the URL slug)
function getEventSlug(event: any): string {
    return event.slug || event.id;
}

// Helper to get market slug for direct market link (from docs: market.slug is the URL slug)
function getMarketSlug(market: any): string {
    return market.slug || market.id;
}

function saveLog(marketsWithWideSpread: any[], latestMarketId: number) {
    const logFolderPath = path.join(process.cwd(), 'market_spread_logs');
    if (!fs.existsSync(logFolderPath)) {
        fs.mkdirSync(logFolderPath, { recursive: true });
    }
    const now = new Date();
    const dateTimeString = now.toISOString().replace(/:/g, '-').replace(/\./g, '-').substring(0, 19);
    const logFilePath = path.join(logFolderPath, `spread_log_${latestMarketId}_${dateTimeString}.json`);
    fs.writeFileSync(logFilePath, JSON.stringify(marketsWithWideSpread, null, 2));
    console.log(`\n📝 Spread log saved: ${logFilePath}`);
}

async function main() {
    const latestMarketIdStr = await getUserInput('Enter latest market ID: ');
    const latestMarketId = parseInt(latestMarketIdStr.trim());
    if (isNaN(latestMarketId)) {
        console.error('Invalid market ID.');
        rl.close();
        return;
    }

    const marketsWithWideSpread: any[] = [];

    for (let marketId = latestMarketId; marketId > latestMarketId - 50; marketId--) {
        try {
            const event = await fetchMarket(marketId);
            if (!event.markets || event.markets.length === 0) continue;
            // Find the market with matching id (docs: event.markets is array)
            const market = event.markets.find((m: any) => m.id === marketId) || event.markets[0];
            // Use marketId for link, not market.slug
            const marketLink = `https://forkast.gg/market/${marketId}`;
            for (const outcome of market.outcomes) {
                const outcomeType = outcome.outcomeType || 0;
                try {
                    const orderBook = await fetchOrderBook(market.id, outcome.id, outcomeType);
                    const spread = getSpread(orderBook);
                    if (spread !== null && spread > 0.01) {
                        marketsWithWideSpread.push({
                            marketId: market.id,
                            marketTitle: market.title,
                            outcomeId: outcome.id,
                            outcomeTitle: outcome.title,
                            bestAsk: orderBook.asks[0].price,
                            bestBid: orderBook.bids[0].price,
                            spread: spread.toFixed(4),
                            link: marketLink
                        });
                    }
                } catch (e) {
                    // Ignore errors for missing orderbooks
                }
            }
        } catch (e) {
            // Ignore errors for missing markets
        }
    }

    if (marketsWithWideSpread.length === 0) {
        console.log('\n✅ All checked markets have spread <= 0.01');
    } else {
        console.log('\n⚠️ Markets with spread > 0.01:');
        for (const m of marketsWithWideSpread) {
            console.log(`Market: ${m.marketTitle} (ID: ${m.marketId}) | Outcome: ${m.outcomeTitle} (ID: ${m.outcomeId}) | Bid: ${m.bestBid} | Ask: ${m.bestAsk} | Spread: ${m.spread} | Link: ${m.link}`);
        }
        saveLog(marketsWithWideSpread, latestMarketId);
    }
    rl.close();
}

main();

