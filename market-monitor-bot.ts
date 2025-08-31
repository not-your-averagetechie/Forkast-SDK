import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const NETWORK = process.env.NETWORK || 'mainnet';

const CONFIG = {
    testnet: {
        EVENT_API_URL: process.env.TESTNET_MARKET_API_URL || 'http://localhost:3000/market/event',
        LOGIN_API_URL: process.env.TESTNET_ACCOUNT_API_URL || 'http://localhost:3000/account/login',
        ORDER_API_URL: process.env.TESTNET_ORDER_API_URL || 'http://localhost:3000/orders',
        ORDER_BOOK_API_URL: process.env.TESTNET_ORDER_BOOK_API_URL || 'https://api.forkast.gg/api/v1/orderbook',
        WALLET_ADDRESS: process.env.TESTNET_WALLET_ADDRESS,
        PRIVATE_KEY: process.env.TESTNET_PRIVATE_KEY,
        PROXY_WALLET: process.env.TESTNET_PROXY_WALLET,
        WALLET_ADDRESS_2: process.env.TESTNET_WALLET_ADDRESS_2,
        PRIVATE_KEY_2: process.env.TESTNET_PRIVATE_KEY_2,
        PROXY_WALLET_2: process.env.TESTNET_PROXY_WALLET_2
    },
    mainnet: {
        EVENT_API_URL: process.env.MAINNET_MARKET_API_URL,
        LOGIN_API_URL: process.env.MAINNET_ACCOUNT_API_URL,
        ORDER_API_URL: process.env.MAINNET_ORDER_API_URL,
        ORDER_BOOK_API_URL: process.env.ORDER_BOOK_API_URL || 'https://api.forkast.gg/api/v1/orderbook',
        WALLET_ADDRESS: process.env.MAINNET_WALLET_ADDRESS,
        PRIVATE_KEY: process.env.MAINNET_PRIVATE_KEY,
        PROXY_WALLET: process.env.MAINNET_PROXY_WALLET,
        WALLET_ADDRESS_2: process.env.MAINNET_WALLET_ADDRESS_2,
        PRIVATE_KEY_2: process.env.MAINNET_PRIVATE_KEY_2,
        PROXY_WALLET_2: process.env.MAINNET_PROXY_WALLET_2
    }
};

const EVENT_API_URL = CONFIG[NETWORK].EVENT_API_URL;
const LOGIN_API_URL = CONFIG[NETWORK].LOGIN_API_URL;
const ORDER_API_URL = CONFIG[NETWORK].ORDER_API_URL;
const ORDER_BOOK_API_URL = CONFIG[NETWORK].ORDER_BOOK_API_URL;

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get user confirmation
function getUserConfirmation(question: string): Promise<boolean> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            const isConfirmed = answer.trim().toLowerCase() === '' || answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
            resolve(isConfirmed);
        });
    });
}

