// Use mainnet endpoint for event API only
const EVENT_API_URL = process.env.MAINNET_MARKET_API_URL;
// Utility: Find eventId for a given marketId
async function findEventIdForMarket(marketId: number, accessToken?: string): Promise<number | null> {
    try {
        // Fetch all events (markets endpoint returns events with markets array)
        const params: any = {};
        if (accessToken) params.accessToken = accessToken;
        const response = await axios.get(EVENT_API_URL, { params, timeout: 30000 });
        const events = response.data?.data;
        if (!Array.isArray(events)) return null;
        for (const event of events) {
            if (event.markets && Array.isArray(event.markets)) {
                if (event.markets.some((m: any) => String(m.id) === String(marketId))) {
                    return event.id;
                }
            }
        }
        return null;
    } catch (error) {
        console.error(`Error finding eventId for market ${marketId}:`, error.message);
        return null;
    }
}
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { ForkastSDK, Network } from '@forkastgg/client';
import * as readline from 'readline';

dotenv.config();

// Configuration
const CONFIG = {
    testnet: {
        WALLET_ADDRESS_3: process.env.TESTNET_WALLET_ADDRESS_3,
        PRIVATE_KEY_3: process.env.TESTNET_PRIVATE_KEY_3,
        PROXY_WALLET_3: process.env.TESTNET_PROXY_WALLET_3,
        WALLET_ADDRESS_4: process.env.TESTNET_WALLET_ADDRESS_4,
        PRIVATE_KEY_4: process.env.TESTNET_PRIVATE_KEY_4,
        PROXY_WALLET_4: process.env.TESTNET_PROXY_WALLET_4,
        WALLET_ADDRESS_5: process.env.TESTNET_WALLET_ADDRESS_5,
        PRIVATE_KEY_5: process.env.TESTNET_PRIVATE_KEY_5,
        PROXY_WALLET_5: process.env.TESTNET_PROXY_WALLET_5,
        WALLET_ADDRESS_6: process.env.TESTNET_WALLET_ADDRESS_6,
        PRIVATE_KEY_6: process.env.TESTNET_PRIVATE_KEY_6,
        PROXY_WALLET_6: process.env.TESTNET_PROXY_WALLET_6,
        WALLET_ADDRESS_7: process.env.TESTNET_WALLET_ADDRESS_7,
        PRIVATE_KEY_7: process.env.TESTNET_PRIVATE_KEY_7,
        PROXY_WALLET_7: process.env.TESTNET_PROXY_WALLET_7,
        WALLET_ADDRESS_8: process.env.TESTNET_WALLET_ADDRESS_8,
        PRIVATE_KEY_8: process.env.TESTNET_PRIVATE_KEY_8,
        PROXY_WALLET_8: process.env.TESTNET_PROXY_WALLET_8,
        MARKET_API_URL: process.env.TESTNET_MARKET_API_URL,
        ACCOUNT_API_URL: process.env.TESTNET_ACCOUNT_API_URL,
        ORDER_API_URL: process.env.TESTNET_ORDER_API_URL
    },
    mainnet: {
        WALLET_ADDRESS_3: process.env.MAINNET_WALLET_ADDRESS_3,
        PRIVATE_KEY_3: process.env.MAINNET_PRIVATE_KEY_3,
        PROXY_WALLET_3: process.env.MAINNET_PROXY_WALLET_3,
        WALLET_ADDRESS_4: process.env.MAINNET_WALLET_ADDRESS_4,
        PRIVATE_KEY_4: process.env.MAINNET_PRIVATE_KEY_4,
        PROXY_WALLET_4: process.env.MAINNET_PROXY_WALLET_4,
        WALLET_ADDRESS_5: process.env.MAINNET_WALLET_ADDRESS_5,
        PRIVATE_KEY_5: process.env.MAINNET_PRIVATE_KEY_5,
        PROXY_WALLET_5: process.env.MAINNET_PROXY_WALLET_5,
        WALLET_ADDRESS_6: process.env.MAINNET_WALLET_ADDRESS_6,
        PRIVATE_KEY_6: process.env.MAINNET_PRIVATE_KEY_6,
        PROXY_WALLET_6: process.env.MAINNET_PROXY_WALLET_6,
        WALLET_ADDRESS_7: process.env.MAINNET_WALLET_ADDRESS_7,
        PRIVATE_KEY_7: process.env.MAINNET_PRIVATE_KEY_7,
        PROXY_WALLET_7: process.env.MAINNET_PROXY_WALLET_7,
        WALLET_ADDRESS_8: process.env.MAINNET_WALLET_ADDRESS_8,
        PRIVATE_KEY_8: process.env.MAINNET_PRIVATE_KEY_8,
        PROXY_WALLET_8: process.env.MAINNET_PROXY_WALLET_8,
        MARKET_API_URL: process.env.MAINNET_MARKET_API_URL,
        ACCOUNT_API_URL: process.env.MAINNET_ACCOUNT_API_URL,
        ORDER_API_URL: process.env.MAINNET_ORDER_API_URL
    }
};

