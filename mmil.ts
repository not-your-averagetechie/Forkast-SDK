import axios from 'axios';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
const dotenv = require('dotenv');
dotenv.config();

const NETWORK = process.env.NETWORK || 'mainnet';

const CONFIG = {
    testnet: {
        EVENT_API_URL: process.env.TESTNET_MARKET_API_URL || 'http://localhost:3000/market/event',
        LOGIN_API_URL: process.env.TESTNET_ACCOUNT_API_URL || 'http://localhost:3000/account/login',
        ORDER_API_URL: process.env.TESTNET_ORDER_API_URL || 'http://localhost:3000/orders',
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
        WALLET_ADDRESS: process.env.MAINNET_WALLET_ADDRESS,
        PRIVATE_KEY: process.env.MAINNET_PRIVATE_KEY,
        PROXY_WALLET: process.env.MAINNET_PROXY_WALLET,
        WALLET_ADDRESS_2: process.env.MAINNET_WALLET_ADDRESS_2,
        PRIVATE_KEY_2: process.env.MAINNET_PRIVATE_KEY_2,
        PROXY_WALLET_2: process.env.MAINNET_PROXY_WALLET_2
    }
};

// Use safe fallbacks so missing MAINNET envs don't break local runs
const EVENT_API_URL = CONFIG[NETWORK].EVENT_API_URL || CONFIG.testnet.EVENT_API_URL;
const LOGIN_API_URL = CONFIG[NETWORK].LOGIN_API_URL || CONFIG.testnet.LOGIN_API_URL;
const ORDER_API_URL = CONFIG[NETWORK].ORDER_API_URL || CONFIG.testnet.ORDER_API_URL;

// Public API base for fallback (same source arbitrage-bot uses)
const PUBLIC_EVENT_API_BASE = process.env.PUBLIC_EVENT_API_BASE || 'https://api.forkast.gg/api/v1/markets';

// Enforce using ONLY these two proxy wallets for auth/access
const EXPECTED_PROXY_WALLET_1 = '0x9C4bF6f7F2B80dfE689E211a09f19B9E5321b5cd';
const EXPECTED_PROXY_WALLET_2 = '0xF2d31fe600b6BA1683C75Dcd10dE77A16f78B387';

function validateAllowedProxyWallets() {
    const proxy1 = CONFIG[NETWORK].PROXY_WALLET;
    const proxy2 = CONFIG[NETWORK].PROXY_WALLET_2;
    if (NETWORK === 'mainnet') {
        if (proxy1 !== EXPECTED_PROXY_WALLET_1 || proxy2 !== EXPECTED_PROXY_WALLET_2) {
            console.error('❌ Proxy wallets do not match the allowed mainnet wallets.');
            console.error(`   Expected: ${EXPECTED_PROXY_WALLET_1} and ${EXPECTED_PROXY_WALLET_2}`);
            console.error(`   Got:      ${proxy1} and ${proxy2}`);
            process.exit(1);
        }
    }
}

