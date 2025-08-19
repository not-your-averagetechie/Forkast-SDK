import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
const dotenv = require('dotenv');
dotenv.config();

const EVENT_API_URL = process.env.MAINNET_MARKET_API_URL;
const ORDER_BOOK_API_URL = process.env.ORDER_BOOK_API_URL || 'https://api.forkast.gg/api/v1/orderbook';
const MARKET_LIST_API_URL = process.env.MARKET_LIST_API_URL || 'https://api.forkast.gg/api/v1/markets';

const BOT_LOG_FOLDER = path.join(process.cwd(), 'market_making_bot_logs');
if (!fs.existsSync(BOT_LOG_FOLDER)) {
    fs.mkdirSync(BOT_LOG_FOLDER, { recursive: true });
}

interface BotConfig {
    maxActiveMarkets: number;
    maxLossPercent: number;
    maxSingleMarketLoss: number;
    momentumThresholds: { weak: number; medium: number; strong: number };
    riskReduction: { '7d': number; '3d': number; '1d': number };
}

const config: BotConfig = {
    maxActiveMarkets: 5,
    maxLossPercent: 3,
    maxSingleMarketLoss: 20,
    momentumThresholds: { weak: 0.05, medium: 0.10, strong: 0.15 },
    riskReduction: { '7d': 0, '3d': 0.15, '1d': 0.3 }
};

async function fetchActiveMarkets(): Promise<any[]> {
    // Try market list API first
    try {
        const response = await axios.get(MARKET_LIST_API_URL, { params: { status: 'active', limit: 100 } });
        if (response.data && Array.isArray(response.data.markets) && response.data.markets.length > 0) {
            return response.data.markets;
        }
    } catch (e) {
        console.error('Error fetching MARKET_LIST_API_URL:', e.message);
    }
    // Fallback: Try fetching recent events and flatten markets
    try {
        // Use /event/list endpoint as per docs: https://app.archbee.com/docs/noCzhe7OagnxqmAtmwyur/443T170ZqrEJz1k1cx82F
        // The correct endpoint is likely /api/v1/event/list
        const eventListUrl = EVENT_API_URL.replace(/\/market\/event$/, '/event/list');
        const eventsListResponse = await axios.get(eventListUrl, { params: { status: 'active', limit: 20 } });
        let eventIds: number[] = [];
        if (eventsListResponse.data && Array.isArray(eventsListResponse.data.events)) {
            eventIds = eventsListResponse.data.events.map((ev: any) => ev.id);
        }
        let allMarkets: any[] = [];
        for (const eventId of eventIds) {
            try {
                // Fetch event details for each eventId
                const eventResponse = await axios.get(EVENT_API_URL, { params: { id: eventId } });
                if (eventResponse.data && Array.isArray(eventResponse.data.markets)) {
                    // Only include markets with outcomes
                    const validMarkets = eventResponse.data.markets.filter((m: any) => Array.isArray(m.outcomes) && m.outcomes.length > 0);
                    allMarkets = allMarkets.concat(validMarkets);
                }
            } catch (e) {
                console.error(`Error fetching event ${eventId}:`, e.message);
            }
        }
        return allMarkets;
    } catch (e) {
        console.error('Error fetching event/list:', e.message);
    }
    return [];
}

async function fetchOrderBook(marketId: number, outcomeId: number, outcomeType: number) {
    const response = await axios.get(ORDER_BOOK_API_URL, {
        params: { marketId, outcomeId, outcomeType }
    });
    return response.data;
}

function getMomentumSignal(startPrice: number, currentPrice: number): { type: 'YES' | 'NO', strength: 'weak' | 'medium' | 'strong' | null, delta: number } {
    const delta = Math.abs(currentPrice - startPrice);
    if (delta >= config.momentumThresholds.strong) return { type: currentPrice > startPrice ? 'YES' : 'NO', strength: 'strong', delta };
    if (delta >= config.momentumThresholds.medium) return { type: currentPrice > startPrice ? 'YES' : 'NO', strength: 'medium', delta };
    if (delta >= config.momentumThresholds.weak) return { type: currentPrice > startPrice ? 'YES' : 'NO', strength: 'weak', delta };
    return { type: currentPrice > startPrice ? 'YES' : 'NO', strength: null, delta };
}

function getConfidenceScore(market: any, priceDelta: number, volume: number): number {
    // Example scoring: price movement + volume + market type
    let score = 0;
    score += Math.min(priceDelta * 100, 50); // up to 50
    score += Math.min(volume / 1000, 30); // up to 30
    // Add more factors as needed
    return Math.min(score, 100);
}