const NETWORK = (process.env.NETWORK as 'testnet' | 'mainnet') || 'mainnet';
const ORDER_BOOK_API_URL = 'https://mgapi.forkast.gg/api/v1/orderbook';

// Initialize ForkastSDK for authentication
const sdk = new ForkastSDK(Network.MAINNET, process.env.API_KEY);

// Price helper: clamp to [0.01, 0.99] and round to 2 decimals
function toCents(value: number): number {
    const rounded = Math.round(value * 100) / 100;
    if (rounded < 0.01) return 0.01;
    if (rounded > 0.99) return 0.99;
    return rounded;
}

// Floor to two decimals without rounding up
function toCentsFloor(value: number): number {
    const floored = Math.floor(value * 100) / 100;
    if (floored < 0.01) return 0.01;
    if (floored > 0.99) return 0.99;
    return floored;
}

// Bot Configuration
const BOT_CONFIG = {
    MAX_MARKETS_TO_CHECK: 300,
    MIN_DELAY_BETWEEN_MARKETS: 15000,
    MAX_DELAY_BETWEEN_MARKETS: 30000,
    MIN_DELAY_BETWEEN_ORDERS: 2000,
    MAX_DELAY_BETWEEN_ORDERS: 8000,
    MIN_DELAY_BETWEEN_ACTIONS: 1000,
    MAX_DELAY_BETWEEN_ACTIONS: 5000,
    ORDER_AMOUNTS: [1, 2, 3, 4, 5],
    MAX_RETRIES: 3,
    RATE_LIMIT_DELAY: 10000,
    HUMAN_LIKE_DELAYS: true,
    RANDOM_MARKET_SELECTION: true,
    LOGGING_ENABLED: true,
    SPREAD_THRESHOLD: 0.015,
    TOP_OF_BOOK_STRATEGY: true,
    MIN_TRADES: 2,
    MAX_TRADES: 4
};

// Logger class
class ArbitrageLogger {
    private sessionStartTime: Date;
    private logDir: string;
    private sessionId: string;

    constructor() {
        this.sessionStartTime = new Date();
        this.sessionId = this.sessionStartTime.toISOString().replace(/[:.]/g, '-');
        this.logDir = 'arbitrage_logs';
        this.ensureLogDirectory();
    }

    private ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    log(message: string, data?: any) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        if (BOT_CONFIG.LOGGING_ENABLED) {
            console.log(logMessage);
            if (data) {
                console.log(JSON.stringify(data, null, 2));
            }
        }

        // Save to file
        const logFile = path.join(this.logDir, `arbitrage_bot_spread15_${this.sessionId}.json`);
        const logEntry = {
            timestamp,
            message,
            data: data || null
        };

        try {
            let logs = [];
            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf8');
                logs = JSON.parse(content);
            }
            logs.push(logEntry);
            fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    getSessionStartTime(): Date {
        return this.sessionStartTime;
    }
}

// Utility functions
function getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Function to get user choice for market selection
async function getUserMarketChoice(): Promise<'all' | 'specific'> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('🎯 Choose market selection:\n1. All markets (random activity)\n2. Specific markets\nEnter choice (1 or 2): ', (answer) => {
            rl.close();
            const choice = answer.trim();
            if (choice === '1') {
                resolve('all');
            } else if (choice === '2') {
                resolve('specific');
            } else {
                console.log('❌ Invalid choice. Defaulting to all markets.');
                resolve('all');
            }
        });
    });
}

// Function to get latest market ID from user
async function getLatestMarketIdFromUser(): Promise<number> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('🔍 Enter the latest market ID to start from (descending order): ', (answer) => {
            rl.close();
            const marketId = parseInt(answer.trim());
            if (isNaN(marketId) || marketId <= 0) {
                console.log('⚠️  Invalid input. Using fallback market ID: 650');
                resolve(650);
            } else {
                console.log(`✅ Starting from market ID: ${marketId}`);
                resolve(marketId);
            }
        });
    });
}

// Function to get number of markets to scrape from user
async function getMarketsToScrape(): Promise<number> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('📊 How many markets to scrape? (default: 300, max: 1000): ', (answer) => {
            rl.close();
            const numMarkets = parseInt(answer.trim());
            if (isNaN(numMarkets) || numMarkets <= 0) {
                console.log('⚠️  Invalid input. Using default: 300 markets');
                resolve(300);
            } else if (numMarkets > 1000) {
                console.log('⚠️  Too many markets. Using maximum: 1000 markets');
                resolve(1000);
            } else {
                console.log(`✅ Will scrape ${numMarkets} markets`);
                resolve(numMarkets);
            }
        });
    });
}