// Ensure all prices are clamped to [0.01, 0.99] and rounded to 2 decimals
function toCents(value: number): number {
    const rounded = Math.round(value * 100) / 100;
    if (rounded < 0.01) return 0.01;
    if (rounded > 0.99) return 0.99;
    return rounded;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Simplified logging functionality
class ExpenseLogger {
    private logFolderPath: string;
    private logFilePath: string;
    private totalOutcome1Spent: number = 0;
    private totalOutcome2Spent: number = 0;
    private initialOutcome1Spent: number = 0;
    private initialOutcome2Spent: number = 0;
    private marketType: string = 'YES/NO'; // Track current market type

    constructor() {
        // Create logs folder if it doesn't exist
        this.logFolderPath = path.join(process.cwd(), 'market_making_logs');
        if (!fs.existsSync(this.logFolderPath)) {
            fs.mkdirSync(this.logFolderPath, { recursive: true });
        }

        // Create log file with current date and time
        const now = new Date();
        const dateTimeString = now.toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-')
            .substring(0, 19); // YYYY-MM-DDTHH-MM-SS
        
        this.logFilePath = path.join(this.logFolderPath, `market_making_${dateTimeString}.json`);
        
        // Initialize log file with simple structure
        const initialData = {
            session_info: {
                start_time: now.toISOString(),
                network: NETWORK
            },
            total_outcome1_spent: 0,
            total_outcome2_spent: 0
        };
        
        fs.writeFileSync(this.logFilePath, JSON.stringify(initialData, null, 2));
        console.log(`📝 Expense log created: ${this.logFilePath}`);
    }

    setMarketType(marketType: string) {
        this.marketType = marketType;
    }

    logInitialOrder(orderType: 'OUTCOME1' | 'OUTCOME2', cost: number) {
        if (orderType === 'OUTCOME1') {
            this.initialOutcome1Spent += cost;
        } else {
            this.initialOutcome2Spent += cost;
        }
    }

    logSuccessfulOrder(orderType: 'OUTCOME1' | 'OUTCOME2', cost: number) {
        if (orderType === 'OUTCOME1') {
            this.totalOutcome1Spent += cost;
        } else {
            this.totalOutcome2Spent += cost;
        }
        this.updateLogFile();
        const outcomeName = this.marketType === 'YES/NO' ? (orderType === 'OUTCOME1' ? 'YES' : 'NO') : (orderType === 'OUTCOME1' ? 'Team1' : 'Team2');
        const totalSpent = orderType === 'OUTCOME1' ? this.totalOutcome1Spent : this.totalOutcome2Spent;
        console.log(`💰 ${outcomeName} order: $${cost.toFixed(2)} | Total ${outcomeName}: $${totalSpent.toFixed(2)}`);
    }

    logSessionSummary() {
        const now = new Date();
        this.updateLogFile(now.toISOString());
        const outcome1Name = this.marketType === 'YES/NO' ? 'YES' : 'Team1';
        const outcome2Name = this.marketType === 'YES/NO' ? 'NO' : 'Team2';
        
        console.log(`\n🏁 SESSION SUMMARY:`);
        console.log(`   Total ${outcome1Name} Spent (excluding initial): $${this.totalOutcome1Spent.toFixed(2)}`);
        console.log(`   Total ${outcome2Name} Spent (excluding initial): $${this.totalOutcome2Spent.toFixed(2)}`);
        console.log(`   Grand Total (excluding initial): $${(this.totalOutcome1Spent + this.totalOutcome2Spent).toFixed(2)}`);
        console.log(`   Initial ${outcome1Name} Spent (300 shares orders): $${this.initialOutcome1Spent.toFixed(2)}`);
        console.log(`   Initial ${outcome2Name} Spent (300 shares orders): $${this.initialOutcome2Spent.toFixed(2)}`);
        console.log(`   Grand Total (including initial): $${(this.totalOutcome1Spent + this.totalOutcome2Spent + this.initialOutcome1Spent + this.initialOutcome2Spent).toFixed(2)}`);
        console.log(`   Log File: ${this.logFilePath}`);
    }

    private updateLogFile(endTime?: string) {
        try {
            const data = {
                session_info: {
                    start_time: JSON.parse(fs.readFileSync(this.logFilePath, 'utf8')).session_info.start_time,
                    network: NETWORK,
                    ...(endTime && { end_time: endTime })
                },
                total_outcome1_spent: parseFloat(this.totalOutcome1Spent.toFixed(2)),
                total_outcome2_spent: parseFloat(this.totalOutcome2Spent.toFixed(2)),
                grand_total: parseFloat((this.totalOutcome1Spent + this.totalOutcome2Spent).toFixed(2)),
                initial_outcome1_spent: parseFloat(this.initialOutcome1Spent.toFixed(2)),
                initial_outcome2_spent: parseFloat(this.initialOutcome2Spent.toFixed(2))
            };
            fs.writeFileSync(this.logFilePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error updating log file:', error.message);
        }
    }
}

function getUserInput(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer));
    });
}

