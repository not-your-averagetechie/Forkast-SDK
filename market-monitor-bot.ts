import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';


dotenv.config();

const NETWORK = process.env.NETWORK || 'mainnet';

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
        EVENT_API_URL: process.env.MAINNET_MARKET_API_URL,
        LOGIN_API_URL: process.env.MAINNET_ACCOUNT_API_URL,
        ORDER_API_URL: process.env.MAINNET_ORDER_API_URL,
        ORDER_BOOK_API_URL: process.env.ORDER_BOOK_API_URL || 'https://api.forkast.gg/api/v1/orderbook',
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

// Note: readline interface removed as it's no longer needed for user input

// Function to randomly select a wallet from wallets 3, 4, and 5
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
        console.error(`❌ Missing configuration for wallets: ${missingWallets.join(', ')}`);
        console.error(`   Please ensure all required environment variables are set:`);
        for (const walletNum of missingWallets) {
            console.error(`   - MAINNET_WALLET_ADDRESS_${walletNum}`);
            console.error(`   - MAINNET_PRIVATE_KEY_${walletNum}`);
            console.error(`   - MAINNET_PROXY_WALLET_${walletNum}`);
        }
        return false;
    }
    
    console.log(`✅ All three wallets (3, 4, 5) are properly configured`);
    return true;
}

// Function to automatically fetch the latest market ID
async function getLatestMarketId(): Promise<number> {
    try {
        console.log('🔍 Automatically fetching latest market ID...');
        
        // Use a more conservative approach - start with a known working market ID
        const fallbackId = parseInt(process.env.LATEST_MARKET_ID || '650');
        console.log(`✅ Using configured market ID: ${fallbackId}`);
        return fallbackId;
        
    } catch (error: any) {
        console.log(`⚠️  Error in market ID logic: ${error.message}`);
        const fallbackId = parseInt(process.env.LATEST_MARKET_ID || '650');
        console.log(`   Using fallback: ${fallbackId}`);
        return fallbackId;
    }
}

// Order book filling configuration
const ORDER_BOOK_CONFIG = {
    TARGET_SPREAD: 0.01, // Target spread between our orders
    ORDER_AMOUNT: 20, // Default order amount in shares
    MULTIPLE_ORDER_AMOUNTS: [20, 5, 5, 5], // Amounts for multiple orders (large, small, small, small)
    MAX_ORDERS_PER_SIDE: 2, // Maximum orders to place per side (1 strategic + 1 gap fill)
    MIN_PRICE_GAP: 0.05, // Minimum price gap to fill (significant gaps only)
    MIN_ACCEPTABLE_PRICE: 0.06, // Minimum price we're willing to place orders at (avoid very low prices)
    MONITORING_INTERVAL: 3600000, // 1 hour between iterations (changed from 30 seconds)
    MAX_MARKETS_TO_CHECK: 1000, // Check all available markets
    MAX_RETRIES: 3, // Maximum retry attempts for failed operations
    COOLDOWN_PERIOD: 10000, // 10 seconds cooldown after placing orders (increased from 5)
    DELAY_BETWEEN_MARKETS: 15000, // 15 seconds delay between processing each market (increased from 3)
    RATE_LIMIT_DELAY: 10000, // 10 seconds delay when rate limited (increased from 5)
    MAX_CONSECUTIVE_429: 3, // Maximum consecutive 429 errors before increasing delay
    ITERATION_DELAY: 3600000, // 1 hour delay between iterations (24 iterations per day)
};

// Enhanced logging functionality
class OrderBookLogger {
    private logFolderPath: string;
    private logFilePath: string;
    private orderBookLogFilePath: string;
    private totalOrdersPlaced: number = 0;
    private totalMarketsProcessed: number = 0;
    private sessionStartTime: Date;
    private marketsWithOrders: Set<number> = new Set(); // Track markets where we've placed orders

    constructor() {
        this.sessionStartTime = new Date();
        
        // Create logs folder if it doesn't exist
        this.logFolderPath = path.join(process.cwd(), 'order_book_logs');
        if (!fs.existsSync(this.logFolderPath)) {
            fs.mkdirSync(this.logFolderPath, { recursive: true });
        }

        // Create main log file
        const now = new Date();
        const dateTimeString = now.toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-')
            .substring(0, 19);
        
        this.logFilePath = path.join(this.logFolderPath, `order_book_bot_${dateTimeString}.json`);
        this.orderBookLogFilePath = path.join(this.logFolderPath, `order_book_analysis_${dateTimeString}.json`);
        
        // Initialize log files
        const initialData = {
            session_info: {
                start_time: now.toISOString(),
                network: NETWORK,
                config: ORDER_BOOK_CONFIG
            },
            total_orders_placed: 0,
            total_markets_processed: 0,
            markets_processed: [],
            orders_placed: []
        };
        
        const initialOrderBookData = {
            session_info: {
                start_time: now.toISOString(),
                network: NETWORK
            },
            order_book_analysis: []
        };
        
        fs.writeFileSync(this.logFilePath, JSON.stringify(initialData, null, 2));
        fs.writeFileSync(this.orderBookLogFilePath, JSON.stringify(initialOrderBookData, null, 2));
        
        console.log(`📝 Order book bot log created: ${this.logFilePath}`);
        console.log(`📊 Order book analysis log created: ${this.orderBookLogFilePath}`);
    }

    logOrderBookAnalysis(marketId: number, marketTitle: string, yesAnalysis: any, noAnalysis: any) {
        const analysisData = {
            timestamp: new Date().toISOString(),
            market_id: marketId,
            market_title: marketTitle,
            yes_side: yesAnalysis,
            no_side: noAnalysis
        };
        
        try {
            const data = JSON.parse(fs.readFileSync(this.orderBookLogFilePath, 'utf8'));
            data.order_book_analysis.push(analysisData);
            fs.writeFileSync(this.orderBookLogFilePath, JSON.stringify(data, null, 2));
        } catch (error: any) {
            console.error('Error updating order book analysis log:', error.message);
        }
    }

    logOrderPlaced(marketId: number, outcome: string, price: number, amount: number, wallet: string, side: string) {
        this.totalOrdersPlaced++;
        const orderData = {
            timestamp: new Date().toISOString(),
            market_id: marketId,
            outcome: outcome,
            price: price,
            amount: amount,
            wallet: wallet,
            side: side,
            total_cost: price * amount
        };
        
        try {
            const data = JSON.parse(fs.readFileSync(this.logFilePath, 'utf8'));
            data.orders_placed.push(orderData);
            data.total_orders_placed = this.totalOrdersPlaced;
            fs.writeFileSync(this.logFilePath, JSON.stringify(data, null, 2));
        } catch (error: any) {
            console.error('Error updating order log:', error.message);
        }
        
        console.log(`✅ Order placed: ${outcome} ${side} at $${price} for ${amount} shares (Wallet: ${wallet.substring(0, 8)}...)`);
    }