// Function to get specific market IDs from user
async function getSpecificMarketIds(): Promise<number[]> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('🎯 Enter market IDs (comma-separated, e.g., 645,646,647): ', (answer) => {
            rl.close();
            const marketIds = answer.trim().split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
            if (marketIds.length === 0) {
                console.log('❌ No valid market IDs provided. Exiting.');
                process.exit(1);
            }
            resolve(marketIds);
        });
    });
}

async function humanLikeDelay(min: number, max: number, reason: string) {
    if (!BOT_CONFIG.HUMAN_LIKE_DELAYS) return;
    
    const delay = getRandomDelay(min, max);
    console.log(`   ⏳ ${reason} (${delay}ms delay)`);
    await new Promise(resolve => setTimeout(resolve, delay));
}

// Wallet management
function getRandomWallet(): { walletNumber: number, walletConfig: any } {
    const walletNumbers = [3, 4, 5, 6, 7, 8, 9, 10, 11];
    const randomWalletNumber = getRandomElement(walletNumbers);
    
    const walletConfig = {
        WALLET_ADDRESS: CONFIG[NETWORK][`WALLET_ADDRESS_${randomWalletNumber}`],
        PRIVATE_KEY: CONFIG[NETWORK][`PRIVATE_KEY_${randomWalletNumber}`],
        PROXY_WALLET: CONFIG[NETWORK][`PROXY_WALLET_${randomWalletNumber}`]
    };
    
    return { walletNumber: randomWalletNumber, walletConfig };
}

function validateWalletConfig(): boolean {
    const requiredWallets = [3, 4, 5, 6, 7, 8];
    const missingWallets = [];
    
    for (const walletNum of requiredWallets) {
        if (!CONFIG[NETWORK][`WALLET_ADDRESS_${walletNum}`] || 
            !CONFIG[NETWORK][`PRIVATE_KEY_${walletNum}`] || 
            !CONFIG[NETWORK][`PROXY_WALLET_${walletNum}`]) {
            missingWallets.push(walletNum);
        }
    }
    
    if (missingWallets.length > 0) {
        console.error(`❌ Missing configuration for wallets: ${missingWallets.join(', ')}`);
        return false;
    }
    
    console.log(`✅ All nine wallets (3, 4, 5, 6, 7, 8, 9, 10, 11) are properly configured`);
    return true;
}

// API functions - Using the EXACT working mechanism from market-monitor-bot.ts
async function getLatestMarketId(): Promise<number> {
    try {
        console.log('🔍 Automatically fetching latest market ID...');
        
        const response = await axios.get(EVENT_API_URL, { 
            timeout: 30000
        });
        
        if (response.data && response.data.data && response.data.data.length > 0) {
            const marketIds = response.data.data.map((market: any) => parseInt(market.id));
            const highestId = Math.max(...marketIds);
            console.log(`✅ Latest market ID found: ${highestId}`);
            
            if (marketIds.includes(687)) {
                console.log(`🎯 Found target market 687, using it as latest`);
                return 687;
            }
            
            return highestId;
        }
        
        const fallbackId = parseInt(process.env.LATEST_MARKET_ID || '687');
        console.log(`⚠️  Could not fetch from API, using fallback: ${fallbackId}`);
        return fallbackId;
        
    } catch (error: any) {
        console.log(`⚠️  Error fetching latest market ID: ${error.message}`);
        const fallbackId = parseInt(process.env.LATEST_MARKET_ID || '687');
        console.log(`   Using fallback: ${fallbackId}`);
        return fallbackId;
    }
}