async function getUserConfirmation(question: string): Promise<boolean> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            const response = answer.trim().toLowerCase();
            resolve(response === 'y' || response === 'yes' || response === '1');
        });
    });
}

async function loginAndGetAccessToken(privateKey: string): Promise<string> {
    const response = await axios.get(LOGIN_API_URL, { params: { privateKey } });
    return response.data.accessToken;
}

function getYesAccount(accessToken: string) {
    return {
        wallet: CONFIG[NETWORK].WALLET_ADDRESS,
        private_key: CONFIG[NETWORK].PRIVATE_KEY,
        proxy_wallet: CONFIG[NETWORK].PROXY_WALLET,
        accessToken
    };
}

function getNoAccount(accessToken: string) {
    return {
        wallet: CONFIG[NETWORK].WALLET_ADDRESS_2,
        private_key: CONFIG[NETWORK].PRIVATE_KEY_2,
        proxy_wallet: CONFIG[NETWORK].PROXY_WALLET_2,
        accessToken
    };
}

async function fetchMarket(marketId: number, accessToken?: string) {
    // 1) Try local Nest endpoint first
    try {
        const response = await axios.get(EVENT_API_URL, { params: { id: marketId, accessToken }, timeout: 30000 });
        return response.data;
    } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404) {
            console.log(`⏭️  Market ${marketId} not found (404) on local endpoint, skipping`);
            return null;
        }
        if (status === 429) {
            console.log(`⏳ Rate limited on local endpoint for market ${marketId}, retrying after delay...`);
            await new Promise(res => setTimeout(res, 2000));
            return fetchMarket(marketId, accessToken);
        }
        console.log(`⚠️  Local endpoint failed for market ${marketId}: ${error?.message || 'unknown error'}${status ? ` (status ${status})` : ''} — trying public API`);
    }

    // 2) Fallback to public Forkast API and normalize shape
    try {
        const resp = await axios.get(`${PUBLIC_EVENT_API_BASE}/${marketId}`, { timeout: 30000 });
        const event = resp?.data;
        const data = event?.data;
        if (!data || !Array.isArray(data.markets) || data.markets.length === 0) {
            return null;
        }
        // Normalize to local shape: { markets: [...] , ... }
        return {
            ...data,
            markets: data.markets
        };
    } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404) {
            console.log(`⏭️  Market ${marketId} not found (404) on public API, skipping`);
            return null;
        }
        if (status === 429) {
            console.log(`⏳ Rate limited on public API for market ${marketId}, retrying after delay...`);
            await new Promise(res => setTimeout(res, 2000));
            return fetchMarket(marketId);
        }
        console.log(`⚠️  Failed to fetch market ${marketId} from public API: ${error?.message || 'unknown error'}${status ? ` (status ${status})` : ''}`);
        return null;
    }
}

function getRandomAmount(...amounts: number[]): number {
    return amounts[Math.floor(Math.random() * amounts.length)];
}

// NEW: Budget allocation based on starting odds
function getBudgetAllocation(startDigit: number): { totalBudget: number, yesBudget: number, noBudget: number } {
    if (startDigit >= 70 && startDigit <= 80) {
        // For 70-80 odds: Total $90-100 split between both sides
        const totalBudget = getRandomAmount(90, 95, 100);
        const yesBudget = Math.floor(totalBudget * 0.5); // 50% split
        const noBudget = totalBudget - yesBudget; // Remaining amount
        return { totalBudget, yesBudget, noBudget };
    } else {
        // For all other odds: Max $45-50 per side
        const yesBudget = getRandomAmount(45, 50);
        const noBudget = getRandomAmount(45, 50);
        const totalBudget = yesBudget + noBudget;
        return { totalBudget, yesBudget, noBudget };
    }
}

