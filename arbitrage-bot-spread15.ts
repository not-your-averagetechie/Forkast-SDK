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
        WALLET_ADDRESS_9: process.env.TESTNET_WALLET_ADDRESS_9,
        PRIVATE_KEY_9: process.env.TESTNET_PRIVATE_KEY_9,
        PROXY_WALLET_9: process.env.TESTNET_PROXY_WALLET_9,
        WALLET_ADDRESS_10: process.env.TESTNET_WALLET_ADDRESS_10,
        PRIVATE_KEY_10: process.env.TESTNET_PRIVATE_KEY_10,
        PROXY_WALLET_10: process.env.TESTNET_PROXY_WALLET_10,
        WALLET_ADDRESS_11: process.env.TESTNET_WALLET_ADDRESS_11,
        PRIVATE_KEY_11: process.env.TESTNET_PRIVATE_KEY_11,
        PROXY_WALLET_11: process.env.TESTNET_PROXY_WALLET_11,
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
        WALLET_ADDRESS_9: process.env.MAINNET_WALLET_ADDRESS_9,
        PRIVATE_KEY_9: process.env.MAINNET_PRIVATE_KEY_9,
        PROXY_WALLET_9: process.env.MAINNET_PROXY_WALLET_9,
        WALLET_ADDRESS_10: process.env.MAINNET_WALLET_ADDRESS_10,
        PRIVATE_KEY_10: process.env.MAINNET_PRIVATE_KEY_10,
        PROXY_WALLET_10: process.env.MAINNET_PROXY_WALLET_10,
        WALLET_ADDRESS_11: process.env.MAINNET_WALLET_ADDRESS_11,
        PRIVATE_KEY_11: process.env.MAINNET_PRIVATE_KEY_11,
        PROXY_WALLET_11: process.env.MAINNET_PROXY_WALLET_11,
        MARKET_API_URL: process.env.MAINNET_MARKET_API_URL,
        ACCOUNT_API_URL: process.env.MAINNET_ACCOUNT_API_URL,
        ORDER_API_URL: process.env.MAINNET_ORDER_API_URL
    }
};

const NETWORK = (process.env.NETWORK as 'testnet' | 'mainnet') || 'mainnet';
const EVENT_API_URL = 'https://api.forkast.gg/api/v1/markets';
const ORDER_BOOK_API_URL = 'https://api.forkast.gg/api/v1/orderbook';

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
    const requiredWallets = [3, 4, 5, 6, 7, 8, 9, 10, 11];
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

async function fetchMarketById(marketId: number) {
    try {
        const response = await axios.get(`${EVENT_API_URL}/${marketId}`, { 
            timeout: 30000
        });
        const event = response.data;
        
        if (!event || !event.data || !Array.isArray(event.data.markets) || event.data.markets.length === 0) {
            return null;
        }
        
        const market = event.data.markets.find((m: any) => m.id === marketId) || event.data.markets[0];
        
        if (market) {
            const activeLike = ['active', 'open', 'trading', 'live'];
            const inactiveLike = ['resolved', 'closed', 'settled', 'cancelled', 'expired'];
            const status = String(market?.status || '').toLowerCase();
            
            if (status && inactiveLike.includes(status)) {
                console.log(`   ⏭️  Market ${marketId} is not active (status: ${status}), skipping...`);
                return null;
            }
            
            if (status && !activeLike.includes(status) && !inactiveLike.includes(status)) {
                console.log(`   ⏭️  Market ${marketId} has unknown status (${status}), skipping...`);
                return null;
            }
            
            if (market.title) {
                console.log(`   📋 Market: ${market.title}`);
            }
        }
        
        return market;
    } catch (error: any) {
        if (error.response?.status === 404) {
            return null;
        } else if (error.response?.status === 429) {
            throw error;
        } else {
            console.log(`   ⚠️  Error fetching market ${marketId}: ${error.message}`);
            return null;
        }
    }
}