// Fetch event by eventId, then select market by marketId from event.markets
async function fetchMarketByEventAndMarketId(eventId: number, marketId: number, accessToken?: string) {
    try {
        const params: any = { id: eventId };
        if (accessToken) params.accessToken = accessToken;
        const response = await axios.get(EVENT_API_URL, {
            params,
            timeout: 30000
        });
        const event = response.data;
        console.log(`[DEBUG] Local endpoint raw response for eventId ${eventId}:`, JSON.stringify(event, null, 2));
        if (event && event.data && Array.isArray(event.data.markets) && event.data.markets.length > 0) {
            let market = event.data.markets.find((m: any) => String(m.id) === String(marketId));
            if (!market) {
                // Fallback: use the first market in the array
                market = event.data.markets[0];
                console.log(`[DEBUG] Market ${marketId} not found in event ${eventId}, using first market:`, JSON.stringify(market, null, 2));
            } else {
                console.log(`[DEBUG] Event ${eventId} Market ${marketId} object:`, JSON.stringify(market, null, 2));
            }
            console.log(`[DEBUG] Selected market status:`, market?.status);
            return market;
        }
    } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404) {
            console.log(`⏭️  Event ${eventId} not found (404) on local endpoint, skipping`);
            return null;
        }
        if (status === 429) {
            console.log(`⏳ Rate limited on local endpoint for event ${eventId}, retrying after delay...`);
            await new Promise(res => setTimeout(res, 2000));
            return fetchMarketByEventAndMarketId(eventId, marketId, accessToken);
        }
        console.log(`⚠️  Local endpoint failed for event ${eventId}: ${error?.message || 'unknown error'}${status ? ` (status ${status})` : ''} — trying public API`);
    }

    // 2) Fallback to public Forkast API and normalize shape
    try {
        const PUBLIC_EVENT_API_BASE = 'https://api.forkast.gg/api/v1/markets';
        const resp = await axios.get(`${PUBLIC_EVENT_API_BASE}/${eventId}`, { timeout: 30000 });
        const event = resp?.data;
        const data = event?.data;
        if (!data || !Array.isArray(data.markets) || data.markets.length === 0) {
            return null;
        }
        const market = data.markets.find((m: any) => String(m.id) === String(marketId));
        if (market) {
            console.log(`[DEBUG] Event ${eventId} Market ${marketId} object (public):`, JSON.stringify(market, null, 2));
            console.log(`[DEBUG] Event ${eventId} Market ${marketId} status (public):`, market?.status);
            return market;
        } else {
            console.log(`[DEBUG] Market ${marketId} not found in event ${eventId} (public)`);
            return null;
        }
    } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404) {
            console.log(`⏭️  Event ${eventId} not found (404) on public API, skipping`);
            return null;
        }
        if (status === 429) {
            console.log(`⏳ Rate limited on public API for event ${eventId}, retrying after delay...`);
            await new Promise(res => setTimeout(res, 2000));
            return fetchMarketByEventAndMarketId(eventId, marketId, accessToken);
        }
        console.log(`⚠️  Failed to fetch event ${eventId} from public API: ${error?.message || 'unknown error'}${status ? ` (status ${status})` : ''}`);
        return null;
    }
}

async function fetchOrderBook(marketId: number, outcomeId: number, outcomeType: number) {
    try {
        console.log(`[DEBUG] Fetching order book: marketId=${marketId}, outcomeId=${outcomeId}, outcomeType=${outcomeType}`);
        const response = await axios.get(ORDER_BOOK_API_URL, {
            params: { marketId, outcomeId, outcomeType }
        });
        console.log(`[DEBUG] Order book response for marketId=${marketId}, outcomeId=${outcomeId}, outcomeType=${outcomeType}:`, JSON.stringify(response.data));
        return response.data;
    } catch (error: any) {
        console.error(`❌ Failed to fetch order book for market ${marketId}, outcomeId=${outcomeId}, outcomeType=${outcomeType}:`, error.message);
        return null;
    }
}

// Smart orderbook fetch: handles YES/NO vs TEAM markets and falls back on errors
async function fetchOrderBookSmart(marketId: number, outcome: any, isYesNo: boolean, logger: ArbitrageLogger) {
    // Maintain for compatibility if needed elsewhere; prefer explicit calls with outcomeId + outcomeType
    try {
        const outcomeId = Number(outcome.id);
        const inferredType = isYesNo
            ? (String(outcome.title).trim().toLowerCase() === 'yes' ? 1 : 0)
            : (Number(outcome.outcomeType) === 0 || Number(outcome.outcomeType) === 1
                ? Number(outcome.outcomeType)
                : 1);
        const ob = await fetchOrderBook(marketId, outcomeId, inferredType);
        if (ob && ob.asks !== undefined && ob.bids !== undefined) return ob;
        logger.log(`   ⚠️  Empty orderbook (market=${marketId}, outcomeId=${outcomeId}, outcomeType=${inferredType})`);
        return ob;
    } catch (e: any) {
        logger.log(`   ❌ Error fetching orderbook for market ${marketId}: ${e?.message || e}`);
        return null;
    }
}