    logMarketProcessed(marketId: number, marketTitle: string, ordersPlaced: number) {
        this.totalMarketsProcessed++;
        const marketData = {
            timestamp: new Date().toISOString(),
            market_id: marketId,
            market_title: marketTitle,
            orders_placed: ordersPlaced
        };
        
        try {
            const data = JSON.parse(fs.readFileSync(this.logFilePath, 'utf8'));
            data.markets_processed.push(marketData);
            data.total_markets_processed = this.totalMarketsProcessed;
            fs.writeFileSync(this.logFilePath, JSON.stringify(data, null, 2));
        } catch (error: any) {
            console.error('Error updating market log:', error.message);
        }
    }

    hasPlacedOrdersForMarket(marketId: number): boolean {
        return this.marketsWithOrders.has(marketId);
    }

    markMarketAsProcessed(marketId: number) {
        this.marketsWithOrders.add(marketId);
    }

    logSessionSummary() {
        const now = new Date();
        const sessionDuration = now.getTime() - this.sessionStartTime.getTime();
        const durationMinutes = Math.floor(sessionDuration / 60000);
        
        console.log(`\n🏁 SESSION SUMMARY:`);
        console.log(`   Duration: ${durationMinutes} minutes`);
        console.log(`   Total Markets Processed: ${this.totalMarketsProcessed}`);
        console.log(`   Total Orders Placed: ${this.totalOrdersPlaced}`);
        console.log(`   Markets with Orders: ${this.marketsWithOrders.size}`);
        console.log(`   Log Files:`);
        console.log(`     Main Log: ${this.logFilePath}`);
        console.log(`     Order Book Analysis: ${this.orderBookLogFilePath}`);
    }
    
    // Public method to get session start time
    getSessionStartTime(): Date {
        return this.sessionStartTime;
    }
}

// Utility functions
async function loginAndGetAccessToken(privateKey: string): Promise<string> {
    let retries = 0;
    const maxRetries = ORDER_BOOK_CONFIG.MAX_RETRIES;
    const baseDelay = 1000;
    
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
                retries++;
                if (retries >= maxRetries) throw e;
                await new Promise(res => setTimeout(res, baseDelay));
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
    try {
        const res = await axios.get(url, { params });
        return res.data;
    } catch (e: any) {
        return null;
    }
}

async function fetchActiveMarkets(): Promise<any[]> {
    const latestMarketId = parseInt(process.env.LATEST_MARKET_ID || '600');
    const numToCheck = ORDER_BOOK_CONFIG.MAX_MARKETS_TO_CHECK;
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
        } catch (e) {
            // Ignore errors for missing events
        }
    }
    
    // Remove duplicates and filter for active markets
    marketsWithOutcomes = marketsWithOutcomes.filter((m: any, index: number, self: any[]) => 
        index === self.findIndex((t: any) => t.id === m.id)
    );
    
    const activeLike = ['active', 'open', 'trading', 'live'];
    const filtered = marketsWithOutcomes.filter((m: any) => {
        const s = String(m?.status || '').toLowerCase();
        return !s || activeLike.includes(s);
    });
    
    return filtered.length > 0 ? filtered : marketsWithOutcomes;
}