function adjustOrdersToMaxBudget(orders: any[], maxBudget: number) {
    // Calculate total cost
    let totalCost = orders.reduce((sum, order) => sum + (order.price * order.amount), 0);

    if (totalCost <= maxBudget) {
        return orders;
    }

    // Keep top order unchanged, adjust middle and bottom orders
    const adjustedOrders = [...orders];

    // Don't modify the first order (top order)
    for (let i = 1; i < adjustedOrders.length; i++) {
        const order = adjustedOrders[i];

        if (i < adjustedOrders.length / 2) {
            // Middle orders: reduce by 50-70%
            order.amount = Math.max(1, Math.floor(order.amount * getRandomAmount(0.3, 0.4, 0.5)));
        } else {
            // Bottom orders: reduce by 30-40%
            order.amount = Math.max(1, Math.floor(order.amount * getRandomAmount(0.6, 0.7)));
        }
    }

    // Recalculate and further adjust if still over budget
    totalCost = adjustedOrders.reduce((sum, order) => sum + (order.price * order.amount), 0);

    if (totalCost > maxBudget) {
        const reductionFactor = maxBudget / totalCost;
        for (let i = 1; i < adjustedOrders.length; i++) {
            adjustedOrders[i].amount = Math.max(1, Math.floor(adjustedOrders[i].amount * reductionFactor));
        }
    }

    return adjustedOrders;
}

function generateYesOrders(startDigit: number, yesBudget: number) {
    const startPrice = toCents(startDigit / 100);
    const orders = [];

    // Top order shares (consistent across all budgets)
    orders.push({ price: toCents(startPrice), amount: getRandomAmount(60, 50, 45, 55, 65) });

    let currentPrice = Math.floor(startPrice * 20) * 0.05;
    if (currentPrice >= startPrice) currentPrice = toCents(currentPrice - 0.05);
    currentPrice = toCents(currentPrice);

    while (currentPrice >= 0.10) {
        if (currentPrice >= 0.50) orders.push({ price: toCents(currentPrice), amount: getRandomAmount(20, 25, 22, 24) });
        else if (currentPrice >= 0.30) orders.push({ price: toCents(currentPrice), amount: getRandomAmount(10, 15, 14, 18, 20) });
        else if (currentPrice >= 0.20) orders.push({ price: toCents(currentPrice), amount: getRandomAmount(10, 15, 14, 18, 20, 22, 24) });
        else if (currentPrice >= 0.10) orders.push({ price: toCents(currentPrice), amount: getRandomAmount(10, 15, 14, 18, 22, 25, 28, 30, 20) });
        currentPrice = toCents(currentPrice - 0.05);
    }

    orders.push(
        { price: 0.09, amount: getRandomAmount(32, 34, 38, 40) },
        { price: 0.08, amount: getRandomAmount(30, 34, 38, 40) },
        { price: 0.07, amount: getRandomAmount(30, 55, 60, 65, 45, 64, 40) },
        { price: 0.06, amount: getRandomAmount(80, 85, 95, 70, 65, 60) },
        { price: 0.05, amount: getRandomAmount(80, 85, 95, 105, 90, 100, 110) },
        { price: 0.04, amount: getRandomAmount(105, 100, 90, 85, 102, 110) },
        { price: 0.03, amount: getRandomAmount(150, 140, 120, 125, 130, 110, 105, 100) },
        { price: 0.02, amount: getRandomAmount(150, 160, 175, 165, 155, 170, 185, 145, 140) },
        { price: 0.01, amount: getRandomAmount(250, 280, 300, 350, 380, 350, 320, 310, 345, 340) }
    );

    return adjustOrdersToMaxBudget(orders, yesBudget);
}