async function fetchOrderBook(marketId: number, outcomeId: number, outcomeType: number) {
    try {
        const response = await axios.get(ORDER_BOOK_API_URL, {
            params: { marketId, outcomeId, outcomeType }
        });
        return response.data;
    } catch (error: any) {
        console.error(`❌ Failed to fetch order book for market ${marketId}:`, error.message);
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
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleInfo = console.info;
        const originalConsoleDebug = console.debug;
        console.log = () => {};
        console.error = () => {};
        console.info = () => {};
        console.debug = () => {};
        
        const response = await sdk.getOrderService().placeSingleOrder(
            orderBody.marketId,
            orderBody.token,
            orderBody.account,
            orderBody.price,
            orderBody.amount,
            orderBody.side,
            orderBody.accessToken
        );
        
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.info = originalConsoleInfo;
        console.debug = originalConsoleDebug;
        
        return { success: true, data: response };
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

        const walletNumbers = [3, 4, 5, 6, 7, 8, 9, 10, 11];
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
                logger.log(`   ✅ BUY placed on ${outcome1.title}`, { orderId: buyRes1?.data?.orderId || buyRes1?.data?.id || null });
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
                logger.log(`   ✅ BUY placed on ${outcome2.title}`, { orderId: buyRes2?.data?.orderId || buyRes2?.data?.id || null });
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

    const marketChoice = await getUserMarketChoice();
    console.log('');

    let activeMarkets: number[] = [];

    if (marketChoice === 'all') {
        const startingMarketId = await getLatestMarketIdFromUser();
        const marketsToScrape = await getMarketsToScrape();
        
        console.log(`🎯 Using market ${startingMarketId} as the starting point`);
        console.log(`📋 Will check ${marketsToScrape} markets from ${startingMarketId} down to ${Math.max(1, startingMarketId - marketsToScrape + 1)}`);
        console.log('');

        console.log(`🎯 Starting from market ${startingMarketId} as requested`);
        const marketIds = Array.from({ length: marketsToScrape }, (_, i) => startingMarketId - i)
            .filter(id => id > 0);
        
        shuffleArray(marketIds);
        console.log('🎲 Random market selection enabled - processing markets in COMPLETELY RANDOM order');
        console.log(`📊 Sample of shuffled market IDs: ${marketIds.slice(0, 10).join(', ')}...`);
        console.log('');

        console.log(`🔍 Fetching active markets from ${marketIds.length} potential markets...`);
        console.log(`📊 This may take a few minutes as we check each market's status...`);
        console.log('');
        
        let marketsChecked = 0;
        
        for (const marketId of marketIds) {
            try {
                const market = await fetchMarketById(marketId);
                if (market && market.status === 'ACTIVE') {
                    activeMarkets.push(marketId);
                    console.log(`   ✅ Market ${marketId} is ACTIVE - added to processing queue`);
                }
            
                marketsChecked++;
                if (marketsChecked % 50 === 0) {
                    console.log(`   📊 Progress: ${marketsChecked}/${marketIds.length} markets checked, ${activeMarkets.length} active found`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                continue;
            }
        }
        
        console.log(`\n🎯 Found ${activeMarkets.length} active markets out of ${marketsChecked} checked`);
        
        if (activeMarkets.length === 0) {
            console.log('❌ No active markets found. Exiting...');
            return;
        }
        
        shuffleArray(activeMarkets);
        console.log('🎲 Random market selection enabled - processing ONLY ACTIVE markets in COMPLETELY RANDOM order');
        console.log(`📊 Sample of shuffled ACTIVE market IDs: ${activeMarkets.slice(0, 10).join(', ')}...`);
        console.log('');

    } else {
        const specificMarketIds = await getSpecificMarketIds();
        console.log(`🎯 Processing specific markets: ${specificMarketIds.join(', ')}`);
        
        for (const marketId of specificMarketIds) {
            try {
                const market = await fetchMarketById(marketId);
                if (market && market.status === 'ACTIVE') {
                    activeMarkets.push(marketId);
                    console.log(`   ✅ Market ${marketId} is ACTIVE`);
                } else {
                    console.log(`   ⚠️  Market ${marketId} is not active (${market?.status || 'not found'})`);
                }
            } catch (error) {
                console.log(`   ❌ Error fetching market ${marketId}`);
            }
        }
        
        if (activeMarkets.length === 0) {
            console.log('❌ No active markets found in the specified list. Exiting...');
            return;
        }
        
        console.log(`✅ Found ${activeMarkets.length} active markets from specified list`);
    }

    let iterationCount = 0;
    let marketsProcessed = 0;
    let marketsWithOrders = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;
    
    while (true) {
        iterationCount++;
        console.log(`\n🔄 Starting iteration ${iterationCount}...`);
        
        let availableMarkets = [...activeMarkets];
        consecutiveErrors = 0;
        marketsProcessed = 0;
        marketsWithOrders = 0;
        
        while (availableMarkets.length > 0 && consecutiveErrors < maxConsecutiveErrors) {
        
        const randomIndex = Math.floor(Math.random() * availableMarkets.length);
        const marketId = availableMarkets[randomIndex];
        
        availableMarkets.splice(randomIndex, 1);
        
        try {
            console.log(`\n🔍 Processing Market ${marketId} (${marketsProcessed + 1}/${activeMarkets.length})`);
            console.log(`   🎲 Randomly selected from ${availableMarkets.length + 1} available markets`);
            
            const market = await fetchMarketById(marketId);
            if (!market) {
                console.log(`   ⏭️  Market ${marketId} not found or inactive, skipping`);
                continue;
            }

            if (!market.outcomes || market.outcomes.length === 0) {
                console.log(`   ⏭️  Market ${marketId} has no outcomes, skipping`);
                continue;
            }

            const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
            const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
            
            const team1Outcome = market.outcomes[0];
            const team2Outcome = market.outcomes[1];
            
            if (!yesOutcome || !noOutcome) {
                if (!team1Outcome || !team2Outcome || market.outcomes.length !== 2) {
                    console.log(`   ⏭️  Market ${marketId} has invalid outcome structure, skipping`);
                    continue;
                }
                
                console.log(`   🏈 NFL/Team Market: ${team1Outcome.title} vs ${team2Outcome.title}`);
            } else {
                console.log(`   📊 YES/NO Market: ${market.title}`);
            }

            console.log(`   📝 Market: ${market.title}`);
            console.log(`   📊 Status: ${market.status}`);
            
            if (yesOutcome && noOutcome) {
                console.log(`   🎯 Outcomes: YES (${yesOutcome.id}), NO (${noOutcome.id})`);
            } else {
                console.log(`   🎯 Outcomes: ${team1Outcome.title} (${team1Outcome.id}), ${team2Outcome.title} (${team2Outcome.id})`);
            }

            const ordersPlaced = await executeArbitrageStrategy(market, logger, marketChoice === 'specific');
            if (ordersPlaced) {
                marketsWithOrders++;
                consecutiveErrors = 0;
            }

            marketsProcessed++;
            
            if (marketsProcessed < activeMarkets.length) {
                const delay = getRandomDelay(BOT_CONFIG.MIN_DELAY_BETWEEN_MARKETS, BOT_CONFIG.MAX_DELAY_BETWEEN_MARKETS);
                console.log(`   ⏳ Processing next market in ${delay}ms (${Math.round(delay/1000)}s)...`);
                
                const microDelay = getRandomDelay(1000, 5000);
                console.log(`   🎲 Additional random micro-delay: ${microDelay}ms`);
                
                await new Promise(resolve => setTimeout(resolve, delay + microDelay));
            }

        } catch (error: any) {
            consecutiveErrors++;
            console.error(`   ❌ Error processing market ${marketId}:`, error.message);
            
            if (consecutiveErrors >= maxConsecutiveErrors) {
                console.error(`   🚨 Too many consecutive errors (${consecutiveErrors}), stopping bot`);
                break;
            }

            const errorDelay = BOT_CONFIG.RATE_LIMIT_DELAY * Math.pow(2, consecutiveErrors);
            console.log(`   ⏳ Waiting ${errorDelay}ms before continuing...`);
            await new Promise(resolve => setTimeout(resolve, errorDelay));
        }
        }
        
        const iterationEndTime = new Date();
        const iterationDuration = iterationEndTime.getTime() - sessionStartTime.getTime();
        const iterationMinutes = Math.floor(iterationDuration / 60000);
        const iterationSeconds = Math.floor((iterationDuration % 60000) / 1000);

        console.log('\n' + '='.repeat(50));
        console.log(`🔄 ITERATION ${iterationCount} COMPLETE`);
        console.log('='.repeat(50));
        console.log(`📅 Iteration started at: ${sessionStartTime.toLocaleString()}`);
        console.log(`📅 Iteration ended at: ${iterationEndTime.toLocaleString()}`);
        console.log(`⏱️  Duration: ${iterationMinutes}m ${iterationSeconds}s`);
        console.log(`🔍 Markets Processed: ${marketsProcessed}/${activeMarkets.length}`);
        console.log(`📈 Markets with Orders: ${marketsWithOrders}`);
        console.log(`📊 Success Rate: ${marketsProcessed > 0 ? ((marketsWithOrders / marketsProcessed) * 100).toFixed(1) : 0}%`);
        console.log(`🌐 Network: ${NETWORK}`);
        console.log(`🎲 Random Selection: ${BOT_CONFIG.RANDOM_MARKET_SELECTION ? 'Yes' : 'No'}`);
        console.log('='.repeat(50));

        logger.log(`Iteration ${iterationCount} completed`, {
            iterationNumber: iterationCount,
            iterationStartTime: sessionStartTime.toISOString(),
            iterationEndTime: iterationEndTime.toISOString(),
            iterationDuration: iterationDuration,
            marketsProcessed,
            marketsWithOrders,
            successRate: marketsProcessed > 0 ? ((marketsWithOrders / marketsProcessed) * 100).toFixed(1) + '%' : '0%',
            randomSelection: BOT_CONFIG.RANDOM_MARKET_SELECTION,
            activeMarketsFound: activeMarkets.length
        });
        
        console.log(`\n⏳ Waiting 30 seconds before starting next iteration...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
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