function getOrderLevels(signal: 'strong' | 'medium' | 'weak', confidence: number, side: 'YES' | 'NO', basePrice: number): { price: number, percent: number }[] {
    // Example: more levels for higher confidence
    let levels: number[] = [];
    if (signal === 'strong') levels = [0.01, 0.05, 0.10, 0.15, 0.20];
    else if (signal === 'medium') levels = [0.01, 0.05, 0.10];
    else if (signal === 'weak') levels = [0.01, 0.05];
    // Adjust for side
    return levels.map(l => ({
        price: side === 'YES' ? basePrice + l : basePrice - l,
        percent: confidence > 90 ? 0.2 : confidence > 70 ? 0.15 : 0.1
    }));
}

function logBotOperation(data: any) {
    const now = new Date();
    const dateTimeString = now.toISOString().replace(/:/g, '-').replace(/\./g, '-').substring(0, 19);
    const logFilePath = path.join(BOT_LOG_FOLDER, `bot_log_${dateTimeString}.json`);
    fs.writeFileSync(logFilePath, JSON.stringify(data, null, 2));
    console.log(`📝 Bot log saved: ${logFilePath}`);

    // Print summary to console for each market
    for (const entry of data) {
        console.log(`Market: ${entry.marketTitle} (ID: ${entry.marketId})`);
        console.log(`  Momentum: ${entry.momentum}`);
        console.log(`  Confidence: ${entry.confidence}`);
        if (entry.orders.length > 0) {
            console.log(`  Orders to place:`);
            for (const order of entry.orders) {
                console.log(`    Price: ${order.price.toFixed(2)} | Percent of capital: ${(order.percent * 100).toFixed(1)}%`);
            }
        } else {
            console.log('  No momentum orders placed.');
        }
        console.log('---');
    }
}

async function botLoop() {
    while (true) {
        try {
            const activeMarkets = await fetchActiveMarkets();
            if (!activeMarkets || activeMarkets.length === 0) {
                console.log('No active markets found. Retrying in 5 minutes...');
                await new Promise(res => setTimeout(res, 5 * 60 * 1000));
                continue;
            }
            const botReport: any[] = [];
            for (const market of activeMarkets.slice(0, config.maxActiveMarkets)) {
                if (!market.outcomes || market.outcomes.length === 0) continue; // Ensure outcomes exist
                // Assume market.outcomes[0] is YES, [1] is NO
                const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
                const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
                if (!yesOutcome || !noOutcome) continue;

                // Get order book and prices
                const yesOrderBook = await fetchOrderBook(market.id, yesOutcome.id, yesOutcome.outcomeType || 0);
                const noOrderBook = await fetchOrderBook(market.id, noOutcome.id, noOutcome.outcomeType || 0);

                const yesStartPrice = parseFloat(yesOrderBook.bids[0]?.price || '0.5');
                const yesCurrentPrice = parseFloat(yesOrderBook.asks[0]?.price || '0.5');
                const noStartPrice = parseFloat(noOrderBook.bids[0]?.price || '0.5');
                const noCurrentPrice = parseFloat(noOrderBook.asks[0]?.price || '0.5');

                // Detect momentum
                const yesSignal = getMomentumSignal(yesStartPrice, yesCurrentPrice);
                const noSignal = getMomentumSignal(noStartPrice, noCurrentPrice);

                // Confidence scoring
                const confidence = getConfidenceScore(market, Math.max(yesSignal.delta, noSignal.delta), parseFloat(market.volume || '0'));

                // Decide which side to place orders
                let ordersToPlace: any[] = [];
                if (yesSignal.strength) {
                    ordersToPlace = getOrderLevels(yesSignal.strength, confidence, 'YES', yesCurrentPrice);
                } else if (noSignal.strength) {
                    ordersToPlace = getOrderLevels(noSignal.strength, confidence, 'NO', noCurrentPrice);
                }

                botReport.push({
                    marketId: market.id,
                    marketTitle: market.title,
                    momentum: yesSignal.strength ? 'YES' : noSignal.strength ? 'NO' : 'NONE',
                    confidence,
                    orders: ordersToPlace
                });

                // TODO: Place orders via API here (requires wallet integration)
            }

            logBotOperation(botReport);
            await new Promise(res => setTimeout(res, 5 * 60 * 1000));
        } catch (err) {
            console.error('Bot error:', err.message);
            await new Promise(res => setTimeout(res, 60 * 1000));
        }
    }
}

botLoop();