function generateNoOrders(startDigit: number, noBudget: number) {
    const startPrice = toCents(startDigit / 100);
    const orders = [];
    const noStartPrice = toCents(0.99 - startPrice);

    // Top order shares (consistent across all budgets)
    if (noStartPrice >= 0.10 && noStartPrice <= 0.90) {
        orders.push({ price: toCents(noStartPrice), amount: getRandomAmount(60, 50, 45, 55, 65) });
    }

    let currentNoPrice = Math.floor(noStartPrice * 20) * 0.05;
    if (currentNoPrice >= noStartPrice) currentNoPrice = toCents(currentNoPrice - 0.05);
    currentNoPrice = toCents(currentNoPrice);

    while (currentNoPrice >= 0.10) {
        if (currentNoPrice >= 0.50) orders.push({ price: toCents(currentNoPrice), amount: getRandomAmount(20, 25, 22, 24) });
        else if (currentNoPrice >= 0.30) orders.push({ price: toCents(currentNoPrice), amount: getRandomAmount(10, 15, 14, 18, 20) });
        else if (currentNoPrice >= 0.20) orders.push({ price: toCents(currentNoPrice), amount: getRandomAmount(10, 15, 14, 18, 20, 22, 24) });
        else if (currentNoPrice >= 0.10) orders.push({ price: toCents(currentNoPrice), amount: getRandomAmount(10, 15, 14, 18, 22, 25, 28, 30, 20) });
        currentNoPrice = toCents(currentNoPrice - 0.05);
    }

    orders.push(
        { price: 0.09, amount: getRandomAmount(32, 34, 38, 40) },
        { price: 0.08, amount: getRandomAmount(30, 34, 38, 40) },
        { price: 0.07, amount: getRandomAmount(30, 55, 60, 65, 45, 64, 40) },
        { price: 0.06, amount: getRandomAmount(80, 85, 95, 70, 65, 60) },
        { price: 0.05, amount: getRandomAmount(80, 85, 95, 105, 90, 100, 110) },
        { price: 0.04, amount: getRandomAmount(105, 100, 90, 85, 102, 110) },
        { price: 0.03, amount: getRandomAmount(150, 140, 120, 125, 130, 110, 105, 100) },
        { price: 0.02, amount: getRandomAmount(150, 160, 175, 165, 155, 170, 185, 145, 140) },
        { price: 0.01, amount: getRandomAmount(250, 280, 300, 350, 380, 350, 320, 310, 345, 340) }
    );

    const adjustedOrders = adjustOrdersToMaxBudget(orders, noBudget);
    return adjustedOrders.sort((a, b) => b.price - a.price);
}