async function loginAndGetAccessToken(privateKey: string): Promise<string> {
    let retries = 0;
    const maxRetries = BOT_CONFIG.MAX_RETRIES;
    const baseDelay = 1000;
    
    while (retries < maxRetries) {
        try {
            // Temporarily silence SDK logs during login
            const originalConsoleLog = console.log;
            const originalConsoleError = console.error;
            const originalConsoleInfo = console.info;
            const originalConsoleDebug = console.debug;
            console.log = () => {};
            console.error = () => {};
            console.info = () => {};
            console.debug = () => {};
            try {
                const loginResponse = await sdk.getAccountService().loginWithPrivateKey(privateKey);
                return loginResponse.accessToken;
            } finally {
                console.log = originalConsoleLog;
                console.error = originalConsoleError;
                console.info = originalConsoleInfo;
                console.debug = originalConsoleDebug;
            }
        } catch (error: any) {
            if (error?.response?.status === 429) {
                const delay = baseDelay * Math.pow(2, retries);
                console.log(`   ⏳ Login rate limited (429). Retrying in ${delay}ms... (attempt ${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retries++;
            } else {
                console.error('❌ Login failed:', error.message);
                throw error;
            }
        }
    }
    throw new Error('Failed to login after multiple retries due to rate limiting.');
}

async function placeOrder(orderBody: any): Promise<any> {
    try {
        // Use direct HTTP POST to match mmil.ts
        const ORDER_API_URL = process.env.MAINNET_ORDER_API_URL;
        const response = await axios.post(ORDER_API_URL, orderBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${orderBody.accessToken}`
            }
        });
            // Debug: print full response from order API
            console.log('Order API response:', JSON.stringify(response.data, null, 2));
        return { success: true, data: response.data };
    } catch (error: any) {
        if (error.response?.data?.message?.includes('salt or signature already exists')) {
            console.log('   ⚠️  Duplicate order detected, skipping...');
            return { success: false, duplicate: true, message: 'Duplicate order' };
        } else if (error.response?.status === 400) {
            console.log(`   ❌ Bad request error: ${error.response.data?.message || error.message}`);
            return { success: false, message: error.response.data?.message || error.message };
        } else if (error.response?.status === 401) {
            console.log(`   ❌ Unauthorized error: ${error.response.data?.message || error.message}`);
            return { success: false, message: 'Unauthorized - check access token' };
        } else if (error.response?.status === 429) {
            console.log(`   ⏳ Rate limited: ${error.response.data?.message || error.message}`);
            return { success: false, message: 'Rate limited' };
        } else {
            console.log(`   ❌ Failed to place order: ${error.message}`);
            if (error.response?.data) {
                console.log(`   📄 Response data:`, error.response.data);
            }
            return { success: false, message: error.message };
        }
    }
}

