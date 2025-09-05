


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

// Bot Configuration
const BOT_CONFIG = {
    MAX_MARKETS_TO_CHECK: 300, // Check last 300 markets
    MIN_DELAY_BETWEEN_MARKETS: 15000, // 15 seconds minimum (increased from 5)
    MAX_DELAY_BETWEEN_MARKETS: 30000, // 30 seconds maximum (increased from 15)
    MIN_DELAY_BETWEEN_ORDERS: 2000, // 2 seconds minimum
    MAX_DELAY_BETWEEN_ORDERS: 8000, // 8 seconds maximum
    MIN_DELAY_BETWEEN_ACTIONS: 1000, // 1 second minimum
    MAX_DELAY_BETWEEN_ACTIONS: 5000, // 5 seconds maximum
    ORDER_AMOUNTS: [1, 2, 3, 4, 5], // Random order amounts (1-5 shares max)
    MAX_RETRIES: 3,
    RATE_LIMIT_DELAY: 10000, // 10 seconds when rate limited
    HUMAN_LIKE_DELAYS: true, // Enable human-like random delays
    RANDOM_MARKET_SELECTION: true, // Enable random market selection
    LOGGING_ENABLED: true,
    SPREAD_THRESHOLD: 0.01, // Only place orders if spread > 0.01
    TOP_OF_BOOK_STRATEGY: true // Always place orders at top of book
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
        const logFile = path.join(this.logDir, `arbitrage_bot_${this.sessionId}.json`);
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
        
        // Fetch markets from the API
        const response = await axios.get(EVENT_API_URL, { 
            timeout: 30000 // 30 second timeout
        });
        
        if (response.data && response.data.data && response.data.data.length > 0) {
            // Find the highest market ID (latest market)
            const marketIds = response.data.data.map((market: any) => parseInt(market.id));
            const highestId = Math.max(...marketIds);
            console.log(`✅ Latest market ID found: ${highestId}`);
            
            // If 687 exists and is higher or equal, use it
            if (marketIds.includes(687)) {
                console.log(`🎯 Found target market 687, using it as latest`);
                return 687;
            }
            
            return highestId;
        }
        
        // Fallback to environment variable or default
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
        // Use mainnet API format
        const response = await axios.get(`${EVENT_API_URL}/${marketId}`, { 
            timeout: 30000 // 30 second timeout
        });
        const event = response.data;
        
        if (!event || !event.data || !Array.isArray(event.data.markets) || event.data.markets.length === 0) {
            return null;
        }
        
        // Find the market with matching ID, or use the first market from the event
        const market = event.data.markets.find((m: any) => m.id === marketId) || event.data.markets[0];
        
        // Check if the market is active
        if (market) {
            const activeLike = ['active', 'open', 'trading', 'live'];
            const inactiveLike = ['resolved', 'closed', 'settled', 'cancelled', 'expired'];
            const status = String(market?.status || '').toLowerCase();
            
            // Skip resolved, closed, or inactive markets
            if (status && inactiveLike.includes(status)) {
                console.log(`   ⏭️  Market ${marketId} is not active (status: ${status}), skipping...`);
                return null;
            }
            
            // Skip markets with no status that might be resolved
            if (status && !activeLike.includes(status) && !inactiveLike.includes(status)) {
                console.log(`   ⏭️  Market ${marketId} has unknown status (${status}), skipping...`);
                return null;
            }
            
            // Only log the title for debugging, but don't filter based on it
            if (market.title) {
                console.log(`   📋 Market: ${market.title}`);
            }
        }
        
        return market;
    } catch (error: any) {
        // Handle specific error types
        if (error.response?.status === 404) {
            // Market not found - this is expected for many market IDs
            return null;
        } else if (error.response?.status === 429) {
            // Rate limited - rethrow to be handled by caller
            throw error;
        } else {
            // Other errors - log but don't fail
            console.log(`   ⚠️  Error fetching market ${marketId}: ${error.message}`);
            return null;
        }
    }
}

async function fetchOrderBook(marketId: number, outcomeType: number) {
    try {
        const response = await axios.get(ORDER_BOOK_API_URL, {
            params: { marketId, outcomeType }
        });
        return response.data;
    } catch (error: any) {
        console.error(`❌ Failed to fetch order book for market ${marketId}:`, error.message);
        return null;
    }
}

