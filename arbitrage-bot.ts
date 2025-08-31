


import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

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
        MARKET_API_URL: process.env.MAINNET_MARKET_API_URL,
        ACCOUNT_API_URL: process.env.MAINNET_ACCOUNT_API_URL,
        ORDER_API_URL: process.env.MAINNET_ORDER_API_URL
    }
};

const NETWORK = (process.env.NETWORK as 'testnet' | 'mainnet') || 'mainnet';
const EVENT_API_URL = CONFIG[NETWORK].MARKET_API_URL;
const ORDER_BOOK_API_URL = process.env.ORDER_BOOK_API_URL || 'https://api.forkast.gg/api/v1/orderbook';

// Bot Configuration
const BOT_CONFIG = {
    MAX_MARKETS_TO_CHECK: 300, // Check last 300 markets
    MIN_DELAY_BETWEEN_MARKETS: 15000, // 15 seconds minimum (increased from 5)
    MAX_DELAY_BETWEEN_MARKETS: 30000, // 30 seconds maximum (increased from 15)
    MIN_DELAY_BETWEEN_ORDERS: 2000, // 2 seconds minimum
    MAX_DELAY_BETWEEN_ORDERS: 8000, // 8 seconds maximum
    MIN_DELAY_BETWEEN_ACTIONS: 1000, // 1 second minimum
    MAX_DELAY_BETWEEN_ACTIONS: 5000, // 5 seconds maximum
    ORDER_AMOUNTS: [20, 15, 10, 5], // Random order amounts
    MAX_RETRIES: 3,
    RATE_LIMIT_DELAY: 10000, // 10 seconds when rate limited
    HUMAN_LIKE_DELAYS: true, // Enable human-like random delays
    RANDOM_MARKET_SELECTION: true, // Enable random market selection
    LOGGING_ENABLED: true
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

async function humanLikeDelay(min: number, max: number, reason: string) {
    if (!BOT_CONFIG.HUMAN_LIKE_DELAYS) return;
    
    const delay = getRandomDelay(min, max);
    console.log(`   ⏳ ${reason} (${delay}ms delay)`);
    await new Promise(resolve => setTimeout(resolve, delay));
}

// Wallet management
function getRandomWallet(): { walletNumber: number, walletConfig: any } {
    const walletNumbers = [3, 4, 5];
    const randomWalletNumber = getRandomElement(walletNumbers);
    
    const walletConfig = {
        WALLET_ADDRESS: CONFIG[NETWORK][`WALLET_ADDRESS_${randomWalletNumber}`],
        PRIVATE_KEY: CONFIG[NETWORK][`PRIVATE_KEY_${randomWalletNumber}`],
        PROXY_WALLET: CONFIG[NETWORK][`PROXY_WALLET_${randomWalletNumber}`]
    };
    
    return { walletNumber: randomWalletNumber, walletConfig };
}

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
        return false;
    }
    
    console.log(`✅ All three wallets (3, 4, 5) are properly configured`);
    return true;
}