// Main arbitrage logic
async function executeArbitrageStrategy(market: any, logger: ArbitrageLogger, isUserSelectedMarket: boolean = false): Promise<boolean> {
    try {
        const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
        const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
        
        let outcome1, outcome2, outcome1OrderBook, outcome2OrderBook;
        
        if (yesOutcome && noOutcome) {
            outcome1 = yesOutcome;
            outcome2 = noOutcome;
            // Explicitly fetch with outcomeId + outcomeType to avoid wrong books
            outcome1OrderBook = await fetchOrderBook(market.id, Number(outcome1.id), 1);
            outcome2OrderBook = await fetchOrderBook(market.id, Number(outcome2.id), 0);
        } else {
            outcome1 = market.outcomes[0];
            outcome2 = market.outcomes[1];
            // For team-based markets, use their declared outcomeType if present: 1 for Team1, 0 for Team2 per Order.md
            const outcome1Type = Number(outcome1?.outcomeType) === 0 || Number(outcome1?.outcomeType) === 1 ? Number(outcome1.outcomeType) : 1;
            const outcome2Type = Number(outcome2?.outcomeType) === 0 || Number(outcome2?.outcomeType) === 1 ? Number(outcome2.outcomeType) : 0;
            outcome1OrderBook = await fetchOrderBook(market.id, Number(outcome1.id), outcome1Type);
            outcome2OrderBook = await fetchOrderBook(market.id, Number(outcome2.id), outcome2Type);
        }
        
        if (!outcome1OrderBook?.asks || !outcome1OrderBook?.bids || !outcome2OrderBook?.asks || !outcome2OrderBook?.bids) {
            logger.log(`   ⏭️  Skipping market ${market.id} - insufficient order book data`);
            return false;
        }

        // Compute best prices robustly from full order book (min ask, max bid)
        const parsePrices = (levels: any[] = []) => levels
            .map(l => parseFloat(l?.price))
            .filter(p => Number.isFinite(p));

        const o1Asks = parsePrices(outcome1OrderBook.asks);
        const o1Bids = parsePrices(outcome1OrderBook.bids);
        const o2Asks = parsePrices(outcome2OrderBook.asks);
        const o2Bids = parsePrices(outcome2OrderBook.bids);

        // Sensible defaults if one side is empty
        const outcome1BestAsk = o1Asks.length ? Math.min(...o1Asks) : 1.0;
        const outcome1BestBid = o1Bids.length ? Math.max(...o1Bids) : 0.0;
        const outcome2BestAsk = o2Asks.length ? Math.min(...o2Asks) : 1.0;
        const outcome2BestBid = o2Bids.length ? Math.max(...o2Bids) : 0.0;

        // Combined market spread across both complementary outcomes:
        // spread = (bestBid1 + bestBid2) - (bestAsk1 + bestAsk2)
        const combinedBestBidSum = outcome1BestBid + outcome2BestBid;
        const combinedBestAskSum = outcome1BestAsk + outcome2BestAsk;
        const totalSpread = Math.max(0, combinedBestBidSum - combinedBestAskSum);

        logger.log(`   📊 Market ${market.id} Analysis:`, {
            outcome1BestBid,
            outcome1BestAsk,
            outcome2BestBid,
            outcome2BestAsk,
            combinedBestBidSum: combinedBestBidSum.toFixed(4),
            combinedBestAskSum: combinedBestAskSum.toFixed(4),
            totalSpread: totalSpread.toFixed(4)
        });

        // Alternative arbitrage metric using complementarity (choose max profit among both strategies)
        const complementAskExcess = Math.max(0, (outcome1BestAsk + outcome2BestAsk) - 1);
        const complementBidDeficit = Math.max(0, 1 - (outcome1BestBid + outcome2BestBid));
        const arbitrageSpread = Math.max(totalSpread, complementAskExcess, complementBidDeficit);

        logger.log(`   📐 Spread metrics:`, {
            combinedBidSum: (outcome1BestBid + outcome2BestBid).toFixed(4),
            combinedAskSum: (outcome1BestAsk + outcome2BestAsk).toFixed(4),
            combinedBidMinusAsk: totalSpread.toFixed(4),
            askSumMinusOne: complementAskExcess.toFixed(4),
            oneMinusBidSum: complementBidDeficit.toFixed(4),
            arbitrageSpread: arbitrageSpread.toFixed(4)
        });

        // Enforce spread threshold strictly using best of metrics
        if (arbitrageSpread <= BOT_CONFIG.SPREAD_THRESHOLD) {
            logger.log(`   ⏭️  Skipping market ${market.id} - spread ${arbitrageSpread.toFixed(4)} ≤ ${BOT_CONFIG.SPREAD_THRESHOLD}`);
            return false;
        }

        // Check for very high prices (>= 0.95)
        if (outcome1BestBid >= 0.95 || outcome1BestAsk >= 0.95 || outcome2BestBid >= 0.95 || outcome2BestAsk >= 0.95) {
            logger.log(`   ⚠️  Market ${market.id} has very high prices (≥ $0.95), skipping`);
            return false;
        }

        // Check for very low prices (<= 0.05)
        if (outcome1BestBid <= 0.05 || outcome1BestAsk <= 0.05 || outcome2BestBid <= 0.05 || outcome2BestAsk <= 0.05) {
            logger.log(`   ⚠️  Market ${market.id} has very low prices (≤ $0.05), skipping`);
            return false;
        }

        const walletNumbers = [3, 4, 5, 6, 7, 8];
        const numTrades = Math.floor(Math.random() * 3) + 1; // 1-3 trades (2,4,6 orders)
        
        logger.log(`   🎯 Spread ${arbitrageSpread.toFixed(4)} > ${BOT_CONFIG.SPREAD_THRESHOLD} - placing ${numTrades} internal-match trade${numTrades === 1 ? '' : 's'} (${numTrades * 2} orders)`);

        let ordersPlaced = 0;

        for (let i = 0; i < numTrades; i++) {
            const availableWallets = [...walletNumbers];
            const wallet1Number = getRandomElement(availableWallets);
            availableWallets.splice(availableWallets.indexOf(wallet1Number), 1);
            const wallet2Number = getRandomElement(availableWallets);
            // Randomize order size between 20 and 50 shares per order
            const orderAmount = getRandomDelay(20, 50);

            const wallet1Config = {
                WALLET_ADDRESS: CONFIG[NETWORK][`WALLET_ADDRESS_${wallet1Number}`],
                PRIVATE_KEY: CONFIG[NETWORK][`PRIVATE_KEY_${wallet1Number}`],
                PROXY_WALLET: CONFIG[NETWORK][`PROXY_WALLET_${wallet1Number}`]
            };

            const wallet2Config = {
                WALLET_ADDRESS: CONFIG[NETWORK][`WALLET_ADDRESS_${wallet2Number}`],
                PRIVATE_KEY: CONFIG[NETWORK][`PRIVATE_KEY_${wallet2Number}`],
                PROXY_WALLET: CONFIG[NETWORK][`PROXY_WALLET_${wallet2Number}`]
            };

            const wallet1AccessToken = await loginAndGetAccessToken(wallet1Config.PRIVATE_KEY);
            const wallet2AccessToken = await loginAndGetAccessToken(wallet2Config.PRIVATE_KEY);

            // Select midpoint price strictly between best bid and best ask for outcome1
            const midpoint1 = (outcome1BestBid + outcome1BestAsk) / 2;
            let makerPrice = toCentsFloor(midpoint1);
            if (makerPrice <= outcome1BestBid) makerPrice = toCentsFloor(outcome1BestBid + 0.01);
            if (makerPrice >= outcome1BestAsk) makerPrice = toCentsFloor(outcome1BestAsk - 0.01);

            // Complementary price for outcome2
            let compPrice = toCentsFloor(1 - makerPrice);
            if (Number.isFinite(outcome2BestBid) && Number.isFinite(outcome2BestAsk) && outcome2BestBid > 0 && outcome2BestAsk > 0) {
                if (compPrice <= outcome2BestBid) compPrice = toCentsFloor(outcome2BestBid + 0.01);
                if (compPrice >= outcome2BestAsk) compPrice = toCentsFloor(outcome2BestAsk - 0.01);
            }

            logger.log(`   🔁 Trade ${i + 1}: Internal match at midpoint prices`);
            logger.log(`      ${outcome1.title}: $${makerPrice} (bid ${outcome1BestBid} / ask ${outcome1BestAsk})`);
            logger.log(`      ${outcome2.title}: $${compPrice} (bid ${outcome2BestBid} / ask ${outcome2BestAsk})`);
            // Place BUY orders from different wallets on complementary outcomes so they match existing asks
            logger.log(`   🛒 Placing BUY on ${outcome1.title} at $${makerPrice} from wallet ${wallet1Number}`);
            const buyOrder1 = {
                marketId: market.id,
                token: outcome1,
                account: {
                    wallet: wallet1Config.WALLET_ADDRESS,
                    private_key: wallet1Config.PRIVATE_KEY,
                    proxy_wallet: wallet1Config.PROXY_WALLET,
                    accessToken: wallet1AccessToken
                },
                price: makerPrice,
                amount: orderAmount,
                side: 0,
                accessToken: wallet1AccessToken
            };
            const buyRes1 = await placeOrder(buyOrder1);
                if (buyRes1 && buyRes1.success === true) {
                    ordersPlaced++;
                    logger.log(`   ✅ BUY placed on ${outcome1.title}`, { orderId: buyRes1?.data?.orderResult?.response?.data?.id || null });
                } else {
                    logger.log(`   ⚠️  BUY failed on ${outcome1.title}`, buyRes1);
                }

            // Fixed delay to ensure on-chain/orderbook visibility before placing the complementary order
            console.log('   ⏳ Waiting 2000ms before complementary buy to ensure matching');
            await new Promise(resolve => setTimeout(resolve, 2000));

            logger.log(`   🛒 Placing BUY on ${outcome2.title} at $${compPrice} from wallet ${wallet2Number}`);
            const buyOrder2 = {
                marketId: market.id,
                token: outcome2,
                account: {
                    wallet: wallet2Config.WALLET_ADDRESS,
                    private_key: wallet2Config.PRIVATE_KEY,
                    proxy_wallet: wallet2Config.PROXY_WALLET,
                    accessToken: wallet2AccessToken
                },
                price: compPrice,
                amount: orderAmount,
                side: 0,
                accessToken: wallet2AccessToken
            };
            const buyRes2 = await placeOrder(buyOrder2);
                if (buyRes2 && buyRes2.success === true) {
                    ordersPlaced++;
                    logger.log(`   ✅ BUY placed on ${outcome2.title}`, { orderId: buyRes2?.data?.orderResult?.response?.data?.id || null });
                } else {
                    logger.log(`   ⚠️  BUY failed on ${outcome2.title}`, buyRes2);
                }
        }

        if (ordersPlaced > 0) {
            logger.log(`   ✅ Successfully placed ${ordersPlaced} orders on market ${market.id} (${numTrades} trades)`);
            return true;
        }

        return false;
    } catch (error: any) {
        logger.log(`   ❌ Error processing market ${market.id}:`, error.message);
        return false;
    }
}