async function loginAndGetAccessToken(privateKey: string): Promise<string> {
    let retries = 0;
    const maxRetries = BOT_CONFIG.MAX_RETRIES;
    const baseDelay = 1000;
    
    while (retries < maxRetries) {
        try {
            // Use ForkastSDK for authentication instead of HTTP calls
            const loginResponse = await sdk.getAccountService().loginWithPrivateKey(privateKey);
            return loginResponse.accessToken;
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
        // Suppress console output during SDK operations
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        console.log = () => {};
        console.error = () => {};
        
        // Use ForkastSDK for order placement instead of HTTP calls
        const response = await sdk.getOrderService().placeSingleOrder(
            orderBody.marketId,
            orderBody.token,
            orderBody.account,
            orderBody.price,
            orderBody.amount,
            orderBody.side,
            orderBody.accessToken
        );
        
        // Restore console output
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        
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
        // Determine if this is a YES/NO market or team-based market
        const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
        const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
        
        let outcome1, outcome2, outcome1OrderBook, outcome2OrderBook;
        
        if (yesOutcome && noOutcome) {
            // YES/NO market
            outcome1 = yesOutcome;
            outcome2 = noOutcome;
            outcome1OrderBook = await fetchOrderBook(market.id, 1); // YES outcome
            outcome2OrderBook = await fetchOrderBook(market.id, 0);  // NO outcome
        } else {
            // Team-based market (NFL, etc.)
            outcome1 = market.outcomes[0];
            outcome2 = market.outcomes[1];
            outcome1OrderBook = await fetchOrderBook(market.id, outcome1.id);
            outcome2OrderBook = await fetchOrderBook(market.id, outcome2.id);
        }
        
        if (!outcome1OrderBook.asks || !outcome1OrderBook.bids || !outcome2OrderBook.asks || !outcome2OrderBook.bids) {
            logger.log(`   ⏭️  Skipping market ${market.id} - insufficient order book data`);
            return false;
        }

        const outcome1BestAsk = parseFloat(outcome1OrderBook.asks[0]?.price || '0.5');
        const outcome1BestBid = parseFloat(outcome1OrderBook.bids[0]?.price || '0.5');
        const outcome2BestAsk = parseFloat(outcome2OrderBook.asks[0]?.price || '0.5');
        const outcome2BestBid = parseFloat(outcome2OrderBook.bids[0]?.price || '0.5');

        // Calculate spread - use the overall market spread, not sum of individual spreads
        const outcome1Spread = outcome1BestAsk - outcome1BestBid;
        const outcome2Spread = outcome2BestAsk - outcome2BestBid;
        // Total spread should be the maximum of the two spreads, not the sum
        const totalSpread = Math.max(outcome1Spread, outcome2Spread);

        logger.log(`   📊 Market ${market.id} Analysis:`, {
            outcome1BestBid,
            outcome1BestAsk,
            outcome1Spread: outcome1Spread.toFixed(4),
            outcome2BestBid,
            outcome2BestAsk,
            outcome2Spread: outcome2Spread.toFixed(4),
            totalSpread: totalSpread.toFixed(4)
        });

        // For tight spreads, we'll still place orders at the top of the book for immediate matching
        if (totalSpread <= 0.02) {
            logger.log(`   📊 Market ${market.id} has tight spread (${totalSpread.toFixed(4)}), placing orders at top of book for immediate matching`);
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

        // Select multiple random wallets for this market (3-4 trades)
        const walletNumbers = [3, 4, 5, 6, 7, 8, 9, 10, 11];
        const numTrades = Math.floor(Math.random() * 2) + 3; // 3-4 trades
        
        logger.log(`   🎲 Placing ${numTrades} trades using random wallet pairs`);

        // Strategy: Place multiple orders at top of book with spread-based pricing
        let ordersPlaced = 0;

        // Always place orders regardless of spread - never skip any market
        if (totalSpread > BOT_CONFIG.SPREAD_THRESHOLD) {
            logger.log(`   🎯 Spread ${totalSpread.toFixed(4)} > ${BOT_CONFIG.SPREAD_THRESHOLD} - placing ${numTrades} trades`);
        } else {
            logger.log(`   🎯 Market ${market.id} - placing orders despite tight spread (${totalSpread.toFixed(4)})`);
        }
            
            // Place multiple trades with completely random wallet selection for each trade
            for (let i = 0; i < numTrades; i++) {
                // Randomly select two different wallets for each trade
                const availableWallets = [...walletNumbers];
                const wallet1Number = getRandomElement(availableWallets);
                availableWallets.splice(availableWallets.indexOf(wallet1Number), 1); // Remove first wallet
                const wallet2Number = getRandomElement(availableWallets); // Select from remaining wallets
                // Random order amounts for each trade
                const orderAmount = getRandomElement(BOT_CONFIG.ORDER_AMOUNTS);
                const orderAmount2 = getRandomElement(BOT_CONFIG.ORDER_AMOUNTS); // Different amount for NO order

                // Get wallet configurations
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

                // Calculate prices for this trade
                const outcome1Price = parseFloat((outcome1BestBid + 0.01).toFixed(4));
                const outcome2Price = parseFloat((1.00 - outcome1Price).toFixed(4));

                // Check if prices are acceptable
                if (outcome1Price > 0.05 && outcome1Price < 0.95 && outcome2Price > 0.05 && outcome2Price < 0.95) {
                    logger.log(`   📈 Trade ${i + 1}: Wallet ${wallet1Number} placing ${outcome1.title} order: ${orderAmount} shares at $${outcome1Price}`);
                    logger.log(`   🎲 Trade ${i + 1} wallet pair: ${wallet1Number} (${outcome1.title}) + ${wallet2Number} (${outcome2.title})`);
                    
                    // Place Outcome 1 order
                    const outcome1OrderBody = {
                        marketId: market.id,
                        token: outcome1,
                        account: {
                            wallet: wallet1Config.WALLET_ADDRESS,
                            private_key: wallet1Config.PRIVATE_KEY,
                            proxy_wallet: wallet1Config.PROXY_WALLET,
                            accessToken: wallet1AccessToken
                        },
                        price: outcome1Price,
                        amount: orderAmount,
                        side: 0, // Buy
                        accessToken: wallet1AccessToken
                    };

                    const outcome1Result = await placeOrder(outcome1OrderBody);
                    if (outcome1Result && outcome1Result.success === true) {
                        ordersPlaced++;
                    }

                    // Wait a bit before placing the Outcome 2 order
                    await humanLikeDelay(1000, 3000, `Processing ${outcome1.title} order`);

                    logger.log(`   📉 Trade ${i + 1}: Wallet ${wallet2Number} placing ${outcome2.title} order: ${orderAmount2} shares at $${outcome2Price}`);

                    // Place Outcome 2 order
                    const outcome2OrderBody = {
                        marketId: market.id,
                        token: outcome2,
                        account: {
                            wallet: wallet2Config.WALLET_ADDRESS,
                            private_key: wallet2Config.PRIVATE_KEY,
                            proxy_wallet: wallet2Config.PROXY_WALLET,
                            accessToken: wallet2AccessToken
                        },
                        price: outcome2Price,
                        amount: orderAmount2,
                        side: 0, // Buy
                        accessToken: wallet2AccessToken
                    };

                    const outcome2Result = await placeOrder(outcome2OrderBody);
                    if (outcome2Result && outcome2Result.success === true) {
                        ordersPlaced++;
                    }

                    logger.log(`   🎯 Trade ${i + 1} complete: ${outcome1.title} at $${outcome1Price} + ${outcome2.title} at $${outcome2Price} = $${(outcome1Price + outcome2Price).toFixed(4)}`);

                    // Wait between trades
                    if (i < numTrades - 1) {
                        await humanLikeDelay(2000, 5000, 'Between trades');
                    }
                } else {
                    logger.log(`   ⚠️  Trade ${i + 1}: Prices out of range`);
                }
            }
        // Always place orders - never skip any market regardless of spread

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
    
    // Set 1-hour timeout
    const SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
    const sessionEndTime = new Date(sessionStartTime.getTime() + SESSION_DURATION);
    
    console.log('🚀 Starting Arbitrage Bot with Human-Like Behavior');
    console.log(`📅 Session started at: ${sessionStartTime.toLocaleString()}`);
    console.log(`⏰ Session will end at: ${sessionEndTime.toLocaleString()} (1 hour duration)`);
    console.log(`🌐 Network: ${NETWORK}`);
    console.log(`🎯 Target: Last ${BOT_CONFIG.MAX_MARKETS_TO_CHECK} markets`);
    console.log(`💰 Strategy: Coordinated trades between 2 random wallets per market`);
    console.log(`🎲 YES at best bid + NO at complementary price (1.00 - YES price)`);
    console.log(`⏱️  Human-like delays: ${BOT_CONFIG.HUMAN_LIKE_DELAYS ? 'Enabled' : 'Disabled'}`);
    console.log(`🎲 Random market selection: ${BOT_CONFIG.RANDOM_MARKET_SELECTION ? 'Enabled' : 'Disabled'}`);
    console.log('');

    // Validate wallet configuration
    if (!validateWalletConfig()) {
        console.error('❌ Wallet configuration validation failed. Exiting.');
        return;
    }

    // Get user choice for market selection
    const marketChoice = await getUserMarketChoice();
    console.log('');

    let marketsProcessed = 0;
    let marketsWithOrders = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;
    let activeMarkets: number[] = [];

    if (marketChoice === 'all') {
        // Get latest market ID - prioritize 667 if available
        console.log('🔍 Discovering latest active market ID...');
        const latestMarketId = await getLatestMarketId();
        console.log(`🔍 Latest market ID: ${latestMarketId}`);
        
        // Always use 687 for option 1 (all markets)
        console.log(`🎯 Using market 687 as the starting point`);
        console.log(`📋 Will check markets from 687 down to ${Math.max(1, 687 - BOT_CONFIG.MAX_MARKETS_TO_CHECK + 1)}`);
        console.log('');

        // Generate list of markets to check (in descending order)
        // Always start from 687 for option 1 (all markets)
        const startingMarketId = 687;
        console.log(`🎯 Starting from market ${startingMarketId} as requested`);
        const marketIds = Array.from({ length: BOT_CONFIG.MAX_MARKETS_TO_CHECK }, (_, i) => startingMarketId - i)
            .filter(id => id > 0); // Ensure no negative IDs
        
        // ALWAYS shuffle markets for completely random processing - never process in order
        shuffleArray(marketIds);
        console.log('🎲 Random market selection enabled - processing markets in COMPLETELY RANDOM order');
        console.log(`📊 Sample of shuffled market IDs: ${marketIds.slice(0, 10).join(', ')}...`);
        console.log('');

        console.log(`🔍 Fetching active markets from ${marketIds.length} potential markets...`);
        console.log(`📊 This may take a few minutes as we check each market's status...`);
        console.log('');
        
        // First, fetch and filter only ACTIVE markets
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
                
                // Small delay between market checks to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                // Skip markets that can't be fetched
                continue;
            }
        }
        
        console.log(`\n🎯 Found ${activeMarkets.length} active markets out of ${marketsChecked} checked`);
        
        if (activeMarkets.length === 0) {
            console.log('❌ No active markets found. Exiting...');
            return;
        }
        
        // NOW shuffle only the ACTIVE markets for completely random processing
        shuffleArray(activeMarkets);
        console.log('🎲 Random market selection enabled - processing ONLY ACTIVE markets in COMPLETELY RANDOM order');
        console.log(`📊 Sample of shuffled ACTIVE market IDs: ${activeMarkets.slice(0, 10).join(', ')}...`);
        console.log('');

    } else {
        // Specific markets mode
        const specificMarketIds = await getSpecificMarketIds();
        console.log(`🎯 Processing specific markets: ${specificMarketIds.join(', ')}`);
        
        // Validate and filter active markets from the specific list
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

    // Create a copy of active markets for random selection
    const availableMarkets = [...activeMarkets];

    // Process markets in RANDOM order by picking random indices
    while (availableMarkets.length > 0 && consecutiveErrors < maxConsecutiveErrors) {
        // Check if session time has expired (1 hour timeout)
        const currentTime = new Date();
        if (currentTime.getTime() >= sessionEndTime.getTime()) {
            console.log(`\n⏰ Session timeout reached (1 hour duration). Stopping bot...`);
            console.log(`📅 Session started at: ${sessionStartTime.toLocaleString()}`);
            console.log(`📅 Session ended at: ${currentTime.toLocaleString()}`);
            break;
        }
        
        // Pick a RANDOM market from the available ones
        const randomIndex = Math.floor(Math.random() * availableMarkets.length);
        const marketId = availableMarkets[randomIndex];
        
        // Remove the selected market from available markets
        availableMarkets.splice(randomIndex, 1);
        
        try {
            console.log(`\n🔍 Processing Market ${marketId} (${marketsProcessed + 1}/${activeMarkets.length})`);
            console.log(`   🎲 Randomly selected from ${availableMarkets.length + 1} available markets`);
            
            // Disable random market skipping to ensure orders are placed
            // if (Math.random() < 0.05) {
            //     console.log(`   🎲 Randomly skipping market ${marketId} for human-like behavior`);
            //     continue;
            // }
            
            // Fetch market data
            const market = await fetchMarketById(marketId);
            if (!market) {
                console.log(`   ⏭️  Market ${marketId} not found or inactive, skipping`);
                continue;
            }

            // Validate market has outcomes
            if (!market.outcomes || market.outcomes.length === 0) {
                console.log(`   ⏭️  Market ${marketId} has no outcomes, skipping`);
                continue;
            }

            // Check if this is a YES/NO market or a team-based market (NFL, etc.)
            const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
            const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
            
            // For team-based markets (NFL), we need two team outcomes
            const team1Outcome = market.outcomes[0];
            const team2Outcome = market.outcomes[1];
            
            if (!yesOutcome || !noOutcome) {
                // This is likely a team-based market (NFL, etc.)
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

            // Execute arbitrage strategy - pass isUserSelectedMarket flag for specific markets
            const ordersPlaced = await executeArbitrageStrategy(market, logger, marketChoice === 'specific');
            if (ordersPlaced) {
                marketsWithOrders++;
                consecutiveErrors = 0; // Reset error counter on success
            }

            marketsProcessed++;
            
            // Human-like delay between markets
            if (marketsProcessed < activeMarkets.length) {
                const delay = getRandomDelay(BOT_CONFIG.MIN_DELAY_BETWEEN_MARKETS, BOT_CONFIG.MAX_DELAY_BETWEEN_MARKETS);
                console.log(`   ⏳ Processing next market in ${delay}ms (${Math.round(delay/1000)}s)...`);
                
                // Add some additional random micro-delays for more human-like behavior
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

            // Wait longer on errors
            const errorDelay = BOT_CONFIG.RATE_LIMIT_DELAY * Math.pow(2, consecutiveErrors);
            console.log(`   ⏳ Waiting ${errorDelay}ms before continuing...`);
            await new Promise(resolve => setTimeout(resolve, errorDelay));
        }
    }

    // Session summary
    const actualSessionEndTime = new Date();
    const sessionDuration = actualSessionEndTime.getTime() - sessionStartTime.getTime();
    const sessionMinutes = Math.floor(sessionDuration / 60000);
    const sessionSeconds = Math.floor((sessionDuration % 60000) / 1000);

    console.log('\n' + '='.repeat(60));
    console.log('🎯 ARBITRAGE BOT SESSION COMPLETE');
    console.log('='.repeat(60));
    console.log(`📅 Session Start: ${sessionStartTime.toLocaleString()}`);
    console.log(`📅 Session End: ${actualSessionEndTime.toLocaleString()}`);
    console.log(`⏱️  Duration: ${sessionMinutes}m ${sessionSeconds}s`);
    console.log(`🔍 Markets Processed: ${marketsProcessed}/${activeMarkets.length}`);
    console.log(`📈 Markets with Orders: ${marketsWithOrders}`);
    console.log(`📊 Success Rate: ${marketsProcessed > 0 ? ((marketsWithOrders / marketsProcessed) * 100).toFixed(1) : 0}%`);
    console.log(`🌐 Network: ${NETWORK}`);
    console.log(`🎲 Random Selection: ${BOT_CONFIG.RANDOM_MARKET_SELECTION ? 'Yes' : 'No'}`);
    console.log('='.repeat(60));

    logger.log('Session completed', {
        sessionStartTime: sessionStartTime.toISOString(),
        sessionEndTime: actualSessionEndTime.toISOString(),
        sessionDuration: sessionDuration,
        marketsProcessed,
        marketsWithOrders,
        successRate: marketsProcessed > 0 ? ((marketsWithOrders / marketsProcessed) * 100).toFixed(1) + '%' : '0%',
        randomSelection: BOT_CONFIG.RANDOM_MARKET_SELECTION,
        activeMarketsFound: activeMarkets.length
    });
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
