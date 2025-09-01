import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { ForkastSDK, Network } from '@forkastgg/client';

dotenv.config();

const NETWORK = process.env.NETWORK || 'mainnet';

// Initialize ForkastSDK for authentication
const sdk = new ForkastSDK(Network.MAINNET, process.env.API_KEY);

const CONFIG = {
    testnet: {
        EVENT_API_URL: process.env.TESTNET_MARKET_API_URL || 'http://localhost:3000/market/event',
        LOGIN_API_URL: process.env.TESTNET_ACCOUNT_API_URL || 'http://localhost:3000/account/login',
        ORDER_API_URL: process.env.TESTNET_ORDER_API_URL || 'http://localhost:3000/orders',
        ORDER_BOOK_API_URL: process.env.TESTNET_ORDER_BOOK_API_URL || 'https://api.forkast.gg/api/v1/orderbook',
        WALLET_ADDRESS_3: process.env.TESTNET_WALLET_ADDRESS_3,
        PRIVATE_KEY_3: process.env.TESTNET_PRIVATE_KEY_3,
        PROXY_WALLET_3: process.env.TESTNET_PROXY_WALLET_3,
        WALLET_ADDRESS_4: process.env.TESTNET_WALLET_ADDRESS_4,
        PRIVATE_KEY_4: process.env.TESTNET_PRIVATE_KEY_4,
        PROXY_WALLET_4: process.env.TESTNET_PROXY_WALLET_4,
        WALLET_ADDRESS_5: process.env.TESTNET_WALLET_ADDRESS_5,
        PRIVATE_KEY_5: process.env.TESTNET_PRIVATE_KEY_5,
        PROXY_WALLET_5: process.env.TESTNET_PROXY_WALLET_5
    },
    mainnet: {
        EVENT_API_URL: 'https://api.forkast.gg/api/v1/markets',
        LOGIN_API_URL: 'https://api.forkast.gg/api/v1/auth', // Not used - using SDK directly
        ORDER_API_URL: 'https://api.forkast.gg/api/v1/order/place/v2', // Not used - using SDK directly
        ORDER_BOOK_API_URL: 'https://api.forkast.gg/api/v1/orderbook',
        WALLET_ADDRESS_3: process.env.MAINNET_WALLET_ADDRESS_3,
        PRIVATE_KEY_3: process.env.MAINNET_PRIVATE_KEY_3,
        PROXY_WALLET_3: process.env.MAINNET_PROXY_WALLET_3,
        WALLET_ADDRESS_4: process.env.MAINNET_WALLET_ADDRESS_4,
        PRIVATE_KEY_4: process.env.MAINNET_PRIVATE_KEY_4,
        PROXY_WALLET_4: process.env.MAINNET_PROXY_WALLET_4,
        WALLET_ADDRESS_5: process.env.MAINNET_WALLET_ADDRESS_5,
        PRIVATE_KEY_5: process.env.MAINNET_PRIVATE_KEY_5,
        PROXY_WALLET_5: process.env.MAINNET_PROXY_WALLET_5
    }
};

const EVENT_API_URL = CONFIG[NETWORK].EVENT_API_URL;
const LOGIN_API_URL = CONFIG[NETWORK].LOGIN_API_URL;
const ORDER_API_URL = CONFIG[NETWORK].ORDER_API_URL;
const ORDER_BOOK_API_URL = CONFIG[NETWORK].ORDER_BOOK_API_URL;

// CUSTOM MARKET CONFIGURATION - Will be filled by user input
let CUSTOM_MARKET_IDS: number[] = [];

// CUSTOM ORDER CONFIGURATION
const CUSTOM_ORDER_CONFIG = {
    TARGET_SPREAD: 0.01,           // Target spread to maintain
    TOP_ORDER_AMOUNT: 5,           // 5 shares for top orders (instead of 20)
    SECONDARY_ORDER_AMOUNTS: [3, 2], // 3 and 2 shares for secondary orders (instead of 5, 5, 5)
    MIN_ACCEPTABLE_PRICE: 0.06,    // Skip orders ≤ $0.05
    MAX_RETRIES: 5,                // Maximum retry attempts
    REQUEST_DELAY: 1000,           // 1 second delay between requests
    EXPONENTIAL_BACKOFF_BASE: 2,   // Base for exponential backoff
    MAX_BACKOFF_DELAY: 30000,      // Maximum backoff delay (30 seconds)
    RATE_LIMIT_WINDOW: 60000,      // Rate limit window (1 minute)
    MAX_REQUESTS_PER_WINDOW: 30,   // Maximum requests per window
    CONSECUTIVE_ERROR_THRESHOLD: 5, // Consecutive errors before backoff
    HEALTH_CHECK_INTERVAL: 300000, // Health check interval (5 minutes)
    DELAY_BETWEEN_MARKETS: 10000,  // 10 seconds delay between markets
    COOLDOWN_PERIOD: 10000,        // 10 seconds cooldown after placing orders
    ITERATION_DELAY: 300000        // 5 minutes between iterations
};

