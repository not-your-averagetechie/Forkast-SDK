import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
const dotenv = require('dotenv');
dotenv.config();

const EVENT_API_URL = process.env.MAINNET_MARKET_API_URL;
const ORDER_BOOK_API_URL = process.env.ORDER_BOOK_API_URL || 'https://api.forkast.gg/api/v1/orderbook';
const MARKET_LIST_API_URL = process.env.MARKET_LIST_API_URL || 'https://api.forkast.gg/api/v1/markets';

console.log('🤖 Starting Forkast Market Making Bot...');
console.log(`EVENT_API_URL: ${EVENT_API_URL}`);
console.log(`ORDER_BOOK_API_URL: ${ORDER_BOOK_API_URL}`);
console.log(`MARKET_LIST_API_URL: ${MARKET_LIST_API_URL}`);

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

// --- Robust active market discovery (copied and improved from market-spread-checker) ---
async function httpGetJson(url: string, params?: any) {
    try {
        console.log(`📡 Fetching: ${url} with params:`, params);
        const res = await axios.get(url, { params });
        console.log(`✅ Success: ${url} returned ${JSON.stringify(res.data).length} chars`);
        return res.data;
    } catch (e: any) {
        console.error(`❌ GET ${url} failed: ${e.response?.status || ''} ${e.message}`);
        return null;
    }
}

function normalizeMarkets(payload: any): any[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.markets)) return payload.markets;
    if (Array.isArray(payload.data?.markets)) return payload.data.markets;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
}

function normalizeEvents(payload: any): any[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.events)) return payload.events;
    if (Array.isArray(payload.data?.events)) return payload.data.events;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
}

function uniqueById<T extends { id?: number | string }>(arr: T[]): T[] {
    const seen = new Set();
    const out: T[] = [];
    for (const it of arr) {
        const key = it?.id;
        if (key == null) continue;
        if (!seen.has(key)) {
            seen.add(key);
            out.push(it);
        }
    }
    return out;
}

function getApiBaseFromEventUrl(eventUrl: string): string {
    return eventUrl.replace(/\/market\/event.*$/i, '').replace(/\/$/, '');
}

async function tryMarketLists(): Promise<any[]> {
    console.log('🔍 Trying market list endpoints...');
    const base = getApiBaseFromEventUrl(EVENT_API_URL || '');
    const candidates: { url: string; params?: any }[] = [
        { url: MARKET_LIST_API_URL!, params: { status: 'active', limit: 30 } },
        { url: MARKET_LIST_API_URL!, params: { limit: 30 } },
        { url: `${base}/markets`, params: { status: 'active', limit: 30 } },
        { url: `${base}/markets`, params: { limit: 30 } },
        { url: `${base}/market/list`, params: { status: 'active', limit: 30 } },
        { url: `${base}/market/list`, params: { limit: 30 } },
    ].filter(c => !!c.url);

    for (const { url, params } of candidates) {
        const data = await httpGetJson(url, params);
        const markets = normalizeMarkets(data);
        if (markets.length) {
            console.log(`✅ Found ${markets.length} markets from ${url}`);
            return markets;
        }
    }
    console.log('❌ No markets found from market list endpoints');
    return [];
}

async function tryEventsAndFlattenMarkets(): Promise<any[]> {
    console.log('🔍 Trying event list endpoints and flattening markets...');
    const base = getApiBaseFromEventUrl(EVENT_API_URL || '');
    const eventListCandidates: { url: string; params?: any }[] = [
        { url: `${base}/market/event/list`, params: { status: 'active', limit: 30 } },
        { url: `${base}/event/list`, params: { status: 'active', limit: 30 } },
        { url: `${base}/events`, params: { status: 'active', limit: 30 } },
        { url: `${base}/events`, params: { limit: 30 } },
    ];

    let events: any[] = [];
    for (const { url, params } of eventListCandidates) {
        const data = await httpGetJson(url, params);
        const list = normalizeEvents(data);
        if (list.length) {
            console.log(`✅ Found ${list.length} events from ${url}`);
            events = list;
            break;
        }
    }

    if (!events.length) {
        console.log('🔍 Trying fallback event list without params...');
        const data = await httpGetJson(`${base}/event/list`);
        const list = normalizeEvents(data);
        if (list.length) {
            console.log(`✅ Found ${list.length} events from fallback`);
            events = list;
        }
    }

    if (!events.length) {
        console.warn('❌ No events returned from any list endpoint.');
        return [];
    }

    console.log(`🔄 Fetching markets for ${events.length} events...`);
    const markets: any[] = [];
    for (const ev of events.slice(0, 30)) {
        const id = ev?.id;
        if (id == null) continue;
        const eventData = await httpGetJson(EVENT_API_URL!, { id });
        const ms = normalizeMarkets(eventData);
        if (ms.length) {
            console.log(`✅ Event ${id} has ${ms.length} markets`);
            markets.push(...ms);
        }
    }
    console.log(`✅ Total markets collected: ${markets.length}`);
    return markets;
}

// Replace fetchActiveMarkets with this version:

