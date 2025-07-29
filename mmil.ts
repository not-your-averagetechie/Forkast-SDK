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

const EVENT_API_URL = CONFIG[NETWORK].EVENT_API_URL;
const LOGIN_API_URL = CONFIG[NETWORK].LOGIN_API_URL;
const ORDER_API_URL = CONFIG[NETWORK].ORDER_API_URL;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Simplified logging functionality
class ExpenseLogger {
    private logFolderPath: string;
    private logFilePath: string;
    private totalYesSpent: number = 0;
    private totalNoSpent: number = 0;

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
            total_yes_spent: 0,
            total_no_spent: 0
        };
        
        fs.writeFileSync(this.logFilePath, JSON.stringify(initialData, null, 2));
        console.log(`📝 Expense log created: ${this.logFilePath}`);
    }

    logSuccessfulOrder(orderType: 'YES' | 'NO', cost: number) {
        if (orderType === 'YES') {
            this.totalYesSpent += cost;
        } else {
            this.totalNoSpent += cost;
        }
        
        this.updateLogFile();
        console.log(`💰 ${orderType} order: $${cost.toFixed(2)} | Total ${orderType}: $${(orderType === 'YES' ? this.totalYesSpent : this.totalNoSpent).toFixed(2)}`);
    }

    logSessionSummary() {
        const now = new Date();
        
        // Update final totals
        this.updateLogFile(now.toISOString());
        
        console.log(`\n🏁 SESSION SUMMARY:`);
        console.log(`   Total YES Spent: $${this.totalYesSpent.toFixed(2)}`);
        console.log(`   Total NO Spent: $${this.totalNoSpent.toFixed(2)}`);
        console.log(`   Grand Total: $${(this.totalYesSpent + this.totalNoSpent).toFixed(2)}`);
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
                total_yes_spent: parseFloat(this.totalYesSpent.toFixed(2)),
                total_no_spent: parseFloat(this.totalNoSpent.toFixed(2)),
                grand_total: parseFloat((this.totalYesSpent + this.totalNoSpent).toFixed(2))
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

async function fetchMarket(marketId: number) {
    const response = await axios.get(EVENT_API_URL, { params: { id: marketId } });
    return response.data;
}

function getRandomAmount(...amounts: number[]): number {
    return amounts[Math.floor(Math.random() * amounts.length)];
}

function adjustOrdersToMaxBudget(orders: any[], maxBudget: number) {
    // Calculate total cost
    let totalCost = orders.reduce((sum, order) => sum + (order.price * order.amount), 0);

    if (totalCost <= maxBudget) {
        return orders;
    }

    // Keep top order unchanged, adjust middle and bottom orders with new percentages
    const adjustedOrders = [...orders];

    // Don't modify the first order (top order)
    for (let i = 1; i < adjustedOrders.length; i++) {
        const order = adjustedOrders[i];

        // UPDATED REDUCTION STRATEGY:
        if (i < adjustedOrders.length / 2) {
            // Middle orders: reduce by 50-70% (more aggressive than before)
            order.amount = Math.max(1, Math.floor(order.amount * getRandomAmount(0.3, 0.4, 0.5)));
        } else {
            // Bottom orders: reduce by 30-40% (less aggressive than before)
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

function generateYesOrders(startDigit: number) {
    const startPrice = startDigit / 100;
    const orders = [];

    // Keep top order with same shares
    orders.push({ price: startPrice, amount: getRandomAmount(80, 60, 50, 65) });

    let currentPrice = Math.floor(startPrice * 20) * 0.05;
    if (currentPrice >= startPrice) currentPrice -= 0.05;

    while (currentPrice >= 0.10) {
        if (currentPrice >= 0.50) orders.push({ price: currentPrice, amount: getRandomAmount(20, 25, 22, 24) });
        else if (currentPrice >= 0.30) orders.push({ price: currentPrice, amount: getRandomAmount(10, 15, 14, 18, 20) });
        else if (currentPrice >= 0.20) orders.push({ price: currentPrice, amount: getRandomAmount(10, 15, 14, 18, 20, 22, 24) });
        else if (currentPrice >= 0.10) orders.push({ price: currentPrice, amount: getRandomAmount(10, 15, 14, 18, 22, 25, 28, 30, 20) });
        currentPrice -= 0.05;
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

    return adjustOrdersToMaxBudget(orders, 80);
}

function generateNoOrders(startDigit: number) {
    const startPrice = startDigit / 100;
    const orders = [];
    const noStartPrice = 0.99 - startPrice;

    // Keep top order with same shares
    if (noStartPrice >= 0.10 && noStartPrice <= 0.90) {
        orders.push({ price: noStartPrice, amount: getRandomAmount(80, 60, 50, 65) });
    }

    let currentNoPrice = Math.floor(noStartPrice * 20) * 0.05;
    if (currentNoPrice >= noStartPrice) currentNoPrice -= 0.05;

    while (currentNoPrice >= 0.10) {
        if (currentNoPrice >= 0.50) orders.push({ price: currentNoPrice, amount: getRandomAmount(20, 25, 22, 24) });
        else if (currentNoPrice >= 0.30) orders.push({ price: currentNoPrice, amount: getRandomAmount(10, 15, 14, 18, 20) });
        else if (currentNoPrice >= 0.20) orders.push({ price: currentNoPrice, amount: getRandomAmount(10, 15, 14, 18, 20, 22, 24) });
        else if (currentNoPrice >= 0.10) orders.push({ price: currentNoPrice, amount: getRandomAmount(10, 15, 14, 18, 22, 25, 28, 30, 20) });
        currentNoPrice -= 0.05;
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

    const adjustedOrders = adjustOrdersToMaxBudget(orders, 80);
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

async function main() {
    console.log('='.repeat(60));
    console.log('💰 MULTI-MARKET-ID LIQUIDITY PROVISION (MAX $80 BUDGET)');
    console.log('='.repeat(60));

    // Initialize expense logger
    const expenseLogger = new ExpenseLogger();

    const numMarketsStr = await getUserInput('How many markets do you want to provide liquidity for? ');
    const numMarkets = parseInt(numMarketsStr.trim());
    if (isNaN(numMarkets) || numMarkets < 1) {
        console.error('Invalid number.');
        process.exit(1);
    }

    const marketConfigs: { marketId: number, startDigit: number }[] = [];
    for (let i = 0; i < numMarkets; i++) {
        const marketIdStr = await getUserInput(`Enter market ID for market #${i + 1}: `);
        const marketId = parseInt(marketIdStr.trim());
        if (isNaN(marketId)) {
            console.error('Invalid market ID, skipping.');
            continue;
        }
        const startDigitStr = await getUserInput(`Enter starting digit for YES outcome for market #${i + 1}: `);
        const startDigit = parseInt(startDigitStr.trim());
        if (isNaN(startDigit) || startDigit < 10 || startDigit > 90) {
            console.error('Invalid start digit, skipping.');
            continue;
        }
        marketConfigs.push({ marketId, startDigit });
    }

    // Login both accounts
    const yesAccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY);
    const noAccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY_2);
    const yesAccount = getYesAccount(yesAccessToken);
    const noAccount = getNoAccount(noAccessToken);

    for (const { marketId, startDigit } of marketConfigs) {
        try {
            const event = await fetchMarket(marketId);
            if (!event.markets || event.markets.length === 0) {
                console.error(`No markets found for market ID ${marketId}, skipping.`);
                continue;
            }
            const market = event.markets[0];
            console.log(`\nMarket ID: ${market.id}`);
            console.log(`Title: ${market.title}`);
            console.log(`Question: ${market.question}`);
            console.log(`Status: ${market.status}`);
            console.log(`Volume: ${market.volume}`);
            console.log('Outcomes:');
            for (const outcome of market.outcomes) {
                console.log(` - Outcome: ${outcome.title} (ID: ${outcome.id}) | Token ID: ${outcome.tokenId} | Price: ${outcome.price}`);
            }

            // Place YES orders
            const yesOrders = generateYesOrders(startDigit);
            let yesTotalCost = 0;

            console.log(`\n📊 YES Orders (Budget: $80):`);
            for (const order of yesOrders) {
                const cost = order.price * order.amount;
                yesTotalCost += cost;
                console.log(` Price: $${order.price} | Shares: ${order.amount} | Cost: $${cost.toFixed(2)}`);
            }
            console.log(` Total YES Cost: $${yesTotalCost.toFixed(2)}`);

            for (const order of yesOrders) {
                const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
                if (!yesOutcome) continue;
                const orderBody = {
                    marketId: market.id,
                    token: yesOutcome,
                    account: yesAccount,
                    price: order.price,
                    amount: order.amount,
                    side: 0,
                    accessToken: yesAccount.accessToken
                };
                try {
                    await placeOrder(orderBody);
                    const cost = order.price * order.amount;
                    console.log(`✅ YES order placed for Market ${market.id} at $${order.price} (${order.amount} shares) - Cost: $${cost.toFixed(2)}`);
                    expenseLogger.logSuccessfulOrder('YES', cost);
                    await new Promise(res => setTimeout(res, 1000));
                } catch (e) {
                    console.error(`❌ Failed YES order for Market ${market.id} at $${order.price}:`, e.message);
                }
            }

            // Place NO orders
            const noOrders = generateNoOrders(startDigit);
            let noTotalCost = 0;

            console.log(`\n📊 NO Orders (Budget: $80):`);
            for (const order of noOrders) {
                const cost = order.price * order.amount;
                noTotalCost += cost;
                console.log(` Price: $${order.price} | Shares: ${order.amount} | Cost: $${cost.toFixed(2)}`);
            }
            console.log(` Total NO Cost: $${noTotalCost.toFixed(2)}`);

            for (const order of noOrders) {
                const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
                if (!noOutcome) continue;
                const orderBody = {
                    marketId: market.id,
                    token: noOutcome,
                    account: noAccount,
                    price: order.price,
                    amount: order.amount,
                    side: 0,
                    accessToken: noAccount.accessToken
                };
                try {
                    await placeOrder(orderBody);
                    const cost = order.price * order.amount;
                    console.log(`✅ NO order placed for Market ${market.id} at $${order.price} (${order.amount} shares) - Cost: $${cost.toFixed(2)}`);
                    expenseLogger.logSuccessfulOrder('NO', cost);
                    await new Promise(res => setTimeout(res, 1000));
                } catch (e) {
                    console.error(`❌ Failed NO order for Market ${market.id} at $${order.price}:`, e.message);
                }
            }

            console.log(`\n💰 Market ${market.id} Summary:`);
            console.log(` YES Total: $${yesTotalCost.toFixed(2)} | NO Total: $${noTotalCost.toFixed(2)}`);
            console.log(` Combined Total: $${(yesTotalCost + noTotalCost).toFixed(2)}`);
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