// Rate Limiter Class
class RateLimiter {
    private requestCount = 0;
    private windowStart = Date.now();
    private consecutiveErrors = 0;
    private lastErrorTime = 0;

    async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        
        // Reset window if needed
        if (now - this.windowStart >= CUSTOM_ORDER_CONFIG.RATE_LIMIT_WINDOW) {
            this.requestCount = 0;
            this.windowStart = now;
        }
        
        // Check if we've exceeded the rate limit
        if (this.requestCount >= CUSTOM_ORDER_CONFIG.MAX_REQUESTS_PER_WINDOW) {
            const waitTime = CUSTOM_ORDER_CONFIG.RATE_LIMIT_WINDOW - (now - this.windowStart);
            if (waitTime > 0) {
                console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                this.requestCount = 0;
                this.windowStart = Date.now();
            }
        }
        
        // Add request delay
        await new Promise(resolve => setTimeout(resolve, CUSTOM_ORDER_CONFIG.REQUEST_DELAY));
        this.requestCount++;
    }

    async handleError(error: any): Promise<number> {
        this.consecutiveErrors++;
        this.lastErrorTime = Date.now();
        
        const delay = Math.min(
            CUSTOM_ORDER_CONFIG.REQUEST_DELAY * Math.pow(CUSTOM_ORDER_CONFIG.EXPONENTIAL_BACKOFF_BASE, this.consecutiveErrors),
            CUSTOM_ORDER_CONFIG.MAX_BACKOFF_DELAY
        );
        
        console.log(`⚠️  Error occurred, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return delay;
    }

    resetErrorCount(): void {
        this.consecutiveErrors = 0;
    }

    getConsecutiveErrors(): number {
        return this.consecutiveErrors;
    }
}

const rateLimiter = new RateLimiter();

// Function to get market IDs from user input
async function getMarketIdsFromUser(): Promise<number[]> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        console.log('\n🎯 CUSTOM MARKET ID INPUT');
        console.log('='.repeat(50));
        console.log('Please enter the market IDs you want to monitor.');
        console.log('You can enter multiple IDs separated by commas.');
        console.log('Examples:');
        console.log('  - Single market: 647');
        console.log('  - Multiple markets: 647, 646, 645');
        console.log('  - Range: 647-650 (will include 647, 648, 649, 650)');
        console.log('='.repeat(50));
        
        rl.question('\n📝 Enter market IDs: ', (input) => {
            rl.close();
            
            const marketIds: number[] = [];
            const parts = input.split(',').map(part => part.trim());
            
            for (const part of parts) {
                if (part.includes('-')) {
                    // Handle range (e.g., "647-650")
                    const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                    if (!isNaN(start) && !isNaN(end)) {
                        for (let i = start; i <= end; i++) {
                            marketIds.push(i);
                        }
                    }
                } else {
                    // Handle single number
                    const num = parseInt(part);
                    if (!isNaN(num)) {
                        marketIds.push(num);
                    }
                }
            }
            
            // Remove duplicates and sort
            const uniqueMarketIds = [...new Set(marketIds)].sort((a, b) => b - a);
            
            if (uniqueMarketIds.length === 0) {
                console.log('❌ No valid market IDs entered. Please try again.');
                resolve(getMarketIdsFromUser());
            } else {
                console.log(`\n✅ Configured ${uniqueMarketIds.length} market IDs:`);
                console.log(`   Market IDs: ${uniqueMarketIds.join(', ')}`);
                resolve(uniqueMarketIds);
            }
        });
    });
}

// Order Book Logger Class
class OrderBookLogger {
    private logFile: string;
    private sessionStartTime: Date;
    private totalMoneySpent: number = 0;
    private totalOrdersPlaced: number = 0;
    private totalMarketsProcessed: number = 0;
    private operationSummaries: Array<{marketId: number, cost: number, orders: number, timestamp: string}> = [];

    constructor() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFile = path.join(__dirname, 'custom_market_logs', `custom_market_${timestamp}.json`);
        this.sessionStartTime = new Date();
        
        // Create logs directory if it doesn't exist
        const logsDir = path.dirname(this.logFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        console.log(`📝 Custom market monitor log created: ${this.logFile}`);
    }

    logOperationSummary(marketId: number, cost: number, orders: number): void {
        this.totalMoneySpent += cost;
        this.totalOrdersPlaced += orders;
        this.totalMarketsProcessed++;
        
        const summary = {
            marketId,
            cost,
            orders,
            timestamp: new Date().toISOString()
        };
        
        this.operationSummaries.push(summary);
        
        console.log(`💰 Operation Summary: Market ${marketId} - $${cost.toFixed(2)} spent on ${orders} orders`);
    }

    logSessionSummary(): void {
        const sessionData = {
            sessionStartTime: this.sessionStartTime.toISOString(),
            sessionEndTime: new Date().toISOString(),
            totalMoneySpent: this.totalMoneySpent,
            totalOrdersPlaced: this.totalOrdersPlaced,
            totalMarketsProcessed: this.totalMarketsProcessed,
            operationSummaries: this.operationSummaries
        };
        
        fs.writeFileSync(this.logFile, JSON.stringify(sessionData, null, 2));
        
        console.log(`\n🏁 SESSION SUMMARY:`);
        console.log(`   Duration: ${Math.floor((Date.now() - this.sessionStartTime.getTime()) / 60000)} minutes`);
        console.log(`   Total Markets Processed: ${this.totalMarketsProcessed}`);
        console.log(`   Total Orders Placed: ${this.totalOrdersPlaced}`);
        console.log(`   Total Money Spent: $${this.totalMoneySpent.toFixed(2)}`);
        console.log(`   Markets with Orders: ${this.operationSummaries.length}`);
        console.log(`   Log File: ${this.logFile}`);
    }

    getSessionStartTime(): Date {
        return this.sessionStartTime;
    }
}

function getRandomWallet(): { walletNumber: number, walletConfig: any } {
    const walletNumbers = [3, 4, 5];
    const randomWalletNumber = walletNumbers[Math.floor(Math.random() * walletNumbers.length)];
    
    const walletConfig = {
        WALLET_ADDRESS: CONFIG[NETWORK][`WALLET_ADDRESS_${randomWalletNumber}`],
        PRIVATE_KEY: CONFIG[NETWORK][`PRIVATE_KEY_${randomWalletNumber}`],
        PROXY_WALLET: CONFIG[NETWORK][`PROXY_WALLET_${randomWalletNumber}`]
    };
    
    return { walletNumber: randomWalletNumber, walletConfig };
}

// Function to validate wallet configuration
function validateWalletConfig(): boolean {
    const requiredWallets = [3, 4, 5];
    const missingWallets = [];
    
    for (const walletNum of requiredWallets) {
        if (!CONFIG[NETWORK][`WALLET_ADDRESS_${walletNum}`] || 
            !CONFIG[NETWORK][`PRIVATE_KEY_${walletNum}`] ||
            !CONFIG[NETWORK][`PROXY_WALLET_${walletNum}`]) {
            missingWallets.push(walletNum);
        }
    }
    
    if (missingWallets.length > 0) {
        console.error(`❌ Missing wallet configuration for wallets: ${missingWallets.join(', ')}`);
        return false;
    }
    
    console.log(`✅ All three wallets (3, 4, 5) are properly configured`);
    return true;
}

async function loginAndGetAccessToken(privateKey: string): Promise<string> {
    let retries = 0;
    const maxRetries = CUSTOM_ORDER_CONFIG.MAX_RETRIES;
    
    while (retries < maxRetries) {
        try {
            await rateLimiter.waitForRateLimit();
            
            // Use ForkastSDK for authentication instead of HTTP calls
            const loginResponse = await sdk.getAccountService().loginWithPrivateKey(privateKey);
            rateLimiter.resetErrorCount();
            return loginResponse.accessToken;
        } catch (e: any) {
            const delay = await rateLimiter.handleError(e);
            retries++;
            
            if (retries >= maxRetries) {
                console.error(`❌ Login failed after ${maxRetries} retries:`, e.message);
                throw new Error(`Failed to login after ${maxRetries} retries: ${e.message}`);
            }
        }
    }
    throw new Error('Failed to login after multiple retries.');
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
    let retries = 0;
    const maxRetries = CUSTOM_ORDER_CONFIG.MAX_RETRIES;
    
    while (retries < maxRetries) {
        try {
            await rateLimiter.waitForRateLimit();
            const response = await axios.get(url, { 
                params,
                timeout: 30000 // 30 second timeout
            });
            rateLimiter.resetErrorCount();
            return response.data;
        } catch (e: any) {
            const delay = await rateLimiter.handleError(e);
            retries++;
            
            if (retries >= maxRetries) {
                console.error(`❌ HTTP GET failed after ${maxRetries} retries:`, e.message);
                throw new Error(`Failed to fetch data after ${maxRetries} retries: ${e.message}`);
            }
        }
    }
    throw new Error('Failed to fetch data after multiple retries.');
}

async function fetchMarketById(marketId: number) {
    let retries = 0;
    const maxRetries = CUSTOM_ORDER_CONFIG.MAX_RETRIES;
    
    while (retries < maxRetries) {
        try {
            await rateLimiter.waitForRateLimit();
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
                
                if (inactiveLike.some(status => market.status?.toLowerCase().includes(status))) {
                    console.log(`   ⏭️  Market ${marketId} is not active (status: ${market.status}), skipping...`);
                    return null;
                }
                
                if (activeLike.some(status => market.status?.toLowerCase().includes(status)) || !market.status) {
                    return market;
                }
            }
            
            return null;
        } catch (e: any) {
            const delay = await rateLimiter.handleError(e);
            retries++;
            
            if (retries >= maxRetries) {
                console.error(`   ⚠️  Error fetching market ${marketId} after ${maxRetries} retries:`, e.message);
                return null;
            }
        }
    }
    return null;
}

async function fetchOrderBook(marketId: number, outcomeId: number, outcomeType: number) {
    let retries = 0;
    const maxRetries = CUSTOM_ORDER_CONFIG.MAX_RETRIES;
    
    while (retries < maxRetries) {
        try {
            await rateLimiter.waitForRateLimit();
            const response = await axios.get(ORDER_BOOK_API_URL, {
                params: {
                    marketId: marketId,
                    outcomeId: outcomeId,
                    outcomeType: outcomeType
                },
                timeout: 30000 // 30 second timeout
            });
            rateLimiter.resetErrorCount();
            return response.data;
        } catch (e: any) {
            const delay = await rateLimiter.handleError(e);
            retries++;
            
            if (retries >= maxRetries) {
                console.error(`   ⚠️  Error fetching order book after ${maxRetries} retries:`, e.message);
                return null;
            }
        }
    }
    return null;
}

async function placeOrder(orderBody: any) {
    let retries = 0;
    const maxRetries = CUSTOM_ORDER_CONFIG.MAX_RETRIES;
    
    while (retries < maxRetries) {
        try {
            await rateLimiter.waitForRateLimit();
            
            // Add unique salt to prevent duplicate order errors
            const timestamp = Date.now();
            const randomSalt = Math.floor(Math.random() * 1000000);
            const uniqueSalt = `${timestamp}_${randomSalt}`;
            
            // Add salt to order body if not present
            if (!orderBody.salt) {
                orderBody.salt = uniqueSalt;
            }
            
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
            rateLimiter.resetErrorCount();
            return response;
        } catch (e: any) {
            if (e?.response?.data?.message?.includes('salt or signature already exists')) {
                console.error('❌ Duplicate order detected - salt/signature already exists');
                return { success: false, error: 'DUPLICATE_ORDER', message: 'Order already exists' };
            } else if (e?.response?.status === 400) {
                console.error('❌ Bad request error:', e.response.data?.message || e.message);
                return { success: false, error: 'BAD_REQUEST', message: e.response.data?.message || e.message };
            }
            
            const delay = await rateLimiter.handleError(e);
            retries++;
            
            if (retries >= maxRetries) {
                console.error(`❌ Failed to place order after ${maxRetries} retries:`, e.message);
                return { success: false, error: 'UNKNOWN_ERROR', message: e.message };
            }
        }
    }
    return { success: false, error: 'UNKNOWN_ERROR', message: 'Failed after all retries' };
}

interface OrderBookAnalysis {
    bestAsk: number;
    bestBid: number;
    spread: number;
    suggestedOrders: Array<{price: number, amount: number, side: string}>;
}

function analyzeOrderBook(orderBook: any, outcomeType: number): OrderBookAnalysis {
    const asks = orderBook.asks || [];
    const bids = orderBook.bids || [];
    
    const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 0;
    const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0;
    const spread = bestAsk - bestBid;
    
    const suggestedOrders: Array<{price: number, amount: number, side: string}> = [];
    
    // Custom order strategy: 5 shares on top, then 3 and 2 shares
    if (bestAsk > 0 && bestBid > 0) {
        // Place order just below best ask
        const targetPrice = Math.max(bestAsk - 0.01, bestBid + 0.01);
        if (targetPrice >= CUSTOM_ORDER_CONFIG.MIN_ACCEPTABLE_PRICE) {
            suggestedOrders.push({
                price: targetPrice,
                amount: CUSTOM_ORDER_CONFIG.TOP_ORDER_AMOUNT, // 5 shares
                side: 'BUY'
            });
        }
        
        // Place secondary orders with smaller amounts
        const secondaryPrices = [targetPrice - 0.01, targetPrice - 0.02];
        CUSTOM_ORDER_CONFIG.SECONDARY_ORDER_AMOUNTS.forEach((amount, index) => {
            if (secondaryPrices[index] && secondaryPrices[index] >= CUSTOM_ORDER_CONFIG.MIN_ACCEPTABLE_PRICE) {
                suggestedOrders.push({
                    price: secondaryPrices[index],
                    amount: amount, // 3 or 2 shares
                    side: 'BUY'
                });
            }
        });
    }
    
    return {
        bestAsk,
        bestBid,
        spread,
        suggestedOrders
    };
}

async function placeOrderBookOrders(marketId: number, yesAnalysis: OrderBookAnalysis, noAnalysis: OrderBookAnalysis, logger: OrderBookLogger) {
    try {
        // Login all three wallets (3, 4, 5)
        const wallet3AccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY_3);
        const wallet4AccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY_4);
        const wallet5AccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY_5);
        
        const wallet3Account = getAccount(
            CONFIG[NETWORK].WALLET_ADDRESS_3,
            CONFIG[NETWORK].PRIVATE_KEY_3,
            CONFIG[NETWORK].PROXY_WALLET_3,
            wallet3AccessToken
        );
        
        const wallet4Account = getAccount(
            CONFIG[NETWORK].WALLET_ADDRESS_4,
            CONFIG[NETWORK].PRIVATE_KEY_4,
            CONFIG[NETWORK].PROXY_WALLET_4,
            wallet4AccessToken
        );
        
        const wallet5Account = getAccount(
            CONFIG[NETWORK].WALLET_ADDRESS_5,
            CONFIG[NETWORK].PRIVATE_KEY_5,
            CONFIG[NETWORK].PROXY_WALLET_5,
            wallet5AccessToken
        );
        
        let totalOrdersPlaced = 0;
        
        // Place YES orders (Random Wallet from 3, 4, 5)
        for (const order of yesAnalysis.suggestedOrders) {
            const { walletNumber, walletConfig } = getRandomWallet();
            const randomWalletAccount = getAccount(
                walletConfig.WALLET_ADDRESS,
                walletConfig.PRIVATE_KEY,
                walletConfig.PROXY_WALLET,
                walletNumber === 3 ? wallet3AccessToken : walletNumber === 4 ? wallet4AccessToken : wallet5AccessToken
            );
            
            const orderBody = {
                marketId: marketId,
                token: { id: "1995", title: "Yes", price: order.price, tokenId: "77322469486036420020650480212338198037797768092955943145929601220323444389872", outcomeType: 1 },
                account: randomWalletAccount,
                price: order.price,
                amount: order.amount,
                side: 0, // 0 for buy
                accessToken: randomWalletAccount.accessToken
            };
            
            const result = await placeOrder(orderBody);
            if (result.success !== false) {
                totalOrdersPlaced++;
                console.log(`   ✅ YES ${order.side} order at $${order.price} for ${order.amount} shares (Wallet ${walletNumber}: ${randomWalletAccount.wallet.substring(0, 8)}...)`);
            } else if (result.error === 'DUPLICATE_ORDER') {
                console.log(`   ⚠️  YES order at $${order.price} already exists, skipping...`);
                // Don't count duplicate orders as failures
            } else {
                const errorMessage = (result as any).message || (result as any).error || 'Unknown error';
                console.error(`   ❌ Failed to place YES order at $${order.price}: ${errorMessage}`);
            }
            
            // Longer delay between orders to prevent duplicates
            await new Promise(res => setTimeout(res, 2000));
        }
        
        // Place NO orders (Random Wallet from 3, 4, 5)
        for (const order of noAnalysis.suggestedOrders) {
            const { walletNumber, walletConfig } = getRandomWallet();
            const randomWalletAccount = getAccount(
                walletConfig.WALLET_ADDRESS,
                walletConfig.PRIVATE_KEY,
                walletConfig.PROXY_WALLET,
                walletNumber === 3 ? wallet3AccessToken : walletNumber === 4 ? wallet4AccessToken : wallet5AccessToken
            );
            
            const orderBody = {
                marketId: marketId,
                token: { id: "1996", title: "No", price: order.price, tokenId: "1034859257609999417450041259666289468268682787610660758393668604449778380951", outcomeType: 0 },
                account: randomWalletAccount,
                price: order.price,
                amount: order.amount,
                side: 0, // 0 for buy
                accessToken: randomWalletAccount.accessToken
            };
            
            const result = await placeOrder(orderBody);
            if (result.success !== false) {
                totalOrdersPlaced++;
                console.log(`   ✅ NO ${order.side} order at $${order.price} for ${order.amount} shares (Wallet ${walletNumber}: ${randomWalletAccount.wallet.substring(0, 8)}...)`);
            } else if (result.error === 'DUPLICATE_ORDER') {
                console.log(`   ⚠️  NO order at $${order.price} already exists, skipping...`);
                // Don't count duplicate orders as failures
            } else {
                const errorMessage = (result as any).message || (result as any).error || 'Unknown error';
                console.error(`   ❌ Failed to place NO order at $${order.price}: ${errorMessage}`);
            }
            
            // Longer delay between orders to prevent duplicates
            await new Promise(res => setTimeout(res, 2000));
        }
        
        console.log(`\n✅ Order book orders placed for Market ${marketId}:`);
        console.log(`   Total Orders: ${totalOrdersPlaced}`);
        console.log(`   YES Orders: ${yesAnalysis.suggestedOrders.length}`);
        console.log(`   NO Orders: ${noAnalysis.suggestedOrders.length}`);
        
        // Calculate total cost for this operation
        const totalCost = yesAnalysis.suggestedOrders.reduce((sum, order) => sum + (order.price * order.amount), 0) +
                         noAnalysis.suggestedOrders.reduce((sum, order) => sum + (order.price * order.amount), 0);
        
        // Log operation summary
        if (totalOrdersPlaced > 0) {
            logger.logOperationSummary(marketId, totalCost, totalOrdersPlaced);
        }
        
        return totalOrdersPlaced;
    } catch (error: any) {
        console.error(`❌ Error placing order book orders for market ${marketId}:`, error.message);
        return 0;
    }
}

async function monitorCustomMarkets() {
    const logger = new OrderBookLogger();
    
    console.log('='.repeat(70));
    console.log('🎯 CUSTOM MARKET MONITOR - SPECIFIC MARKET IDS');
    console.log('='.repeat(70));
    console.log(`🎯 Target Spread: $${CUSTOM_ORDER_CONFIG.TARGET_SPREAD}`);
    console.log(`💰 Top Order Amount: ${CUSTOM_ORDER_CONFIG.TOP_ORDER_AMOUNT} shares`);
    console.log(`📊 Secondary Order Amounts: ${CUSTOM_ORDER_CONFIG.SECONDARY_ORDER_AMOUNTS.join(', ')} shares`);
    console.log(`🚫 Min Acceptable Price: $${CUSTOM_ORDER_CONFIG.MIN_ACCEPTABLE_PRICE} (skip orders ≤ $0.05)`);
    console.log(`⏱️  Iteration Interval: ${CUSTOM_ORDER_CONFIG.ITERATION_DELAY / 60000} minutes`);
    console.log(`🐌 Market Processing: ${CUSTOM_ORDER_CONFIG.DELAY_BETWEEN_MARKETS / 1000}s delay between markets`);
    console.log(`⏳ Cooldown Period: ${CUSTOM_ORDER_CONFIG.COOLDOWN_PERIOD / 1000}s after placing orders`);
    console.log(`🌐 Network: ${NETWORK}`);
    console.log('='.repeat(70));
    
    // Get market IDs from user input
    CUSTOM_MARKET_IDS = await getMarketIdsFromUser();
    
    // Validate wallet configuration before starting
    if (!validateWalletConfig()) {
        console.error('❌ Wallet configuration validation failed. Exiting...');
        process.exit(1);
    }
    
    console.log(`\n🎯 Monitoring ${CUSTOM_MARKET_IDS.length} custom markets:`);
    console.log(`   Market IDs: ${CUSTOM_MARKET_IDS.join(', ')}`);
    console.log('\n🚀 Starting custom market monitoring...\n');

    let isRunning = true;
    let iteration = 0;
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down custom market monitor...');
        isRunning = false;
        logger.logSessionSummary();
        
        // Calculate session statistics
        const sessionDuration = Date.now() - logger.getSessionStartTime().getTime();
        const sessionHours = Math.floor(sessionDuration / 3600000);
        const sessionMinutes = Math.floor((sessionDuration % 3600000) / 60000);
        const estimatedIterationsPerDay = Math.floor(24 * 60 * 60 * 1000 / CUSTOM_ORDER_CONFIG.ITERATION_DELAY);
        
        console.log(`\n📊 SESSION STATISTICS:`);
        console.log(`   ⏱️  Total Session Time: ${sessionHours}h ${sessionMinutes}m`);
        console.log(`   🔄 Iterations Completed: ${iteration}`);
        console.log(`   📅 Estimated Daily Iterations: ${estimatedIterationsPerDay}`);
        console.log(`   ⏰ Next Iteration Would Be: ${new Date(Date.now() + CUSTOM_ORDER_CONFIG.ITERATION_DELAY).toLocaleString()}`);
        
        process.exit(0);
    });

    while (isRunning) {
        iteration++;
        console.log(`\n🔄 Iteration ${iteration} - ${new Date().toLocaleString()}`);
        console.log('─'.repeat(50));
        
        let marketsProcessed = 0;
        let ordersPlaced = 0;
        
        for (const marketId of CUSTOM_MARKET_IDS) {
            if (!isRunning) break;
            
            marketsProcessed++;
            console.log(`\n🔍 Processing Market ${marketId} (${marketsProcessed}/${CUSTOM_MARKET_IDS.length})`);
            
            try {
                const market = await fetchMarketById(marketId);
                if (!market) {
                    console.log(`   ⚠️  Market ${marketId} not found or invalid, skipping...`);
                    continue;
                }
                
                console.log(`   📋 Market: ${market.title}`);
                console.log(`   🔍 Event ID: ${marketId}, Market ID: ${market.id}`);
                
                // Find YES and NO outcomes
                const yesOutcome = market.outcomes.find((outcome: any) => outcome.outcomeType === 1);
                const noOutcome = market.outcomes.find((outcome: any) => outcome.outcomeType === 0);
                
                if (!yesOutcome || !noOutcome) {
                    console.log(`   ⚠️  Market ${marketId} missing YES/NO outcomes, skipping...`);
                    continue;
                }
                
                console.log(`   🔍 Fetching YES order book: marketId=${market.id}, outcomeId=${yesOutcome.id}, outcomeType=1`);
                const yesOrderBook = await fetchOrderBook(market.id, yesOutcome.id, 1);
                
                console.log(`   🔍 Fetching NO order book: marketId=${market.id}, outcomeId=${noOutcome.id}, outcomeType=0`);
                const noOrderBook = await fetchOrderBook(market.id, noOutcome.id, 0);
                
                if (!yesOrderBook || !noOrderBook) {
                    console.log(`   ⚠️  Failed to fetch order books for market ${marketId}, skipping...`);
                    continue;
                }
                
                console.log(`   🔍 YES Order Book: ${JSON.stringify(yesOrderBook).substring(0, 100)}...`);
                console.log(`   🔍 NO Order Book: ${JSON.stringify(noOrderBook).substring(0, 100)}...`);
                
                // Analyze order books
                const yesAnalysis = analyzeOrderBook(yesOrderBook, 1);
                const noAnalysis = analyzeOrderBook(noOrderBook, 0);
                
                console.log(`   📊 YES Strategy: Best Ask $${yesAnalysis.bestAsk} → Place order at $${(yesAnalysis.bestAsk - 0.01).toFixed(2)} (spread: ${yesAnalysis.spread.toFixed(4)})`);
                console.log(`   📊 NO Strategy: Will coordinate with YES side to maintain ${CUSTOM_ORDER_CONFIG.TARGET_SPREAD} spread`);
                
                console.log(`   💰 YES: Best Ask $${yesAnalysis.bestAsk.toFixed(2)} | Best Bid $${yesAnalysis.bestBid.toFixed(2)} | Spread $${yesAnalysis.spread.toFixed(4)}`);
                console.log(`   💰 NO: Best Ask $${noAnalysis.bestAsk.toFixed(2)} | Best Bid $${noAnalysis.bestBid.toFixed(2)} | Spread $${noAnalysis.spread.toFixed(4)}`);
                console.log(`   📊 YES Gaps: ${yesAnalysis.suggestedOrders.length} | NO Gaps: ${noAnalysis.suggestedOrders.length}`);
                
                // Check if we should place orders
                const maxSpread = Math.max(yesAnalysis.spread, noAnalysis.spread);
                if (maxSpread > CUSTOM_ORDER_CONFIG.TARGET_SPREAD) {
                    console.log(`   🎯 Found opportunities to fill order book gaps`);
                    
                    // Show order summary
                    console.log(`\n📋 ORDER SUMMARY for Market ${marketId}:`);
                    console.log(`   YES Orders (${yesAnalysis.suggestedOrders.length}):`);
                    yesAnalysis.suggestedOrders.forEach((order, index) => {
                        console.log(`     ${index + 1}. BUY ${order.amount} shares at $${order.price.toFixed(2)}`);
                    });
                    console.log(`   NO Orders (${noAnalysis.suggestedOrders.length}):`);
                    noAnalysis.suggestedOrders.forEach((order, index) => {
                        console.log(`     ${index + 1}. BUY ${order.amount} shares at $${order.price.toFixed(2)}`);
                    });
                    
                    const totalOrders = yesAnalysis.suggestedOrders.length + noAnalysis.suggestedOrders.length;
                    const totalCost = yesAnalysis.suggestedOrders.reduce((sum, order) => sum + (order.price * order.amount), 0) +
                                     noAnalysis.suggestedOrders.reduce((sum, order) => sum + (order.price * order.amount), 0);
                    
                    console.log(`\n💰 Total Orders to Place: ${totalOrders}`);
                    console.log(`💵 Total Cost: $${totalCost.toFixed(2)} (estimated)`);
                    console.log(`   📝 Placing orders automatically...`);
                    console.log(`   📋 Market: ${market.title}`);
                    
                    // Place orders
                    const ordersPlacedThisMarket = await placeOrderBookOrders(marketId, yesAnalysis, noAnalysis, logger);
                    ordersPlaced += ordersPlacedThisMarket;
                    
                    if (ordersPlacedThisMarket > 0) {
                        console.log(`   ⏳ Waiting ${CUSTOM_ORDER_CONFIG.COOLDOWN_PERIOD / 1000} seconds before next market...`);
                        await new Promise(resolve => setTimeout(resolve, CUSTOM_ORDER_CONFIG.COOLDOWN_PERIOD));
                    }
                } else {
                    console.log(`   ✅ Market already has tight spreads: YES(${yesAnalysis.spread.toFixed(4)}) NO(${noAnalysis.spread.toFixed(4)})`);
                    console.log(`   ⏭️  No orders needed - market is already balanced (≤ ${CUSTOM_ORDER_CONFIG.TARGET_SPREAD})`);
                }
                
            } catch (error: any) {
                console.error(`   ❌ Error processing market ${marketId}:`, error.message);
            }
            
            // Delay between markets
            if (marketsProcessed < CUSTOM_MARKET_IDS.length) {
                console.log(`   ⏳ Waiting ${CUSTOM_ORDER_CONFIG.DELAY_BETWEEN_MARKETS / 1000} seconds before next market...`);
                await new Promise(resolve => setTimeout(resolve, CUSTOM_ORDER_CONFIG.DELAY_BETWEEN_MARKETS));
            }
        }
        
        console.log(`\n✅ Iteration ${iteration} completed:`);
        console.log(`   Markets Processed: ${marketsProcessed}`);
        console.log(`   Orders Placed: ${ordersPlaced}`);
        
        if (isRunning) {
            console.log(`\n⏳ Waiting ${CUSTOM_ORDER_CONFIG.ITERATION_DELAY / 60000} minutes before next iteration...`);
            await new Promise(resolve => setTimeout(resolve, CUSTOM_ORDER_CONFIG.ITERATION_DELAY));
        }
    }
}

// Start the custom market monitor
if (require.main === module) {
    monitorCustomMarkets().catch((error) => {
        console.error('❌ Fatal error in custom market monitor:', error);
        process.exit(1);
    });
}