async function fetchActiveMarkets(): Promise<any[]> {
    console.log('🚀 Starting market discovery...');
    // Copy MMIL/Market Spread Checker mechanism: loop over market IDs and fetch each event
    console.log('🚀 Discovering active markets by looping over market IDs...');
    const latestMarketId = 600; // You may want to fetch this dynamically or configure
    const numToCheck = 30;
    let marketsWithOutcomes: any[] = [];
    for (let marketId = latestMarketId; marketId > latestMarketId - numToCheck; marketId--) {
        try {
            const event = await httpGetJson(EVENT_API_URL!, { id: marketId });
            if (!event || !Array.isArray(event.markets) || event.markets.length === 0) continue;
            for (const market of event.markets) {
                if (Array.isArray(market.outcomes) && market.outcomes.length > 0) {
                    marketsWithOutcomes.push(market);
                }
            }
        } catch (e) {
            // Ignore errors for missing events/markets
        }
    }
    marketsWithOutcomes = uniqueById(marketsWithOutcomes).filter((m: any) => Array.isArray(m?.outcomes) && m.outcomes.length > 0);
    console.log(`📊 Markets with outcomes: ${marketsWithOutcomes.length}`);
    const activeLike = ['active', 'open', 'trading', 'live'];
    const filtered = marketsWithOutcomes.filter((m: any) => {
        const s = String(m?.status || '').toLowerCase();
        return !s || activeLike.includes(s);
    });
    if (!filtered.length) {
        console.warn(`⚠️ Fetched ${marketsWithOutcomes.length} markets but none passed active-like filter. Returning all with outcomes.`);
        return marketsWithOutcomes;
    }
    console.log(`✅ Active markets found: ${filtered.length}`);
    return filtered;
}
// ...existing code...
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
    console.log('🔄 Starting bot main loop...');
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    while (true) {
        try {
            console.log(`⏰ ${new Date().toISOString()} - Running bot cycle...`);
            const activeMarkets = await fetchActiveMarkets();
            if (!activeMarkets || activeMarkets.length === 0) {
                console.log('❌ No active markets found. Retrying in 5 minutes...');
                await new Promise(res => setTimeout(res, 5 * 60 * 1000));
                continue;
            }

            // Calculate confidence scores for all markets
            const marketReports: any[] = [];
            for (const market of activeMarkets) {
                if (!market.outcomes || market.outcomes.length === 0) continue;
                const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
                const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
                if (!yesOutcome || !noOutcome) continue;
                try {
                    const yesOrderBook = await fetchOrderBook(market.id, yesOutcome.id, yesOutcome.outcomeType || 0);
                    const noOrderBook = await fetchOrderBook(market.id, noOutcome.id, noOutcome.outcomeType || 0);
                    const yesStartPrice = parseFloat(yesOrderBook.bids[0]?.price || '0.5');
                    const yesCurrentPrice = parseFloat(yesOrderBook.asks[0]?.price || '0.5');
                    const noStartPrice = parseFloat(noOrderBook.bids[0]?.price || '0.5');
                    const noCurrentPrice = parseFloat(noOrderBook.asks[0]?.price || '0.5');
                    const yesSignal = getMomentumSignal(yesStartPrice, yesCurrentPrice);
                    const noSignal = getMomentumSignal(noStartPrice, noCurrentPrice);
                    const confidence = getConfidenceScore(market, Math.max(yesSignal.delta, noSignal.delta), parseFloat(market.volume || '0'));
                    let ordersToPlace: any[] = [];
                    let momentum = 'NONE';
                    if (yesSignal.strength) {
                        ordersToPlace = getOrderLevels(yesSignal.strength, confidence, 'YES', yesCurrentPrice);
                        momentum = 'YES';
                    } else if (noSignal.strength) {
                        ordersToPlace = getOrderLevels(noSignal.strength, confidence, 'NO', noCurrentPrice);
                        momentum = 'NO';
                    }
                    marketReports.push({
                        marketId: market.id,
                        marketTitle: market.title,
                        confidence,
                        momentum,
                        orders: ordersToPlace,
                        yesOutcome,
                        noOutcome
                    });
                } catch (err) {
                    // skip market on error
                }
            }

            // Sort markets by confidence descending
            marketReports.sort((a, b) => b.confidence - a.confidence);

            // Show full list of markets with confidence scores
            console.log('\n=== MARKET CONFIDENCE LIST ===');
            for (const report of marketReports) {
                console.log(`Market: ${report.marketTitle} (ID: ${report.marketId}) | Confidence: ${report.confidence}`);
            }

            // Interactive order placement
            for (const report of marketReports) {
                console.log(`\n--- Market: ${report.marketTitle} (ID: ${report.marketId}) ---`);
                console.log(`Confidence: ${report.confidence}`);
                console.log(`Momentum: ${report.momentum}`);
                if (report.orders.length === 0) {
                    console.log('No momentum orders to place.');
                    continue;
                }
                console.log('Orders to place:');
                for (const order of report.orders) {
                    console.log(`  Price: ${order.price.toFixed(2)} | Percent of capital: ${(order.percent * 100).toFixed(1)}%`);
                }
                // Prompt user for confirmation
                const answer = await new Promise(res => {
                    rl.question('Place these orders? (yes/no): ', (ans: string) => res(ans.trim().toLowerCase()));
                });
                if (answer === 'yes') {
                    // TODO: Place orders via API here (requires wallet integration)
                    console.log('✅ Orders would be placed here (API integration needed).');
                } else {
                    console.log('⏩ Skipping order placement for this market.');
                }
            }

            console.log(`💤 Sleeping for 5 minutes until next cycle...`);
            await new Promise(res => setTimeout(res, 5 * 60 * 1000));
        } catch (err) {
            console.error('❌ Bot error:', err.message);
            console.log(`💤 Sleeping for 1 minute before retry...`);
            await new Promise(res => setTimeout(res, 60 * 1000));
        }
    }
}

// Start the bot
// ...existing code...

// Start the bot
botLoop().catch(err => {
    console.error('💥 Fatal bot error:', err);
    process.exit(1);
}); // <-- Add this missing closing parenthesis and curly brace

// ...existing code...