// Order book filling configuration
const ORDER_BOOK_CONFIG = {
    TARGET_SPREAD: 0.01, // Target spread between our orders
    ORDER_AMOUNT: 20, // Default order amount in shares
    MAX_ORDERS_PER_SIDE: 2, // Maximum orders to place per side (1 strategic + 1 gap fill)
    MIN_PRICE_GAP: 0.05, // Minimum price gap to fill (significant gaps only)
    MONITORING_INTERVAL: 30000, // 30 seconds between market checks
    MAX_MARKETS_TO_CHECK: 50, // Maximum number of recent markets to check
    MAX_RETRIES: 3, // Maximum retry attempts for failed operations
    COOLDOWN_PERIOD: 30000, // 30 seconds cooldown after placing orders
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
        const spread = bestAsk - bestBid;
        
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

async function placeOrderBookOrders(market: any, yesAnalysis: OrderBookAnalysis, noAnalysis: OrderBookAnalysis, logger: OrderBookLogger) {
    try {
        // Login both accounts
        const wallet1AccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY);
        const wallet2AccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY_2);
        
        const wallet1Account = getAccount(
            CONFIG[NETWORK].WALLET_ADDRESS,
            CONFIG[NETWORK].PRIVATE_KEY,
            CONFIG[NETWORK].PROXY_WALLET,
            wallet1AccessToken
        );
        
        const wallet2Account = getAccount(
            CONFIG[NETWORK].WALLET_ADDRESS_2,
            CONFIG[NETWORK].PRIVATE_KEY_2,
            CONFIG[NETWORK].PROXY_WALLET_2,
            wallet2AccessToken
        );

        const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
        const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
        
        if (!yesOutcome || !noOutcome) {
            console.error(`❌ Market ${market.id} does not have both Yes and No outcomes`);
            return 0;
        }

        let totalOrdersPlaced = 0;

        // Place YES orders (Wallet 1)
        console.log(`\n📝 Placing YES orders for Market ${market.id}:`);
        for (const order of yesAnalysis.suggestedOrders) {
            const orderBody = {
                marketId: market.id,
                token: yesOutcome,
                account: wallet1Account,
                price: order.price,
                amount: order.amount,
                side: 0, // 0 for buy
                accessToken: wallet1Account.accessToken
            };
            
            const result = await placeOrder(orderBody);
            if (result.success !== false) {
                logger.logOrderPlaced(market.id, 'YES', order.price, order.amount, wallet1Account.wallet, order.side);
                totalOrdersPlaced++;
                console.log(`   ✅ YES ${order.side} order at $${order.price} for ${order.amount} shares`);
            } else if (result.error === 'DUPLICATE_ORDER') {
                console.log(`   ⚠️  YES order at $${order.price} already exists, skipping...`);
                // Don't count duplicate orders as failures
            } else {
                console.error(`   ❌ Failed to place YES order at $${order.price}: ${result.message}`);
            }
            
            // Longer delay between orders to prevent duplicates
            await new Promise(res => setTimeout(res, 2000));
        }

        // Place NO orders (Wallet 2)
        console.log(`\n📝 Placing NO orders for Market ${market.id}:`);
        for (const order of noAnalysis.suggestedOrders) {
            const orderBody = {
                marketId: market.id,
                token: noOutcome,
                account: wallet2Account,
                price: order.price,
                amount: order.amount,
                side: 0, // 0 for buy
                accessToken: wallet2Account.accessToken
            };
            
            const result = await placeOrder(orderBody);
            if (result.success !== false) {
                logger.logOrderPlaced(market.id, 'NO', order.price, order.amount, wallet2Account.wallet, order.side);
                totalOrdersPlaced++;
                console.log(`   ✅ NO ${order.side} order at $${order.price} for ${order.amount} shares`);
            } else if (result.error === 'DUPLICATE_ORDER') {
                console.log(`   ⚠️  NO order at $${order.price} already exists, skipping...`);
                // Don't count duplicate orders as failures
            } else {
                console.error(`   ❌ Failed to place NO order at $${order.price}: ${result.message}`);
            }
            
            // Longer delay between orders to prevent duplicates
            await new Promise(res => setTimeout(res, 2000));
        }

        console.log(`\n✅ Order book orders placed for Market ${market.id}:`);
        console.log(`   Total Orders: ${totalOrdersPlaced}`);
        console.log(`   YES Orders: ${yesAnalysis.suggestedOrders.length}`);
        console.log(`   NO Orders: ${noAnalysis.suggestedOrders.length}`);
        
        return totalOrdersPlaced;
    } catch (error: any) {
        console.error(`❌ Error placing order book orders for market ${market.id}:`, error.message);
        return 0;
    }
}