async function placeOrder(orderBody: any) {
    const response = await axios.post(ORDER_API_URL, orderBody, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orderBody.accessToken}`
        }
    });
    return response.data;
}

// Function to get number of markets to scrape from user
async function getMarketsToScrape(): Promise<number> {
    return new Promise((resolve) => {
        rl.question('📊 How many markets to scrape? (default: 5, max: 50): ', (answer) => {
            const numMarkets = parseInt(answer.trim());
            if (isNaN(numMarkets) || numMarkets <= 0) {
                console.log('⚠️  Invalid input. Using default: 5 markets');
                resolve(5);
            } else if (numMarkets > 50) {
                console.log('⚠️  Too many markets. Using maximum: 50 markets');
                resolve(50);
            } else {
                console.log(`✅ Will scrape ${numMarkets} markets`);
                resolve(numMarkets);
            }
        });
    });
}

// Function to get latest market ID from user input
async function getLatestMarketIdFromUser(): Promise<number> {
    return new Promise((resolve) => {
        rl.question('🔍 Enter the latest market ID to start from (descending order): ', (answer) => {
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

async function main() {
    console.log('='.repeat(60));
    console.log('💰 MULTI-MARKET-ID LIQUIDITY PROVISION (AUTOMATED MODE)');
    console.log('='.repeat(60));

    // Enforce allowed proxy wallets
    validateAllowedProxyWallets();

    // Initialize expense logger
    const expenseLogger = new ExpenseLogger();

    // Get number of markets to scrape
    const numMarkets = await getMarketsToScrape();
    
    // Get the starting market ID
    const firstMarketId = await getLatestMarketIdFromUser();

    // Create market configurations with user input for each starting digit
    const marketConfigs: { marketId: number, startDigit: number }[] = [];
    
    console.log(`\n🎯 Configuring ${numMarkets} markets - please provide starting digit for each...`);
    
    // Get starting digit for each market
    for (let i = 0; i < numMarkets; i++) {
        const marketId = firstMarketId - i; // Descending order
        
        const startDigitStr = await getUserInput(`Enter starting digit for Market ${marketId} (20-80): `);
        const startDigit = parseInt(startDigitStr.trim());
        
        if (isNaN(startDigit) || startDigit < 20 || startDigit > 80) {
            console.log(`⚠️  Invalid start digit for market ${marketId}, using default: 50`);
            marketConfigs.push({ marketId, startDigit: 50 });
        } else {
            marketConfigs.push({ marketId, startDigit });
            console.log(`✅ Market ${marketId}: Starting Digit ${startDigit}`);
        }
    }

    // Display summary of markets to be processed
    console.log('\n📋 MARKET SUMMARY:');
    console.log('='.repeat(40));
    for (const config of marketConfigs) {
        console.log(`Market ID: ${config.marketId} | Starting Digit: ${config.startDigit}`);
    }
    console.log('='.repeat(40));

    // Login both accounts
    // Login strictly using the two allowed proxy wallets' corresponding private keys
    const yesAccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY);
    const noAccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY_2);
    const yesAccount = getYesAccount(yesAccessToken);
    const noAccount = getNoAccount(noAccessToken);

    for (const { marketId, startDigit } of marketConfigs) {
        try {
            const event = await fetchMarket(marketId, yesAccessToken);
            if (!event || !event.markets || event.markets.length === 0) {
                console.error(`No markets found for market ID ${marketId}, skipping.`);
                continue;
            }
            const market = event.markets[0];

            // Get YES/NO outcomes (for YES/NO markets) or Team outcomes (for NFL/MLB markets)
            const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
            const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
            
            // For NFL/MLB markets, use the first two outcomes as Team 1 and Team 2
            const team1Outcome = market.outcomes[0];
            const team2Outcome = market.outcomes[1];
            
            // Determine market type and set outcomes accordingly
            let outcome1, outcome2, marketType;
            if (yesOutcome && noOutcome) {
                outcome1 = yesOutcome;
                outcome2 = noOutcome;
                marketType = 'YES/NO';
                console.log(`📊 YES/NO Market: ${market.title}`);
            } else if (team1Outcome && team2Outcome) {
                outcome1 = team1Outcome;
                outcome2 = team2Outcome;
                marketType = 'TEAM';
                console.log(`🏈 NFL/Team Market: ${team1Outcome.title} vs ${team2Outcome.title}`);
            } else {
                console.error(`Market ${marketId} does not have valid outcomes (need YES/NO or 2 teams), skipping.`);
                continue;
            }

            // Set market type for logging
            expenseLogger.setMarketType(marketType);

            // Get budget allocation based on starting odds
            const { totalBudget, yesBudget, noBudget } = getBudgetAllocation(startDigit);

            // Place initial Outcome 1 order (wallet 1)
            const outcome1StartPrice = toCents(startDigit / 100);
            const initialOutcome1Order = {
                marketId: market.id,
                token: outcome1,
                account: yesAccount,
                price: outcome1StartPrice,
                amount: 300,
                side: 0,
                accessToken: yesAccount.accessToken
            };
            
            console.log(`🚀 Placing initial ${marketType === 'YES/NO' ? 'YES' : 'Team1'} order for Market ${market.id}...`);
            try {
                const result1 = await placeOrder(initialOutcome1Order);
                const outcome1Name = marketType === 'YES/NO' ? 'YES' : 'Team1';
                console.log(`✅ Initial ${outcome1Name} order placed for Market ${market.id} at $${outcome1StartPrice} (300 shares)`);
                console.log(`   Order Result:`, result1);
                expenseLogger.logInitialOrder('OUTCOME1', outcome1StartPrice * 300);
            } catch (e) {
                console.error(`❌ Failed initial ${marketType === 'YES/NO' ? 'YES' : 'Team1'} order for Market ${market.id}:`, e.message);
                console.error(`   Full error:`, e);
                continue;
            }

            // Wait 2 seconds before placing the second initial order
            console.log('⏳ Waiting 2 seconds before placing second initial order...');
            await new Promise(res => setTimeout(res, 2000));

            // Place initial Outcome 2 order (wallet 2)
            // Place the second initial order at the exact complementary price to 1.00
            const outcome2StartPrice = toCents(1.00 - outcome1StartPrice);
            const initialOutcome2Order = {
                marketId: market.id,
                token: outcome2,
                account: noAccount,
                price: outcome2StartPrice,
                amount: 300,
                side: 0,
                accessToken: noAccount.accessToken
            };
            
            console.log(`🚀 Placing initial ${marketType === 'YES/NO' ? 'NO' : 'Team2'} order for Market ${market.id}...`);
            try {
                const result2 = await placeOrder(initialOutcome2Order);
                const outcome2Name = marketType === 'YES/NO' ? 'NO' : 'Team2';
                console.log(`✅ Initial ${outcome2Name} order placed for Market ${market.id} at $${outcome2StartPrice} (300 shares)`);
                console.log(`   Order Result:`, result2);
                expenseLogger.logInitialOrder('OUTCOME2', outcome2StartPrice * 300);
            } catch (e) {
                console.error(`❌ Failed initial ${marketType === 'YES/NO' ? 'NO' : 'Team2'} order for Market ${market.id}:`, e.message);
                console.error(`   Full error:`, e);
                continue;
            }
            
            // Wait for initial orders to match before proceeding
            console.log('⏳ Waiting 10 seconds for initial orders to match...');
            await new Promise(res => setTimeout(res, 10000));

            // Get budget allocation based on starting odds
            console.log(`\nMarket ID: ${market.id}`);
            console.log(`Title: ${market.title}`);
            console.log(`Question: ${market.question}`);
            console.log(`Status: ${market.status}`);
            console.log(`Volume: ${market.volume}`);
            console.log(`Market Type: ${marketType}`);
            console.log(`💰 Budget Allocation (Starting odds: ${startDigit}):`);
            console.log(`   Total Budget: $${totalBudget}`);
            console.log(`   ${marketType === 'YES/NO' ? 'YES' : 'Team1'} Budget: $${yesBudget}`);
            console.log(`   ${marketType === 'YES/NO' ? 'NO' : 'Team2'} Budget: $${noBudget}`);
            console.log('Outcomes:');
            for (const outcome of market.outcomes) {
                console.log(` - Outcome: ${outcome.title} (ID: ${outcome.id}) | Token ID: ${outcome.tokenId} | Price: ${outcome.price}`);
            }

            // Generate Outcome 1 orders
            const outcome1Orders = generateYesOrders(startDigit, yesBudget);
            let outcome1TotalCost = 0;

            console.log(`\n📊 ${marketType === 'YES/NO' ? 'YES' : 'Team1'} Orders (Budget: $${yesBudget}):`);
            for (const order of outcome1Orders) {
                const cost = order.price * order.amount;
                outcome1TotalCost += cost;
                console.log(` Price: $${order.price} | Shares: ${order.amount} | Cost: $${cost.toFixed(2)}`);
            }
            console.log(` Total ${marketType === 'YES/NO' ? 'YES' : 'Team1'} Cost: $${outcome1TotalCost.toFixed(2)}`);

            // Generate Outcome 2 orders
            const outcome2Orders = generateNoOrders(startDigit, noBudget);
            let outcome2TotalCost = 0;

            console.log(`\n📊 ${marketType === 'YES/NO' ? 'NO' : 'Team2'} Orders (Budget: $${noBudget}):`);
            for (const order of outcome2Orders) {
                const cost = order.price * order.amount;
                outcome2TotalCost += cost;
                console.log(` Price: $${order.price} | Shares: ${order.amount} | Cost: $${cost.toFixed(2)}`);
            }
            console.log(` Total ${marketType === 'YES/NO' ? 'NO' : 'Team2'} Cost: $${outcome2TotalCost.toFixed(2)}`);

            // Show total summary
            console.log(`\n💰 ORDER SUMMARY FOR MARKET ${market.id}:`);
            console.log(`   ${marketType === 'YES/NO' ? 'YES' : 'Team1'} Total: $${outcome1TotalCost.toFixed(2)}`);
            console.log(`   ${marketType === 'YES/NO' ? 'NO' : 'Team2'} Total: $${outcome2TotalCost.toFixed(2)}`);
            console.log(`   Combined Total: $${(outcome1TotalCost + outcome2TotalCost).toFixed(2)}`);
            console.log(`   Planned Budget: $${totalBudget}`);

            console.log(`\n🚀 Automatically placing orders for Market ${market.id}...`);

            // Place Outcome 1 orders
            for (const order of outcome1Orders) {
                const orderBody = {
                    marketId: market.id,
                    token: outcome1,
                    account: yesAccount,
                    price: order.price,
                    amount: order.amount,
                    side: 0, // 0 for buy
                    accessToken: yesAccount.accessToken
                };
                try {
                    await placeOrder(orderBody);
                    const cost = order.price * order.amount;
                    const outcome1Name = marketType === 'YES/NO' ? 'YES' : 'Team1';
                    console.log(`✅ ${outcome1Name} order placed for Market ${market.id} at $${order.price} (${order.amount} shares) - Cost: $${cost.toFixed(2)}`);
                    expenseLogger.logSuccessfulOrder('OUTCOME1', cost);
                    await new Promise(res => setTimeout(res, 1000));
                } catch (e) {
                    const outcome1Name = marketType === 'YES/NO' ? 'YES' : 'Team1';
                    console.error(`❌ Failed ${outcome1Name} order for Market ${market.id} at $${order.price}:`, e.message);
                }
            }

            // Place Outcome 2 orders
            for (const order of outcome2Orders) {
                const orderBody = {
                    marketId: market.id,
                    token: outcome2,
                    account: noAccount,
                    price: order.price,
                    amount: order.amount,
                    side: 0, // 0 for buy
                    accessToken: noAccount.accessToken
                };
                try {
                    await placeOrder(orderBody);
                    const cost = order.price * order.amount;
                    const outcome2Name = marketType === 'YES/NO' ? 'NO' : 'Team2';
                    console.log(`✅ ${outcome2Name} order placed for Market ${market.id} at $${order.price} (${order.amount} shares) - Cost: $${cost.toFixed(2)}`);
                    expenseLogger.logSuccessfulOrder('OUTCOME2', cost);
                    await new Promise(res => setTimeout(res, 1000));
                } catch (e) {
                    const outcome2Name = marketType === 'YES/NO' ? 'NO' : 'Team2';
                    console.error(`❌ Failed ${outcome2Name} order for Market ${market.id} at $${order.price}:`, e.message);
                }
            }

            console.log(`\n💰 Market ${market.id} Summary:`);
            console.log(` ${marketType === 'YES/NO' ? 'YES' : 'Team1'} Total: $${outcome1TotalCost.toFixed(2)} | ${marketType === 'YES/NO' ? 'NO' : 'Team2'} Total: $${outcome2TotalCost.toFixed(2)}`);
            console.log(` Combined Total: $${(outcome1TotalCost + outcome2TotalCost).toFixed(2)}`);
            console.log(` Planned Budget: $${totalBudget}`);
            console.log(`Finished liquidity for Market ${market.id}\n`);

        } catch (err) {
            console.error(`Error processing market ID ${marketId}:`, err.message);
        }
    }

    // Log session summary before closing
    expenseLogger.logSessionSummary();

    rl.close();
    console.log('🏁 MULTI-MARKET-ID LIQUIDITY PROVISION COMPLETED');
}

main();