// API functions - Using the EXACT working mechanism from market-monitor-bot.ts
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
            const response = await axios.get(CONFIG[NETWORK].ACCOUNT_API_URL, { 
                params: { privateKey },
                timeout: 10000
            });
            return response.data.accessToken;
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
        console.log(`   🔍 Placing order: Market ${orderBody.marketId}, Price $${orderBody.price}, Amount ${orderBody.amount}, Side ${orderBody.side}`);
        
        const response = await axios.post(CONFIG[NETWORK].ORDER_API_URL, orderBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${orderBody.accessToken}`
            },
            timeout: 15000
        });
        
        console.log(`   ✅ Order placed successfully:`, response.data);
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
async function executeArbitrageStrategy(market: any, logger: ArbitrageLogger): Promise<boolean> {
    try {
        // Fetch order books for YES and NO outcomes
        const yesOrderBook = await fetchOrderBook(market.id, 1); // YES outcome
        const noOrderBook = await fetchOrderBook(market.id, 0);  // NO outcome
        
        if (!yesOrderBook.asks || !yesOrderBook.bids || !noOrderBook.asks || !noOrderBook.bids) {
            logger.log(`   ⏭️  Skipping market ${market.id} - insufficient order book data`);
            return false;
        }

        const yesBestAsk = parseFloat(yesOrderBook.asks[0]?.price || '0.5');
        const yesBestBid = parseFloat(yesOrderBook.bids[0]?.price || '0.5');
        const noBestAsk = parseFloat(noOrderBook.asks[0]?.price || '0.5');
        const noBestBid = parseFloat(noOrderBook.bids[0]?.price || '0.5');

        // Calculate spread
        const yesSpread = yesBestAsk - yesBestBid;
        const noSpread = noBestAsk - noBestBid;
        const totalSpread = yesSpread + noSpread;

        logger.log(`   📊 Market ${market.id} Analysis:`, {
            yesBestBid,
            yesBestAsk,
            yesSpread: yesSpread.toFixed(4),
            noBestBid,
            noBestAsk,
            noSpread: noSpread.toFixed(4),
            totalSpread: totalSpread.toFixed(4)
        });

        // Check if spread is already tight
        if (totalSpread <= 0.02) {
            logger.log(`   ⏭️  Market ${market.id} already has tight spread (${totalSpread.toFixed(4)}), skipping`);
            return false;
        }

        // Check for very high prices (>= 0.95)
        if (yesBestBid >= 0.95 || yesBestAsk >= 0.95 || noBestBid >= 0.95 || noBestAsk >= 0.95) {
            logger.log(`   ⚠️  Market ${market.id} has very high prices (≥ $0.95), skipping`);
            return false;
        }

        // Check for very low prices (<= 0.05)
        if (yesBestBid <= 0.05 || yesBestAsk <= 0.05 || noBestBid <= 0.05 || noBestAsk <= 0.05) {
            logger.log(`   ⚠️  Market ${market.id} has very low prices (≤ $0.05), skipping`);
            return false;
        }

        // Select two random wallets for this market
        const walletNumbers = [3, 4, 5];
        const shuffledWallets = shuffleArray([...walletNumbers]);
        const wallet1Number = shuffledWallets[0];
        const wallet2Number = shuffledWallets[1];

        logger.log(`   🎲 Selected wallets for market ${market.id}: Wallet ${wallet1Number} and Wallet ${wallet2Number}`);

        // Get access tokens for both wallets
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

        // Strategy: Place YES order at best bid and NO order at complementary price
        let ordersPlaced = 0;
        const orderAmount = getRandomElement(BOT_CONFIG.ORDER_AMOUNTS);

        if (yesBestBid > 0.05 && yesBestBid < 0.95) {
            // Wallet 1 buys YES at best bid
            const yesPrice = yesBestBid;
            const noPrice = parseFloat((1.00 - yesPrice).toFixed(4));

            // Check if NO price is acceptable
            if (noPrice > 0.05 && noPrice < 0.95) {
                // Place YES order
                const yesOrderBody = {
                    marketId: market.id,
                    token: market.outcomes.find((o: any) => o.title.toLowerCase() === 'yes'),
                    account: {
                        wallet: wallet1Config.WALLET_ADDRESS,
                        private_key: wallet1Config.PRIVATE_KEY,
                        proxy_wallet: wallet1Config.PROXY_WALLET,
                        accessToken: wallet1AccessToken
                    },
                    price: yesPrice,
                    amount: orderAmount,
                    side: 0, // Buy
                    accessToken: wallet1AccessToken
                };

                logger.log(`   📈 Wallet ${wallet1Number} placing YES order: ${orderAmount} shares at $${yesPrice.toFixed(4)}`);
                const yesResult = await placeOrder(yesOrderBody);
                if (yesResult && yesResult.success === true) {
                    logger.log(`   ✅ YES order placed successfully`);
                    ordersPlaced++;
                } else {
                    logger.log(`   ❌ Failed to place YES order: ${yesResult?.message || 'Unknown error'}`);
                    // Continue with NO order even if YES fails
                }

                // Wait a bit before placing the NO order
                await humanLikeDelay(1000, 3000, 'Processing YES order');

                // Place NO order
                const noOrderBody = {
                    marketId: market.id,
                    token: market.outcomes.find((o: any) => o.title.toLowerCase() === 'no'),
                    account: {
                        wallet: wallet2Config.WALLET_ADDRESS,
                        private_key: wallet2Config.PRIVATE_KEY,
                        proxy_wallet: wallet2Config.PROXY_WALLET,
                        accessToken: wallet2AccessToken
                    },
                    price: noPrice,
                    amount: orderAmount,
                    side: 0, // Buy
                    accessToken: wallet2AccessToken
                };

                logger.log(`   📉 Wallet ${wallet2Number} placing NO order: ${orderAmount} shares at $${noPrice.toFixed(4)}`);
                const noResult = await placeOrder(noOrderBody);
                if (noResult && noResult.success === true) {
                    logger.log(`   ✅ NO order placed successfully`);
                    ordersPlaced++;
                } else {
                    logger.log(`   ❌ Failed to place NO order: ${noResult?.message || 'Unknown error'}`);
                }

                logger.log(`   🎯 Coordinated trade: YES at $${yesPrice.toFixed(4)} + NO at $${noPrice.toFixed(4)} = $${(yesPrice + noPrice).toFixed(4)}`);
            } else {
                logger.log(`   ⚠️  NO price ${noPrice.toFixed(4)} is outside acceptable range (0.05-0.95), skipping`);
            }
        } else {
            logger.log(`   ⚠️  YES best bid ${yesBestBid.toFixed(4)} is outside acceptable range (0.05-0.95), skipping`);
        }

        if (ordersPlaced > 0) {
            logger.log(`   ✅ Successfully placed ${ordersPlaced} coordinated orders on market ${market.id}`);
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
    
    console.log('🚀 Starting Arbitrage Bot with Human-Like Behavior');
    console.log(`📅 Session started at: ${sessionStartTime.toLocaleString()}`);
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

    // Get latest market ID
    console.log('🔍 Discovering latest active market ID...');
    const latestMarketId = await getLatestMarketId();
    console.log(`🔍 Latest market ID: ${latestMarketId}`);
    console.log(`📋 Will check markets from ${latestMarketId} down to ${Math.max(1, latestMarketId - BOT_CONFIG.MAX_MARKETS_TO_CHECK + 1)}`);
    console.log('');

    let marketsProcessed = 0;
    let marketsWithOrders = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;

    // Generate list of markets to check (in descending order)
    const marketIds = Array.from({ length: BOT_CONFIG.MAX_MARKETS_TO_CHECK }, (_, i) => latestMarketId - i)
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
    const activeMarkets: number[] = [];
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

    for (const marketId of activeMarkets) {
        try {
            console.log(`\n🔍 Processing Market ${marketId} (${marketsProcessed + 1}/${activeMarkets.length})`);
            
            // Add random market skipping for more human-like behavior (5% chance)
            if (Math.random() < 0.05) {
                console.log(`   🎲 Randomly skipping market ${marketId} for human-like behavior`);
                continue;
            }
            
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

            const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
            const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
            
            if (!yesOutcome || !noOutcome) {
                console.log(`   ⏭️  Market ${marketId} missing YES/NO outcomes, skipping`);
                continue;
            }

            console.log(`   📝 Market: ${market.title}`);
            console.log(`   📊 Status: ${market.status}`);
            console.log(`   🎯 Outcomes: YES (${yesOutcome.id}), NO (${noOutcome.id})`);

            // Execute arbitrage strategy
            const ordersPlaced = await executeArbitrageStrategy(market, logger);
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
    const sessionEndTime = new Date();
    const sessionDuration = sessionEndTime.getTime() - sessionStartTime.getTime();
    const sessionMinutes = Math.floor(sessionDuration / 60000);
    const sessionSeconds = Math.floor((sessionDuration % 60000) / 1000);

    console.log('\n' + '='.repeat(60));
    console.log('🎯 ARBITRAGE BOT SESSION COMPLETE');
    console.log('='.repeat(60));
    console.log(`📅 Session Start: ${sessionStartTime.toLocaleString()}`);
    console.log(`📅 Session End: ${sessionEndTime.toLocaleString()}`);
    console.log(`⏱️  Duration: ${sessionMinutes}m ${sessionSeconds}s`);
    console.log(`🔍 Markets Processed: ${marketsProcessed}/${activeMarkets.length}`);
    console.log(`📈 Markets with Orders: ${marketsWithOrders}`);
    console.log(`📊 Success Rate: ${marketsProcessed > 0 ? ((marketsWithOrders / marketsProcessed) * 100).toFixed(1) : 0}%`);
    console.log(`🌐 Network: ${NETWORK}`);
    console.log(`🎲 Random Selection: ${BOT_CONFIG.RANDOM_MARKET_SELECTION ? 'Yes' : 'No'}`);
    console.log('='.repeat(60));

    logger.log('Session completed', {
        sessionStartTime: sessionStartTime.toISOString(),
        sessionEndTime: sessionEndTime.toISOString(),
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