async function monitorOrderBooks() {
    const logger = new OrderBookLogger();
    
    console.log('='.repeat(70));
    console.log('📚 ORDER BOOK FILLING BOT - CONTINUOUS ORDER BOOK MONITORING');
    console.log('='.repeat(70));
    console.log(`🎯 Target Spread: $${ORDER_BOOK_CONFIG.TARGET_SPREAD}`);
    console.log(`💰 Order Amount: ${ORDER_BOOK_CONFIG.ORDER_AMOUNT} shares`);
    console.log(`📊 Max Orders Per Side: ${ORDER_BOOK_CONFIG.MAX_ORDERS_PER_SIDE}`);
    console.log(`⏱️  Monitoring Interval: ${ORDER_BOOK_CONFIG.MONITORING_INTERVAL / 1000} seconds`);
    console.log(`🌐 Network: ${NETWORK}`);
    console.log('='.repeat(70));

    // Start the bot automatically
    console.log('\n🚀 Starting market monitoring automatically...\n');

    let isRunning = true;
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down order book filling bot...');
        isRunning = false;
        logger.logSessionSummary();
        process.exit(0);
    });

    let iteration = 0;
    
    while (isRunning) {
        iteration++;
        console.log(`\n🔄 Iteration ${iteration} - ${new Date().toLocaleString()}`);
        console.log('─'.repeat(50));
        
        try {
            // Fetch active markets
            const activeMarkets = await fetchActiveMarkets();
            if (!activeMarkets || activeMarkets.length === 0) {
                console.log('❌ No active markets found.');
                await new Promise(res => setTimeout(res, ORDER_BOOK_CONFIG.MONITORING_INTERVAL));
                continue;
            }
            
            console.log(`📋 Found ${activeMarkets.length} active markets to monitor`);
            
            let totalOrdersPlaced = 0;
            
            // Process each market
            for (const market of activeMarkets) {
                if (!isRunning) break;
                
                try {
                    console.log(`\n🔍 Analyzing Market ${market.id}: ${market.title}`);
                    
                    // Check if we've already placed orders for this market in this session
                    if (logger.hasPlacedOrdersForMarket(market.id)) {
                        console.log(`   ⏭️  Already placed orders for this market in current session, skipping...`);
                        continue;
                    }
                    
                    // Get YES and NO outcomes
                    const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
                    const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
                    
                    if (!yesOutcome || !noOutcome) {
                        console.log(`   ⚠️  Market does not have both Yes and No outcomes, skipping...`);
                        continue;
                    }

                    // Fetch order books for both outcomes
                    const yesOrderBook = await fetchOrderBook(market.id, yesOutcome.id, yesOutcome.outcomeType || 0);
                    const noOrderBook = await fetchOrderBook(market.id, noOutcome.id, noOutcome.outcomeType || 0);
                    
                    if (!yesOrderBook || !noOrderBook) {
                        console.log(`   ⚠️  Could not fetch order books, skipping...`);
                        continue;
                    }
                    
                    // Debug: Log order book structure
                    console.log(`   🔍 YES Order Book: ${JSON.stringify(yesOrderBook).substring(0, 100)}...`);
                    console.log(`   🔍 NO Order Book: ${JSON.stringify(noOrderBook).substring(0, 100)}...`);

                    // Analyze order books
                    const yesAnalysis = analyzeOrderBook(yesOrderBook, 'YES');
                    const noAnalysis = analyzeOrderBook(noOrderBook, 'NO');
                    
                    // Log order book analysis
                    logger.logOrderBookAnalysis(market.id, market.title, yesAnalysis, noAnalysis);
                    
                    console.log(`   💰 YES: Best Ask $${yesAnalysis.bestAsk} | Best Bid $${yesAnalysis.bestBid} | Spread $${yesAnalysis.spread.toFixed(4)}`);
                    console.log(`   💰 NO: Best Ask $${noAnalysis.bestAsk} | Best Bid $${noAnalysis.bestBid} | Spread $${noAnalysis.spread.toFixed(4)}`);
                    console.log(`   📊 YES Gaps: ${yesAnalysis.gaps.length} | NO Gaps: ${noAnalysis.gaps.length}`);
                    
                                                             // Check if we should place orders
                    if (yesAnalysis.suggestedOrders.length > 0) {
                        // First, check if the current market spread is already 0.01
                        const currentYesSpread = yesAnalysis.spread;
                        const currentNoSpread = noAnalysis.spread;
                        
                        // If both sides already have 0.01 spread (or very close), no need to place orders
                        const spreadThreshold = 0.015; // Allow for small variations
                        if (currentYesSpread <= spreadThreshold && currentNoSpread <= spreadThreshold) {
                            console.log(`   ✅ Market already has tight spreads: YES(${currentYesSpread.toFixed(4)}) NO(${currentNoSpread.toFixed(4)})`);
                            console.log(`   ⏭️  No orders needed - market is already balanced (≤ ${spreadThreshold})`);
                            continue;
                        }
                        
                        console.log(`   🎯 Found opportunities to fill order book gaps`);
                        
                        // For coordinated spread strategy, we can only place 1 YES order and 1 NO order
                        // This ensures YES + NO = 0.99 (0.01 spread)
                        const yesPrice = yesAnalysis.suggestedOrders[0].price; // Only first YES order
                        const noPrice = parseFloat((0.99 - yesPrice).toFixed(4)); // Coordinate to maintain 0.01 spread
                        
                        // Show order summary and ask for confirmation
                        console.log(`\n📋 ORDER SUMMARY for Market ${market.id}:`);
                        console.log(`   YES Orders (1):`);
                        console.log(`     1. BUY ${ORDER_BOOK_CONFIG.ORDER_AMOUNT} shares at $${yesPrice}`);
                        
                        console.log(`   NO Orders (1):`);
                        console.log(`     1. BUY ${ORDER_BOOK_CONFIG.ORDER_AMOUNT} shares at $${noPrice}`);
                        
                        // Validate the spread
                        const calculatedSpread = parseFloat((yesPrice + noPrice).toFixed(4));
                        console.log(`\n🎯 Spread Analysis:`);
                        console.log(`   YES Price: $${yesPrice}`);
                        console.log(`   NO Price: $${noPrice}`);
                        console.log(`   Calculated Spread: $${calculatedSpread} (Target: 0.99 for 0.01 spread)`);
                        
                        // Only place 2 orders total (1 YES + 1 NO)
                        const totalOrders = 2;
                        console.log(`\n💰 Total Orders to Place: ${totalOrders}`);
                        console.log(`💵 Total Cost: $${(totalOrders * ORDER_BOOK_CONFIG.ORDER_AMOUNT * 0.5).toFixed(2)} (estimated)`);
                        
                        // Ask for user confirmation
                        const shouldPlaceOrders = await getUserConfirmation(`\n❓ Press Enter to place orders, or type 'n' to skip: `);
                        
                        if (shouldPlaceOrders) {
                            console.log(`   📝 Placing orders...`);
                            
                            // Create coordinated analyses with only 1 order each
                            const coordinatedYesAnalysis = {
                                ...yesAnalysis,
                                suggestedOrders: [yesAnalysis.suggestedOrders[0]] // Only first order
                            };
                            
                            const coordinatedNoAnalysis = {
                                ...noAnalysis,
                                suggestedOrders: [{
                                    price: noPrice,
                                    amount: ORDER_BOOK_CONFIG.ORDER_AMOUNT,
                                    side: 'BUY'
                                }]
                            };
                            
                            // Place orders to fill gaps
                            const ordersPlaced = await placeOrderBookOrders(market, coordinatedYesAnalysis, coordinatedNoAnalysis, logger);
                            totalOrdersPlaced += ordersPlaced;
                            
                            if (ordersPlaced > 0) {
                                // Mark this market as processed to avoid duplicate orders
                                logger.markMarketAsProcessed(market.id);
                                console.log(`   ⏳ Waiting ${ORDER_BOOK_CONFIG.COOLDOWN_PERIOD / 1000} seconds before next market...`);
                                await new Promise(res => setTimeout(res, ORDER_BOOK_CONFIG.COOLDOWN_PERIOD));
                            }
                        } else {
                            console.log(`   ⏭️  Skipping orders for this market`);
                        }
                    } else {
                        console.log(`   ❌ No order book gaps found to fill`);
                    }
                    
                    // Log market processing
                    logger.logMarketProcessed(market.id, market.title, yesAnalysis.suggestedOrders.length + noAnalysis.suggestedOrders.length);
                    
                    // Small delay between markets to avoid rate limiting
                    await new Promise(res => setTimeout(res, 2000));
                    
                } catch (error: any) {
                    console.error(`❌ Error processing market ${market.id}:`, error.message);
                }
            }
            
            console.log(`\n📊 Iteration Summary:`);
            console.log(`   Markets Processed: ${activeMarkets.length}`);
            console.log(`   Total Orders Placed: ${totalOrdersPlaced}`);
            console.log(`   Next Check: ${new Date(Date.now() + ORDER_BOOK_CONFIG.MONITORING_INTERVAL).toLocaleString()}`);
            
        } catch (error: any) {
            console.error('❌ Error in order book monitoring iteration:', error.message);
        }
        
        // Ask if user wants to continue to next iteration
        if (isRunning) {
            const continueToNext = await getUserConfirmation(`\n🔄 Continue to next iteration? (Press Enter to continue, or type 'n' to stop): `);
            
            if (continueToNext) {
                console.log(`\n⏳ Waiting ${ORDER_BOOK_CONFIG.MONITORING_INTERVAL / 1000} seconds before next iteration...`);
                await new Promise(res => setTimeout(res, ORDER_BOOK_CONFIG.MONITORING_INTERVAL));
            } else {
                console.log(`\n🛑 User chose to stop. Shutting down...`);
                isRunning = false;
            }
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
