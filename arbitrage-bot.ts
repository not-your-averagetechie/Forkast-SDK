
// Scrape and list all markets
async function fetchAllMarkets() {
    let allMarkets = [];
    const latestMarketId = parseInt(process.env.LATEST_MARKET_ID || '600');
    const numToCheck = 50; // Fetch last 50 events only
    for (let eventId = latestMarketId; eventId > latestMarketId - numToCheck; eventId--) {
        try {
            const event = await httpGetJson(EVENT_API_URL, { id: eventId });
            if (event && Array.isArray(event.markets) && event.markets.length > 0) {
                allMarkets.push(...event.markets);
            }
        } catch (e) {
            // Ignore errors for missing events
        }
    }
    return allMarkets;
}
// Scrape last 300 orders from backend
async function fetchLastOrders(limit = 300) {
    try {
        const response = await axios.get(process.env.MAINNET_ORDER_API_URL, {
            params: { limit }
        });
        return response.data.orders || response.data || [];
    } catch (e) {
        console.error('❌ Failed to fetch last orders:', e.message);
        return [];
    }
}

import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const EVENT_API_URL = process.env.MAINNET_MARKET_API_URL;
const ORDER_BOOK_API_URL = process.env.ORDER_BOOK_API_URL || 'https://api.forkast.gg/api/v1/orderbook';

const WALLET3_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY_3;
const WALLET4_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY_4;
const WALLET3_ADDRESS = process.env.MAINNET_WALLET_ADDRESS_3;
const WALLET4_ADDRESS = process.env.MAINNET_WALLET_ADDRESS_4;
const WALLET3_PROXY = process.env.MAINNET_PROXY_WALLET_3;
const WALLET4_PROXY = process.env.MAINNET_PROXY_WALLET_4;
const LOGIN_API_URL = process.env.MAINNET_ACCOUNT_API_URL;

if (!WALLET3_PRIVATE_KEY || !WALLET4_PRIVATE_KEY || !WALLET3_ADDRESS || !WALLET4_ADDRESS || !WALLET3_PROXY || !WALLET4_PROXY) {
    throw new Error('MAINNET_PRIVATE_KEY_3, MAINNET_PRIVATE_KEY_4, MAINNET_WALLET_ADDRESS_3, MAINNET_WALLET_ADDRESS_4, MAINNET_PROXY_WALLET_3, and MAINNET_PROXY_WALLET_4 must be set in .env');
}

async function loginAndGetAccessToken(privateKey: string): Promise<string> {
    let retries = 0;
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second
    while (retries < maxRetries) {
        try {
            const response = await axios.get(LOGIN_API_URL, { params: { privateKey } });
            return response.data.accessToken;
        } catch (e: any) {
            if (e?.response?.status === 429) {
                const delay = baseDelay * Math.pow(2, retries);
                console.error(`❌ Login rate limited (429). Retrying in ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
                retries++;
            } else {
                console.error('❌ Login failed:', e.message);
                throw e;
            }
        }
    }
    throw new Error('Failed to login after multiple retries due to rate limiting.');
}


function getAccount(address: string, privateKey: string, proxy: string, accessToken: string) {
    return {
        wallet: address,
        private_key: privateKey,
        proxy_wallet: proxy,
        accessToken
    };
}

async function httpGetJson(url: string, params?: any) {
    try {
        const res = await axios.get(url, { params });
        return res.data;
    } catch (e: any) {
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

async function fetchActiveMarkets(): Promise<any[]> {
    const latestMarketId = parseInt(process.env.LATEST_MARKET_ID || '600');
    const numToCheck = 30;
    let marketsWithOutcomes: any[] = [];
    for (let eventId = latestMarketId; eventId > latestMarketId - numToCheck; eventId--) {
        try {
            const event = await httpGetJson(EVENT_API_URL!, { id: eventId });
            if (!event || !Array.isArray(event.markets) || event.markets.length === 0) continue;
            for (const market of event.markets) {
                if (Array.isArray(market.outcomes) && market.outcomes.length > 0) {
                    marketsWithOutcomes.push(market);
                }
            }
        } catch (e) {}
    }
    marketsWithOutcomes = uniqueById(marketsWithOutcomes).filter((m: any) => Array.isArray(m?.outcomes) && m.outcomes.length > 0);
    const activeLike = ['active', 'open', 'trading', 'live'];
    const filtered = marketsWithOutcomes.filter((m: any) => {
        const s = String(m?.status || '').toLowerCase();
        return !s || activeLike.includes(s);
    });
    if (!filtered.length) {
        return marketsWithOutcomes;
    }
    return filtered;
}

async function fetchOrderBook(marketId: number, outcomeId: number, outcomeType: number) {
    const response = await axios.get(ORDER_BOOK_API_URL, {
        params: { marketId, outcomeId, outcomeType }
    });
    return response.data;
}

async function placeOrder(orderBody: any) {
    try {
        const response = await axios.post(process.env.MAINNET_ORDER_API_URL, orderBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${orderBody.accessToken}`
            }
        });
        console.log(`✅ Order placed: ${JSON.stringify(orderBody)}`);
        return response.data;
    } catch (e) {
        console.error('❌ Failed to place order:', e.message);
        return { success: false };
    }
}