async function fetchMarketById(marketId: number) {
    try {
        // Use the same approach as the working implementations
        const response = await axios.get(EVENT_API_URL, { params: { id: marketId } });
        const event = response.data;
        
        if (!event || !Array.isArray(event.markets) || event.markets.length === 0) {
            return null;
        }
        
        // Find the market with matching ID, or use the first market from the event
        // This is the same logic used in market-spread-checker.ts
        const market = event.markets.find((m: any) => m.id === marketId) || event.markets[0];
        
        // Check if the market is active (same logic as fetchActiveMarkets)
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
            
            // Additional checks for resolved markets - only filter by actual status, not title keywords
            // The title-based filtering was too aggressive and was incorrectly filtering out active markets
            // We'll rely on the actual market status and order book activity instead
            
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

async function fetchOrderBook(marketId: number, outcomeId: number, outcomeType: number) {
    try {
        const response = await axios.get(ORDER_BOOK_API_URL, {
            params: { marketId, outcomeId, outcomeType }
        });
        return response.data;
    } catch (e: any) {
        console.error(`❌ Failed to fetch order book for market ${marketId}:`, e.message);
        return null;
    }
}

async function placeOrder(orderBody: any) {
    try {
        // Add unique salt to prevent duplicate order errors
        const timestamp = Date.now();
        const randomSalt = Math.floor(Math.random() * 1000000);
        const uniqueSalt = `${timestamp}_${randomSalt}`;
        
        // Add salt to order body if not present
        if (!orderBody.salt) {
            orderBody.salt = uniqueSalt;
        }
        
        const response = await axios.post(ORDER_API_URL, orderBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${orderBody.accessToken}`
            }
        });
        return response.data;
    } catch (e: any) {
        if (e?.response?.data?.message?.includes('salt or signature already exists')) {
            console.error('❌ Duplicate order detected - salt/signature already exists');
            console.error('   This usually means the order was already placed or there was a retry');
            return { success: false, error: 'DUPLICATE_ORDER', message: 'Order already exists' };
        } else if (e?.response?.status === 400) {
            console.error('❌ Bad request error:', e.response.data?.message || e.message);
            return { success: false, error: 'BAD_REQUEST', message: e.response.data?.message || e.message };
        } else {
            console.error('❌ Failed to place order:', e.message);
            return { success: false, error: 'UNKNOWN_ERROR', message: e.message };
        }
    }
}

interface OrderBookAnalysis {
    bestAsk: number;
    bestBid: number;
    spread: number;
    gaps: Array<{ price: number, size: number }>;
    suggestedOrders: Array<{ price: number, amount: number, side: string }>;
}

function analyzeOrderBook(orderBook: any, side: 'YES' | 'NO'): OrderBookAnalysis {
    try {
        /*
         * STRATEGY: Place orders to maintain 0.01 spread and fill significant gaps only
         * 1. Place 1 strategic order below best ask (bestAsk - 0.01)
         * 2. Place 1 additional order only if there's a significant gap (0.05 or more)
         * 3. This prevents placing orders that would get matched immediately
         * 4. Example: YES at 0.14, NO at 0.85 creates 0.01 spread
         */
        const asks = orderBook.asks || [];
        const bids = orderBook.bids || [];
        
        // Parse prices as numbers (they come as strings from API)
        const parsedAsks = asks.map((ask: any) => ({
            price: parseFloat(ask.price),
            size: parseFloat(ask.size)
        })).filter((ask: any) => !isNaN(ask.price) && !isNaN(ask.size));
        
        const parsedBids = bids.map((bid: any) => ({
            price: parseFloat(bid.price),
            size: parseFloat(bid.size)
        })).filter((bid: any) => !isNaN(bid.price) && !isNaN(bid.size));
        
        // Sort by price (asks ascending, bids descending)
        parsedAsks.sort((a, b) => a.price - b.price);
        parsedBids.sort((a, b) => b.price - a.price);
        
        // Get best ask and best bid
        const bestAsk = parsedAsks.length > 0 ? parsedAsks[0].price : 0.5;
        const bestBid = parsedBids.length > 0 ? parsedBids[0].price : 0.5;
        
        // Calculate spread only if we have both asks and bids
        let spread: number;
        if (parsedAsks.length > 0 && parsedBids.length > 0) {
            spread = bestAsk - bestBid;
        } else if (parsedAsks.length > 0) {
            // Only asks available - use a reasonable default spread
            spread = 0.5; // This indicates we only have one side
        } else if (parsedBids.length > 0) {
            // Only bids available - use a reasonable default spread
            spread = 0.5; // This indicates we only have one side
        } else {
            // No orders at all
            spread = 1.0; // Maximum possible spread
        }
        
        // Find gaps in the order book
        const gaps: Array<{ price: number, size: number }> = [];
        const suggestedOrders: Array<{ price: number, amount: number, side: string }> = [];
        
        if (side === 'YES') {
            // For YES side: place order below the best ask to maintain tight spread
            if (parsedAsks.length > 0) {
                // Place order at bestAsk - 0.01 to maintain 0.01 spread
                const strategicPrice = parseFloat((bestAsk - 0.01).toFixed(4));
                if (strategicPrice > 0.01) {
                    suggestedOrders.push({ 
                        price: strategicPrice, 
                        amount: ORDER_BOOK_CONFIG.ORDER_AMOUNT, 
                        side: 'BUY' 
                    });
                    
                    // Log the strategy
                    console.log(`   📊 YES Strategy: Best Ask $${bestAsk} → Place order at $${strategicPrice} (spread: 0.01)`);
                }
            }
            
            // Only place additional orders if there are significant gaps (0.05 or more)
            // This prevents placing orders that would get matched immediately
            let additionalOrdersPlaced = 0;
            for (let i = 0; i < Math.min(parsedAsks.length - 1, ORDER_BOOK_CONFIG.MAX_ORDERS_PER_SIDE - 1); i++) {
                if (additionalOrdersPlaced >= 1) break; // Only place 1 additional order max
                
                const currentPrice = parsedAsks[i].price;
                const nextPrice = parsedAsks[i + 1].price;
                
                // Only place orders if there's a significant gap (0.05 or more)
                if (nextPrice - currentPrice > 0.05) {
                    const gapPrice = parseFloat((currentPrice + 0.01).toFixed(4));
                    gaps.push({ price: gapPrice, size: ORDER_BOOK_CONFIG.ORDER_AMOUNT });
                    suggestedOrders.push({ 
                        price: gapPrice, 
                        amount: ORDER_BOOK_CONFIG.ORDER_AMOUNT, 
                        side: 'BUY' 
                    });
                    console.log(`   📊 YES Gap Fill: Gap between $${currentPrice} and $${nextPrice} → Place order at $${gapPrice}`);
                    additionalOrdersPlaced++;
                }
            }
        } else {
            // For NO side: we need to coordinate with YES side to maintain 0.01 spread
            // This will be handled in the main function after we know both YES and NO prices
            if (parsedAsks.length > 0) {
                // For now, just log that we'll coordinate the price
                console.log(`   📊 NO Strategy: Will coordinate with YES side to maintain 0.01 spread`);
            }
            
            // Only place additional orders if there are significant gaps (0.05 or more)
            // This prevents placing orders that would get matched immediately
            let additionalOrdersPlaced = 0;
            for (let i = 0; i < Math.min(parsedAsks.length - 1, ORDER_BOOK_CONFIG.MAX_ORDERS_PER_SIDE - 1); i++) {
                if (additionalOrdersPlaced >= 1) break; // Only place 1 additional order max
                
                const currentPrice = parsedAsks[i].price;
                const nextPrice = parsedAsks[i + 1].price;
                
                // Only place orders if there's a significant gap (0.05 or more)
                if (nextPrice - currentPrice > 0.05) {
                    const gapPrice = parseFloat((currentPrice + 0.01).toFixed(4));
                    gaps.push({ price: gapPrice, size: ORDER_BOOK_CONFIG.ORDER_AMOUNT });
                    suggestedOrders.push({ 
                        price: gapPrice, 
                        amount: ORDER_BOOK_CONFIG.ORDER_AMOUNT, 
                        side: 'BUY' 
                    });
                    console.log(`   📊 NO Gap Fill: Gap between $${currentPrice} and $${nextPrice} → Place order at $${gapPrice}`);
                    additionalOrdersPlaced++;
                }
            }
        }
        
        return { bestAsk, bestBid, spread, gaps, suggestedOrders };
    } catch (error: any) {
        console.error(`❌ Error analyzing order book for ${side} side:`, error.message);
        // Return safe defaults
        return { 
            bestAsk: 0.5, 
            bestBid: 0.5, 
            spread: 0, 
            gaps: [], 
            suggestedOrders: [] 
        };
    }
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

        // Fetch market to get outcomes
        // Note: marketId here is the event ID, we need to get the actual market
        const market = await fetchMarketById(marketId);
        if (!market) {
            console.error(`❌ Market ${marketId} not found`);
            return 0;
        }

        const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
        const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
        
        if (!yesOutcome || !noOutcome) {
            console.error(`❌ Market ${marketId} does not have both Yes and No outcomes`);
            return 0;
        }

        let totalOrdersPlaced = 0;

        // Place YES orders (Random Wallet from 3, 4, 5)
        console.log(`\n📝 Placing YES orders for Market ${marketId}:`);
        for (const order of yesAnalysis.suggestedOrders) {
            // Randomly select a wallet for each YES order
            const { walletNumber, walletConfig } = getRandomWallet();
            const randomWalletAccount = getAccount(
                walletConfig.WALLET_ADDRESS,
                walletConfig.PRIVATE_KEY,
                walletConfig.PROXY_WALLET,
                walletNumber === 3 ? wallet3AccessToken : walletNumber === 4 ? wallet4AccessToken : wallet5AccessToken
            );
            
            const orderBody = {
                marketId: market.id, // Use actual market ID, not event ID
                token: yesOutcome,
                account: randomWalletAccount,
                price: order.price,
                amount: order.amount,
                side: 0, // 0 for buy
                accessToken: randomWalletAccount.accessToken
            };
            
            const result = await placeOrder(orderBody);
            if (result.success !== false) {
                logger.logOrderPlaced(marketId, 'YES', order.price, order.amount, randomWalletAccount.wallet, order.side);
                totalOrdersPlaced++;
                console.log(`   ✅ YES ${order.side} order at $${order.price} for ${order.amount} shares (Wallet ${walletNumber}: ${randomWalletAccount.wallet.substring(0, 8)}...)`);
            } else if (result.error === 'DUPLICATE_ORDER') {
                console.log(`   ⚠️  YES order at $${order.price} already exists, skipping...`);
                // Don't count duplicate orders as failures
            } else {
                console.error(`   ❌ Failed to place YES order at $${order.price}: ${result.message}`);
            }
            
            // Longer delay between orders to prevent duplicates
            await new Promise(res => setTimeout(res, 2000));
        }

        // Place NO orders (Random Wallet from 3, 4, 5)
        console.log(`\n📝 Placing NO orders for Market ${marketId}:`);
        for (const order of noAnalysis.suggestedOrders) {
            // Randomly select a wallet for each NO order
            const { walletNumber, walletConfig } = getRandomWallet();
            const randomWalletAccount = getAccount(
                walletConfig.WALLET_ADDRESS,
                walletConfig.PRIVATE_KEY,
                walletConfig.PROXY_WALLET,
                walletNumber === 3 ? wallet3AccessToken : walletNumber === 4 ? wallet4AccessToken : wallet5AccessToken
            );
            
            const orderBody = {
                marketId: market.id, // Use actual market ID, not event ID
                token: noOutcome,
                account: randomWalletAccount,
                price: order.price,
                amount: order.amount,
                side: 0, // 0 for buy
                accessToken: randomWalletAccount.accessToken
            };
            
            const result = await placeOrder(orderBody);
            if (result.success !== false) {
                logger.logOrderPlaced(marketId, 'NO', order.price, order.amount, randomWalletAccount.wallet, order.side);
                totalOrdersPlaced++;
                console.log(`   ✅ NO ${order.side} order at $${order.price} for ${order.amount} shares (Wallet ${walletNumber}: ${randomWalletAccount.wallet.substring(0, 8)}...)`);
            } else if (result.error === 'DUPLICATE_ORDER') {
                console.log(`   ⚠️  NO order at $${order.price} already exists, skipping...`);
                // Don't count duplicate orders as failures
            } else {
                console.error(`   ❌ Failed to place NO order at $${order.price}: ${result.message}`);
            }
            
            // Longer delay between orders to prevent duplicates
            await new Promise(res => setTimeout(res, 2000));
        }

        console.log(`\n✅ Order book orders placed for Market ${marketId}:`);
        console.log(`   Total Orders: ${totalOrdersPlaced}`);
        console.log(`   YES Orders: ${yesAnalysis.suggestedOrders.length}`);
        console.log(`   NO Orders: ${noAnalysis.suggestedOrders.length}`);
        
        return totalOrdersPlaced;
    } catch (error: any) {
        console.error(`❌ Error placing order book orders for market ${marketId}:`, error.message);
        return 0;
    }
}

async function monitorOrderBooks() {
    const logger = new OrderBookLogger();
    
    console.log('='.repeat(70));
    console.log('📚 ORDER BOOK FILLING BOT - DESCENDING MARKET SCRAPING');
    console.log('='.repeat(70));
    console.log(`🎯 Target Spread: $${ORDER_BOOK_CONFIG.TARGET_SPREAD}`);
    console.log(`💰 Order Amount: ${ORDER_BOOK_CONFIG.ORDER_AMOUNT} shares`);
    console.log(`📊 Multiple Order Strategy: ${ORDER_BOOK_CONFIG.MULTIPLE_ORDER_AMOUNTS.join(', ')} shares with 0.05 gaps down to best bid`);
    console.log(`🚫 Min Acceptable Price: $${ORDER_BOOK_CONFIG.MIN_ACCEPTABLE_PRICE} (skip orders ≤ $0.05)`);
    console.log(`⏱️  Iteration Interval: ${ORDER_BOOK_CONFIG.ITERATION_DELAY / 60000} minutes (1 hour)`);
    console.log(`🐌 Market Processing: ${ORDER_BOOK_CONFIG.DELAY_BETWEEN_MARKETS / 1000}s delay between markets`);
    console.log(`⏳ Cooldown Period: ${ORDER_BOOK_CONFIG.COOLDOWN_PERIOD / 1000}s after placing orders`);
    console.log(`📅 Daily Iterations: 24 iterations per day (every hour)`);
    console.log(`🌐 Network: ${NETWORK}`);
    console.log('='.repeat(70));
    
    // Validate wallet configuration before starting
    if (!validateWalletConfig()) {
        console.error('❌ Wallet configuration validation failed. Exiting...');
        process.exit(1);
    }

    // Automatically fetch the latest market ID
    const startingMarketId = await getLatestMarketId();
    const marketsToCheck = ORDER_BOOK_CONFIG.MAX_MARKETS_TO_CHECK;
    const endingMarketId = Math.max(1, startingMarketId - marketsToCheck + 1);
    
    // Validate that the starting market ID is reasonable
    const maxReasonableId = parseInt(process.env.LATEST_MARKET_ID || '600') + 50; // Allow some buffer
    if (startingMarketId > maxReasonableId) {
        console.log(`⚠️  Warning: Starting market ID ${startingMarketId} is very high.`);
        console.log(`   Consider using a lower number around ${parseInt(process.env.LATEST_MARKET_ID || '600')}`);
        console.log(`   Continuing anyway...\n`);
    }
    
    console.log(`\n🎯 Scraping Strategy:`);
    console.log(`   Starting Market: ${startingMarketId}`);
    console.log(`   Ending Market: ${endingMarketId}`);
    console.log(`   Total Markets to Check: ${marketsToCheck}`);
    console.log(`   Direction: Descending (${startingMarketId} → ${endingMarketId})`);
    console.log('\n🚀 Starting market scraping automatically...\n');

    let isRunning = true;
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down order book filling bot...');
        isRunning = false;
        logger.logSessionSummary();
        
        // Calculate session statistics
        const sessionDuration = Date.now() - logger.getSessionStartTime().getTime();
        const sessionHours = Math.floor(sessionDuration / 3600000);
        const sessionMinutes = Math.floor((sessionDuration % 3600000) / 60000);
        const estimatedIterationsPerDay = Math.floor(24 * 60 * 60 * 1000 / ORDER_BOOK_CONFIG.ITERATION_DELAY);
        
        console.log(`\n📊 SESSION STATISTICS:`);
        console.log(`   ⏱️  Total Session Time: ${sessionHours}h ${sessionMinutes}m`);
        console.log(`   🔄 Iterations Completed: ${iteration}`);
        console.log(`   📅 Estimated Daily Iterations: ${estimatedIterationsPerDay}`);
        console.log(`   ⏰ Next Iteration Would Be: ${new Date(Date.now() + ORDER_BOOK_CONFIG.ITERATION_DELAY).toLocaleString()}`);
        
        process.exit(0);
    });

    let iteration = 0;
    
    while (isRunning) {
        iteration++;
        const iterationStartTime = Date.now();
        console.log(`\n🔄 Iteration ${iteration} - ${new Date().toLocaleString()}`);
        console.log('─'.repeat(50));
        
        try {
            let totalOrdersPlaced = 0;
            let marketsProcessed = 0;
            let marketsWithOrders = 0;
            let consecutive429Errors = 0; // Track consecutive rate limit errors
            
            // Process markets in descending order
            for (let currentMarketId = startingMarketId; currentMarketId >= endingMarketId; currentMarketId--) {
                if (!isRunning) break;
                
                try {
                    console.log(`\n🔍 Processing Market ${currentMarketId} (${startingMarketId - currentMarketId + 1}/${marketsToCheck})`);
                    
                    // Check if we've already placed orders for this market in this session
                    if (logger.hasPlacedOrdersForMarket(currentMarketId)) {
                        console.log(`   ⏭️  Already placed orders for this market in current session, skipping...`);
                        continue;
                    }
                    
                    // Fetch market by ID with retry logic
                    let market = null;
                    let retryCount = 0;
                    const maxRetries = 3;
                    
                    while (retryCount < maxRetries && !market) {
                        try {
                            market = await fetchMarketById(currentMarketId);
                            if (!market) {
                                console.log(`   ⚠️  Market ${currentMarketId} not found or invalid, skipping...`);
                                break;
                            }
                        } catch (error: any) {
                            retryCount++;
                            if (error.message?.includes('404') || error.message?.includes('Not Found')) {
                                console.log(`   ⚠️  Market ${currentMarketId} not found (404), skipping...`);
                                break;
                            } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
                                consecutive429Errors++;
                                const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
                                console.log(`   ⏳ Rate limited (429), waiting ${waitTime/1000}s before retry ${retryCount}/${maxRetries}... (consecutive: ${consecutive429Errors})`);
                                await new Promise(res => setTimeout(res, waitTime));
                            } else {
                                console.log(`   ⚠️  Error fetching market ${currentMarketId}: ${error.message}, retry ${retryCount}/${maxRetries}`);
                                if (retryCount < maxRetries) {
                                    await new Promise(res => setTimeout(res, 2000));
                                }
                            }
                        }
                    }
                    
                    if (!market) {
                        continue;
                    }
                    
                    console.log(`   📋 Market: ${market.title || `ID ${currentMarketId}`}`);
                    console.log(`   🔍 Event ID: ${currentMarketId}, Market ID: ${market.id}`);
                    
                    // Get YES and NO outcomes
                    const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
                    const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
                    
                    if (!yesOutcome || !noOutcome) {
                        console.log(`   ⚠️  Market does not have both Yes and No outcomes, skipping...`);
                        continue;
                    }

                    // Fetch order books for both outcomes with retry logic
                    // Use market.id (the actual market ID) not currentMarketId (the event ID)
                    // According to Order.md: outcomeType 1 for Yes, 0 for No
                    let yesOrderBook = null;
                    let noOrderBook = null;
                    let orderBookRetryCount = 0;
                    const maxOrderBookRetries = 3;
                    
                    // Fetch YES order book with retries
                    while (orderBookRetryCount < maxOrderBookRetries && !yesOrderBook) {
                        try {
                            console.log(`   🔍 Fetching YES order book: marketId=${market.id}, outcomeId=${yesOutcome.id}, outcomeType=1`);
                            yesOrderBook = await fetchOrderBook(market.id, yesOutcome.id, 1); // 1 for Yes
                        } catch (error: any) {
                            orderBookRetryCount++;
                            if (error.message?.includes('429') || error.message?.includes('rate limit')) {
                                consecutive429Errors++;
                                const waitTime = Math.min(2000 * Math.pow(2, orderBookRetryCount), 15000); // Exponential backoff, max 15s
                                console.log(`   ⏳ Rate limited (429) fetching YES order book, waiting ${waitTime/1000}s before retry ${orderBookRetryCount}/${maxOrderBookRetries}... (consecutive: ${consecutive429Errors})`);
                                await new Promise(res => setTimeout(res, waitTime));
                            } else {
                                console.log(`   ⚠️  Error fetching YES order book: ${error.message}, retry ${orderBookRetryCount}/${maxOrderBookRetries}`);
                                if (orderBookRetryCount < maxOrderBookRetries) {
                                    await new Promise(res => setTimeout(res, 3000));
                                }
                            }
                        }
                    }
                    
                    // Fetch NO order book with retries
                    orderBookRetryCount = 0;
                    while (orderBookRetryCount < maxOrderBookRetries && !noOrderBook) {
                        try {
                            console.log(`   🔍 Fetching NO order book: marketId=${market.id}, outcomeId=${noOutcome.id}, outcomeType=0`);
                            noOrderBook = await fetchOrderBook(market.id, noOutcome.id, 0);   // 0 for No
                        } catch (error: any) {
                            orderBookRetryCount++;
                            if (error.message?.includes('429') || error.message?.includes('rate limit')) {
                                consecutive429Errors++;
                                const waitTime = Math.min(2000 * Math.pow(2, orderBookRetryCount), 15000); // Exponential backoff, max 15s
                                console.log(`   ⏳ Rate limited (429) fetching NO order book, waiting ${waitTime/1000}s before retry ${orderBookRetryCount}/${maxOrderBookRetries}... (consecutive: ${consecutive429Errors})`);
                                await new Promise(res => setTimeout(res, waitTime));
                            } else {
                                console.log(`   ⚠️  Error fetching NO order book: ${error.message}, retry ${orderBookRetryCount}/${maxOrderBookRetries}`);
                                if (orderBookRetryCount < maxOrderBookRetries) {
                                    await new Promise(res => setTimeout(res, 3000));
                                }
                            }
                        }
                    }
                    
                    if (!yesOrderBook || !noOrderBook) {
                        console.log(`   ⚠️  Could not fetch order books after retries, skipping...`);
                        continue;
                    }
                    
                    // Check if order books have actual orders - be more lenient here
                    // Only skip if both sides have absolutely no orders at all
                    const yesHasOrders = (yesOrderBook.asks && yesOrderBook.asks.length > 0) || (yesOrderBook.bids && yesOrderBook.bids.length > 0);
                    const noHasOrders = (noOrderBook.asks && noOrderBook.asks.length > 0) || (noOrderBook.bids && noOrderBook.bids.length > 0);
                    
                    // Only skip if both sides have no orders AND we have a status that indicates resolved
                    if (!yesHasOrders && !noHasOrders) {
                        // Check if market status indicates it's resolved
                        const marketStatus = String(market?.status || '').toLowerCase();
                        const resolvedStatuses = ['resolved', 'closed', 'settled', 'cancelled', 'expired'];
                        
                        if (resolvedStatuses.includes(marketStatus)) {
                            console.log(`   ⏭️  Market ${currentMarketId} has no orders and status is ${marketStatus}, skipping...`);
                            continue;
                        } else {
                            console.log(`   ⚠️  Market ${currentMarketId} has no orders but status is ${marketStatus || 'unknown'}, processing anyway...`);
                        }
                    }
                    
                    // Log order book status for debugging
                    if (!yesHasOrders) {
                        console.log(`   ⚠️  YES side has no orders`);
                    }
                    if (!noHasOrders) {
                        console.log(`   ⚠️  NO side has no orders`);
                    }
                    
                    // Debug: Log order book structure
                    console.log(`   🔍 YES Order Book: ${JSON.stringify(yesOrderBook).substring(0, 100)}...`);
                    console.log(`   🔍 NO Order Book: ${JSON.stringify(noOrderBook).substring(0, 100)}...`);

                    // Analyze order books
                    const yesAnalysis = analyzeOrderBook(yesOrderBook, 'YES');
                    const noAnalysis = analyzeOrderBook(noOrderBook, 'NO');
                    
                    // Log order book analysis
                    logger.logOrderBookAnalysis(currentMarketId, market.title || `Market ${currentMarketId}`, yesAnalysis, noAnalysis);
                    
                    // Log spread information with better formatting
                    const yesSpreadText = yesAnalysis.spread >= 0 ? `$${yesAnalysis.spread.toFixed(4)}` : `$${Math.abs(yesAnalysis.spread).toFixed(4)} (inverted)`;
                    const noSpreadText = noAnalysis.spread >= 0 ? `$${noAnalysis.spread.toFixed(4)}` : `$${Math.abs(noAnalysis.spread).toFixed(4)} (inverted)`;
                    
                    console.log(`   💰 YES: Best Ask $${yesAnalysis.bestAsk} | Best Bid $${yesAnalysis.bestBid} | Spread ${yesSpreadText}`);
                    console.log(`   💰 NO: Best Ask $${noAnalysis.bestAsk} | Best Bid $${noAnalysis.bestBid} | Spread ${noSpreadText}`);
                    console.log(`   📊 YES Gaps: ${yesAnalysis.gaps.length} | NO Gaps: ${noAnalysis.gaps.length}`);
                    
                    marketsProcessed++;
                    
                    // Check if we should place orders
                    if (yesAnalysis.suggestedOrders.length > 0) {
                        
                        // First, check if the current market spread is already tight
                        const currentYesSpread = Math.abs(yesAnalysis.spread);
                        const currentNoSpread = Math.abs(noAnalysis.spread);
                        
                        // If both sides already have tight spreads (≤ 0.015), no need to place orders
                        const spreadThreshold = 0.015; // Allow for small variations
                        if (currentYesSpread <= spreadThreshold && currentNoSpread <= spreadThreshold) {
                            console.log(`   ✅ Market already has tight spreads: YES(${currentYesSpread.toFixed(4)}) NO(${currentNoSpread.toFixed(4)})`);
                            console.log(`   ⏭️  No orders needed - market is already balanced (≤ ${spreadThreshold})`);
                            continue;
                        }
                        
                        console.log(`   🎯 Found opportunities to fill order book gaps`);
                        
                        // Dynamic market making strategy based on which side has higher prices
                        // Place multiple orders on the higher-priced side, single order on lower-priced side
                        
                        // Check if prices are acceptable (avoid very low prices ≤ 0.05)
                        const minAcceptablePrice = ORDER_BOOK_CONFIG.MIN_ACCEPTABLE_PRICE; // Minimum price we're willing to place orders at
                        
                        // Get current best prices from order books
                        const yesBestAsk = yesAnalysis.bestAsk;
                        const noBestAsk = noAnalysis.bestAsk;
                        const yesBestBid = yesAnalysis.bestBid;
                        const noBestBid = noAnalysis.bestBid;
                        
                        // Check if one side is at very high prices (≥ 0.95) - if so, don't place orders on the other side
                        const yesSideVeryHigh = yesBestBid >= 0.95 || yesBestAsk >= 0.95;
                        const noSideVeryHigh = noBestBid >= 0.95 || noBestAsk >= 0.95;
                        
                        if (yesSideVeryHigh || noSideVeryHigh) {
                            console.log(`   ⚠️  One side has very high prices (≥ $0.95):`);
                            if (yesSideVeryHigh) console.log(`      YES side: Best Bid $${yesBestBid}, Best Ask $${yesBestAsk}`);
                            if (noSideVeryHigh) console.log(`      NO side: Best Bid $${noBestBid}, Best Ask $${noBestAsk}`);
                            console.log(`   ⏭️  Skipping order placement - high-priced side should not trigger orders on opposite side`);
                            continue;
                        }
                        
                        // Determine which side has higher prices
                        const noSideHigher = noBestAsk > yesBestAsk;
                        const yesSideHigher = yesBestAsk > noBestAsk;
                        
                        console.log(`   📊 Price Analysis:`);
                        console.log(`      YES Best Ask: $${yesBestAsk}`);
                        console.log(`      NO Best Ask: $${noBestAsk}`);
                        console.log(`      Strategy: ${noSideHigher ? 'NO side higher → Multiple NO orders + Single YES' : yesSideHigher ? 'YES side higher → Multiple YES orders + Single NO' : 'Equal prices → Single orders on both sides'}`);
                        
                        // Generate orders based on which side is higher
                        let ordersToPlace: Array<{side: 'YES' | 'NO', price: number, amount: number}> = [];
                        
                        if (noSideHigher) {
                            // NO side has higher prices - place multiple NO orders + single YES
                            console.log(`   🎯 NO side strategy (higher prices): Multiple orders with 0.05 gaps down to best bid`);
                            
                            // Generate NO orders from best ask down to best bid with 0.05 gaps
                            const noBestAsk = noAnalysis.bestAsk;
                            const noBestBid = noAnalysis.bestBid;
                            const noOrders: Array<{price: number, amount: number}> = [];
                            
                            // Start from best ask - 0.01 and go down in 0.05 increments until reaching best bid
                            let currentPrice = parseFloat((noBestAsk - 0.01).toFixed(4));
                            let orderIndex = 0;
                            
                            while (currentPrice >= noBestBid && orderIndex < ORDER_BOOK_CONFIG.MULTIPLE_ORDER_AMOUNTS.length) {
                                if (currentPrice >= minAcceptablePrice) {
                                    noOrders.push({
                                        price: currentPrice,
                                        amount: ORDER_BOOK_CONFIG.MULTIPLE_ORDER_AMOUNTS[orderIndex] || ORDER_BOOK_CONFIG.ORDER_AMOUNT
                                    });
                                }
                                // Move down by 0.05 for next order
                                currentPrice = parseFloat((currentPrice - 0.05).toFixed(4));
                                orderIndex++;
                            }
                            
                            // Add final order at best bid if we haven't reached it yet
                            if (noOrders.length > 0 && noOrders[noOrders.length - 1].price > noBestBid && noBestBid >= minAcceptablePrice) {
                                noOrders.push({
                                    price: noBestBid,
                                    amount: ORDER_BOOK_CONFIG.MULTIPLE_ORDER_AMOUNTS[noOrders.length] || ORDER_BOOK_CONFIG.ORDER_AMOUNT
                                });
                            }
                            
                            // YES order at current best bid
                            const yesPrice = yesAnalysis.bestBid;
                            
                            // Add NO orders
                            noOrders.forEach(order => {
                                ordersToPlace.push({side: 'NO', price: order.price, amount: order.amount});
                            });
                            
                            // Add single YES order
                            if (yesPrice >= minAcceptablePrice) {
                                ordersToPlace.push({side: 'YES', price: yesPrice, amount: ORDER_BOOK_CONFIG.ORDER_AMOUNT});
                            }
                            
                        } else if (yesSideHigher) {
                            // YES side has higher prices - place multiple YES orders + single NO
                            console.log(`   🎯 YES side strategy (higher prices): Multiple orders with 0.05 gaps down to best bid`);
                            
                            // Generate YES orders from best ask down to best bid with 0.05 gaps
                            const yesBestAsk = yesAnalysis.bestAsk;
                            const yesBestBid = yesAnalysis.bestBid;
                            const yesOrders: Array<{price: number, amount: number}> = [];
                            
                            // Start from best ask - 0.01 and go down in 0.05 increments until reaching best bid
                            let currentPrice = parseFloat((yesBestAsk - 0.01).toFixed(4));
                            let orderIndex = 0;
                            
                            while (currentPrice >= yesBestBid && orderIndex < ORDER_BOOK_CONFIG.MULTIPLE_ORDER_AMOUNTS.length) {
                                if (currentPrice >= minAcceptablePrice) {
                                    yesOrders.push({
                                        price: currentPrice,
                                        amount: ORDER_BOOK_CONFIG.MULTIPLE_ORDER_AMOUNTS[orderIndex] || ORDER_BOOK_CONFIG.ORDER_AMOUNT
                                    });
                                }
                                // Move down by 0.05 for next order
                                currentPrice = parseFloat((currentPrice - 0.05).toFixed(4));
                                orderIndex++;
                            }
                            
                            // Add final order at best bid if we haven't reached it yet
                            if (yesOrders.length > 0 && yesOrders[yesOrders.length - 1].price > yesBestBid && yesBestBid >= minAcceptablePrice) {
                                yesOrders.push({
                                    price: yesBestBid,
                                    amount: ORDER_BOOK_CONFIG.MULTIPLE_ORDER_AMOUNTS[yesOrders.length] || ORDER_BOOK_CONFIG.ORDER_AMOUNT
                                });
                            }
                            
                            // NO order at current best bid
                            const noPrice = noAnalysis.bestBid;
                            
                            // Add YES orders
                            yesOrders.forEach(order => {
                                ordersToPlace.push({side: 'YES', price: order.price, amount: order.amount});
                            });
                            
                            // Add single NO order
                            if (noPrice >= minAcceptablePrice) {
                                ordersToPlace.push({side: 'NO', price: noPrice, amount: ORDER_BOOK_CONFIG.ORDER_AMOUNT});
                            }
                            
                        } else {
                            // Equal prices - place single orders on both sides (original strategy)
                            console.log(`   🎯 Equal prices strategy: Single orders on both sides`);
                            
                            const yesPrice = yesAnalysis.suggestedOrders[0].price;
                            const noPrice = parseFloat((0.99 - yesPrice).toFixed(4));
                            
                            if (yesPrice >= minAcceptablePrice && noPrice >= minAcceptablePrice) {
                                ordersToPlace = [
                                    {side: 'YES', price: yesPrice, amount: ORDER_BOOK_CONFIG.ORDER_AMOUNT},
                                    {side: 'NO', price: noPrice, amount: ORDER_BOOK_CONFIG.ORDER_AMOUNT}
                                ];
                            }
                        }
                        
                        // Check if we have any acceptable orders
                        if (ordersToPlace.length === 0) {
                            console.log(`   ⚠️  No acceptable orders found (all prices too low), skipping...`);
                            continue;
                        }
                        
                        // Show order summary and automatically place orders
                        console.log(`\n📋 ORDER SUMMARY for Market ${currentMarketId}:`);
                        
                        // Group orders by side
                        const yesOrders = ordersToPlace.filter(o => o.side === 'YES');
                        const noOrders = ordersToPlace.filter(o => o.side === 'NO');
                        
                        if (yesOrders.length > 0) {
                            console.log(`   YES Orders (${yesOrders.length}):`);
                            yesOrders.forEach((order, index) => {
                                console.log(`     ${index + 1}. BUY ${order.amount} shares at $${order.price}`);
                            });
                        } else {
                            console.log(`   YES Orders: ⏭️  No orders (prices too low or strategy doesn't require)`);
                        }
                        
                        if (noOrders.length > 0) {
                            console.log(`   NO Orders (${noOrders.length}):`);
                            noOrders.forEach((order, index) => {
                                console.log(`     ${index + 1}. BUY ${order.amount} shares at $${order.price}`);
                            });
                        } else {
                            console.log(`   NO Orders: ⏭️  No orders (prices too low or strategy doesn't require)`);
                        }
                        
                        // Calculate total cost
                        const totalCost = ordersToPlace.reduce((sum, order) => sum + (order.price * order.amount), 0);
                        console.log(`\n💰 Total Orders to Place: ${ordersToPlace.length}`);
                        console.log(`💵 Total Cost: $${totalCost.toFixed(2)} (estimated)`);
                        
                        // Automatically place orders (no user confirmation needed)
                        console.log(`   📝 Placing orders automatically...`);
                        
                        // Create analyses based on the orders we want to place
                        const coordinatedYesAnalysis = {
                            ...yesAnalysis,
                            suggestedOrders: yesOrders.map(order => ({
                                price: order.price,
                                amount: order.amount,
                                side: 'BUY'
                            }))
                        };
                        
                        const coordinatedNoAnalysis = {
                            ...noAnalysis,
                            suggestedOrders: noOrders.map(order => ({
                                price: order.price,
                                amount: order.amount,
                                side: 'BUY'
                            }))
                        };
                        
                        // Place orders to fill gaps
                        const ordersPlaced = await placeOrderBookOrders(currentMarketId, coordinatedYesAnalysis, coordinatedNoAnalysis, logger);
                        totalOrdersPlaced += ordersPlaced;
                        
                        if (ordersPlaced > 0) {
                            // Mark this market as processed to avoid duplicate orders
                            logger.markMarketAsProcessed(currentMarketId);
                            marketsWithOrders++;
                            console.log(`   ⏳ Waiting ${ORDER_BOOK_CONFIG.COOLDOWN_PERIOD / 1000} seconds before next market...`);
                            await new Promise(res => setTimeout(res, ORDER_BOOK_CONFIG.COOLDOWN_PERIOD));
                        }
                    } else {
                        console.log(`   ❌ No order book gaps found to fill`);
                    }
                    
                    // Log market processing
                    logger.logMarketProcessed(currentMarketId, market.title || `Market ${currentMarketId}`, yesAnalysis.suggestedOrders.length + noAnalysis.suggestedOrders.length);
                    
                    // Dynamic delay based on rate limiting
                    let delayTime = ORDER_BOOK_CONFIG.DELAY_BETWEEN_MARKETS;
                    
                    // Increase delay if we've hit consecutive rate limits
                    if (consecutive429Errors > 0) {
                        delayTime = Math.min(
                            ORDER_BOOK_CONFIG.DELAY_BETWEEN_MARKETS + (consecutive429Errors * ORDER_BOOK_CONFIG.RATE_LIMIT_DELAY),
                            30000 // Max 30 seconds
                        );
                        console.log(`   ⏳ Rate limit detected, increasing delay to ${delayTime/1000}s (consecutive 429s: ${consecutive429Errors})`);
                    }
                    
                    // Delay between markets to avoid rate limiting
                    await new Promise(res => setTimeout(res, delayTime));
                    
                    // Reset consecutive 429 counter if we successfully processed a market
                    if (consecutive429Errors > 0) {
                        consecutive429Errors = 0;
                        console.log(`   ✅ Rate limit counter reset - successful market processing`);
                    }
                    
                } catch (error: any) {
                    console.error(`❌ Error processing market ${currentMarketId}:`, error.message);
                    continue;
                }
            }
            
            const iterationEndTime = Date.now();
            const iterationDuration = iterationEndTime - iterationStartTime;
            const iterationMinutes = Math.floor(iterationDuration / 60000);
            const iterationSeconds = Math.floor((iterationDuration % 60000) / 1000);
            
            console.log(`\n✅ Iteration ${iteration} completed:`);
            console.log(`   ⏱️  Duration: ${iterationMinutes}m ${iterationSeconds}s (${iterationDuration}ms)`);
            console.log(`   Markets Processed: ${marketsProcessed}/${marketsToCheck}`);
            console.log(`   Markets with Orders: ${marketsWithOrders}`);
            console.log(`   Total Orders Placed: ${totalOrdersPlaced}`);
            console.log(`   🐌 Processing Speed: ${(marketsProcessed / (iterationDuration / 1000)).toFixed(2)} markets/second`);
            
            // Calculate next iteration time
            const nextIterationTime = new Date(Date.now() + ORDER_BOOK_CONFIG.ITERATION_DELAY);
            console.log(`\n⏰ Next iteration scheduled for: ${nextIterationTime.toLocaleString()}`);
            console.log(`🔄 Waiting ${ORDER_BOOK_CONFIG.ITERATION_DELAY / 60000} minutes before next iteration...`);
            
            // Wait 1 hour before next iteration with progress indicator
            const totalWaitTime = ORDER_BOOK_CONFIG.ITERATION_DELAY;
            const progressInterval = 300000; // Show progress every 5 minutes
            let elapsedTime = 0;
            
            console.log(`\n⏳ Starting ${ORDER_BOOK_CONFIG.ITERATION_DELAY / 60000} minute wait...`);
            
            while (elapsedTime < totalWaitTime) {
                const remainingTime = totalWaitTime - elapsedTime;
                const remainingMinutes = Math.floor(remainingTime / 60000);
                const remainingSeconds = Math.floor((remainingTime % 60000) / 1000);
                
                console.log(`   ⏰ Waiting: ${remainingMinutes}m ${remainingSeconds}s remaining...`);
                
                // Wait for progress interval or remaining time, whichever is shorter
                const waitTime = Math.min(progressInterval, remainingTime);
                await new Promise(res => setTimeout(res, waitTime));
                elapsedTime += waitTime;
            }
            
            console.log(`\n🚀 Wait completed! Starting next iteration...`);
            
        } catch (error: any) {
            console.error('❌ Error in main monitoring loop:', error.message);
            await new Promise(res => setTimeout(res, 10000)); // Wait 10 seconds on error
        }
    }
}

// Main execution
if (typeof require !== 'undefined' && require.main === module) {
    monitorOrderBooks().catch((error) => {
        console.error('❌ Fatal error in order book filling bot:', error);
        process.exit(1);
    });
}

export { monitorOrderBooks, OrderBookLogger };