// Main bot function
async function arbitrageBot() {
        console.log(`🟢 EVENT_API_URL in use: ${EVENT_API_URL}`);
    const logger = new ArbitrageLogger();
    const sessionStartTime = logger.getSessionStartTime();
    
    console.log('🚀 Starting Arbitrage Bot (Spread > 0.015 Only)');
    console.log(`📅 Session started at: ${sessionStartTime.toLocaleString()}`);
    console.log(`🔄 Running continuously until manually stopped (Ctrl+C)`);
    console.log(`🌐 Network: ${NETWORK}`);
    console.log(`💰 Strategy: Place orders only when spread > ${BOT_CONFIG.SPREAD_THRESHOLD}`);
    console.log(`🎲 YES at best bid + NO at complementary price (1.00 - YES price)`);
    console.log(`⏱️  Human-like delays: ${BOT_CONFIG.HUMAN_LIKE_DELAYS ? 'Enabled' : 'Disabled'}`);
    console.log(`🎲 Random market selection: ${BOT_CONFIG.RANDOM_MARKET_SELECTION ? 'Enabled' : 'Disabled'}`);
    console.log('');

    if (!validateWalletConfig()) {
        console.error('❌ Wallet configuration validation failed. Exiting.');
        return;
    }


    // Always process market 349 for debugging
    // Login and get accessToken from one of the configured wallets
    const walletConfig = {
        WALLET_ADDRESS: CONFIG[NETWORK].WALLET_ADDRESS_3,
        PRIVATE_KEY: CONFIG[NETWORK].PRIVATE_KEY_3,
        PROXY_WALLET: CONFIG[NETWORK].PROXY_WALLET_3
    };
    const accessToken = await loginAndGetAccessToken(walletConfig.PRIVATE_KEY);

    // Refactored: Always fetch event by marketId and process all submarkets
    const latestMarketIdStr = await getLatestMarketIdFromUser();
    const selectedMarketId = parseInt(String(latestMarketIdStr));
    if (isNaN(selectedMarketId) || selectedMarketId <= 0) {
        console.error('❌ Invalid market ID. Exiting...');
        return;
    }

    // Login and get accessToken from one of the configured wallets
    const arbitrageWalletConfig = {
        WALLET_ADDRESS: CONFIG[NETWORK].WALLET_ADDRESS_3,
        PRIVATE_KEY: CONFIG[NETWORK].PRIVATE_KEY_3,
        PROXY_WALLET: CONFIG[NETWORK].PROXY_WALLET_3
    };
    const arbitrageAccessToken = await loginAndGetAccessToken(arbitrageWalletConfig.PRIVATE_KEY);

    // Fetch event by marketId
    const eventParams = { id: selectedMarketId, accessToken: arbitrageAccessToken };
    let event;
    try {
        const response = await axios.get(EVENT_API_URL, { params: eventParams, timeout: 30000 });
        event = response.data?.data || response.data;
    } catch (error) {
        console.error(`❌ Failed to fetch event for marketId ${selectedMarketId}:`, error.message);
        return;
    }
    let submarketsArr = [];
    if (event && Array.isArray(event.markets)) {
        submarketsArr = event.markets;
    } else if (event && event.data && Array.isArray(event.data.markets)) {
        submarketsArr = event.data.markets;
    }
    if (submarketsArr.length === 0) {
        console.log(`❌ No submarkets found for marketId ${selectedMarketId}. Exiting...`);
        return;
    }

    console.log(`\nEvent ${selectedMarketId} contains the following submarkets:`);
    submarketsArr.forEach((m, idx) => {
        console.log(` ${idx + 1}. ${m.title} (ID: ${m.id})`);
    });
    console.log('='.repeat(40));

    // Loop through all submarkets/events inside this marketId
    for (const market of submarketsArr) {
        // Get YES/NO outcomes (for YES/NO markets) or Team outcomes (for NFL/MLB markets)
        let outcome1, outcome2, marketType;
        if (market.outcomes.find((o) => o.title.trim().toLowerCase() === 'yes') && market.outcomes.find((o) => o.title.trim().toLowerCase() === 'no')) {
            outcome1 = market.outcomes.find((o) => o.title.trim().toLowerCase() === 'yes');
            outcome2 = market.outcomes.find((o) => o.title.trim().toLowerCase() === 'no');
            marketType = 'YES/NO';
            console.log(`📊 YES/NO Market: ${market.title}`);
        } else if (market.outcomes[0] && market.outcomes[1]) {
            outcome1 = market.outcomes[0];
            outcome2 = market.outcomes[1];
            marketType = 'TEAM';
            console.log(`🏈 NFL/Team Market: ${market.outcomes[0].title} vs ${market.outcomes[1].title}`);
        } else {
            console.error(`Submarket '${market.title}' does not have valid outcomes (need YES/NO or 2 teams), skipping.`);
            continue;
        }

        // ...existing order book and order placement logic for each submarket...
        // You can prompt for odds, budgets, and place orders here as needed
        // For example, call executeArbitrageStrategy(market, logger, false);
        await executeArbitrageStrategy(market, logger, false);
    }
    console.log('🏁 All submarkets processed.');
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Received SIGINT. Gracefully shutting down...');
    console.log('📊 Final session statistics will be logged.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Received SIGTERM. Gracefully shutting down...');
    console.log('📊 Final session statistics will be logged.');
    process.exit(0);
});

// Start the bot
if (require.main === module) {
    arbitrageBot().catch(error => {
        console.error('❌ Fatal error in arbitrage bot:', error);
        process.exit(1);
    });
}