async function arbitrageBot() {
    // Login both accounts
    // Do not login once at the start; login before each order for fresh tokens
    // Remove initial declarations of wallet3AccessToken, wallet4AccessToken, wallet3Account, wallet4Account

    // Scrape last 300 orders before placing new ones
    const lastOrders = await fetchLastOrders(300);
    console.log(`Fetched ${lastOrders.length} recent orders.`);

    // Scrape and list all markets
    const allMarkets = await fetchAllMarkets();
    console.log(`\nAll Markets (${allMarkets.length}):`);
    allMarkets.forEach(m => {
        console.log(`Market ID: ${m.id} | Title: ${m.title} | Status: ${m.status}`);
    });

    const activeMarkets = await fetchActiveMarkets();
    if (!activeMarkets || activeMarkets.length === 0) {
        console.log('❌ No active markets found.');
        return;
    }
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
            const tradeAmount = 20;
            console.log('\n--- Market: ' + market.title + ' (ID: ' + market.id + ') ---');
            console.log('Current YES price: ' + yesPrice);
            console.log('Current NO price:  ' + noPrice);
            console.log('Spread: ' + spread);
            console.log('Middle price: ' + midPrice);

            // Example: filter out markets/orders if already present in lastOrders
            const marketOrders = lastOrders.filter(o => o.marketId === market.id);
            if (marketOrders.length > 0) {
                console.log(`Skipping market ${market.id} (already has ${marketOrders.length} recent orders)`);
                continue;
            }

            // Automatically place arbitrage orders
            const wallet3AccessToken = await loginAndGetAccessToken(WALLET3_PRIVATE_KEY);
            const wallet3Account = getAccount(WALLET3_ADDRESS, WALLET3_PRIVATE_KEY, WALLET3_PROXY, wallet3AccessToken);
            console.log('Wallet 3 (' + wallet3Account.wallet + ') will BUY YES: ' + tradeAmount + ' shares at ' + midPrice);
            const yesOrderBody = {
                marketId: market.id,
                token: yesOutcome,
                account: wallet3Account,
                price: midPrice,
                amount: tradeAmount,
                side: 0, // 0 for buy
                accessToken: wallet3Account.accessToken
            };
            await placeOrder(yesOrderBody);

            const wallet4AccessToken = await loginAndGetAccessToken(WALLET4_PRIVATE_KEY);
            const wallet4Account = getAccount(WALLET4_ADDRESS, WALLET4_PRIVATE_KEY, WALLET4_PROXY, wallet4AccessToken);
            console.log('Wallet 4 (' + wallet4Account.wallet + ') will BUY NO:  ' + tradeAmount + ' shares at ' + noOrderPrice);
            const noOrderBody = {
                marketId: market.id,
                token: noOutcome,
                account: wallet4Account,
                price: noOrderPrice,
                amount: tradeAmount,
                side: 0, // 0 for buy
                accessToken: wallet4Account.accessToken
            };
            await placeOrder(noOrderBody);
            console.log('✅ Arbitrage trade executed: YES at ' + midPrice + ', NO at ' + noOrderPrice + ' for ' + tradeAmount + ' shares each.');
            // Wait 10 seconds before processing the next market
            await new Promise(res => setTimeout(res, 10000));
        } catch (err) {
            console.log('❌ Error processing market ' + market.id + ': ' + err.message);
        }
    }
}

arbitrageBot().catch(console.error);
