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

function getUserInput(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer));
    });
}

async function loginAndGetAccessToken(privateKey: string): Promise<string> {
    const response = await axios.get(LOGIN_API_URL, { params: { privateKey } });
    return response.data.accessToken;
}

function getAccount(side: 'YES' | 'NO', accessToken: string) {
    if (side === 'YES') {
        return {
            wallet: CONFIG[NETWORK].WALLET_ADDRESS,
            private_key: CONFIG[NETWORK].PRIVATE_KEY,
            proxy_wallet: CONFIG[NETWORK].PROXY_WALLET,
            accessToken
        };
    } else {
        return {
            wallet: CONFIG[NETWORK].WALLET_ADDRESS_2,
            private_key: CONFIG[NETWORK].PRIVATE_KEY_2,
            proxy_wallet: CONFIG[NETWORK].PROXY_WALLET_2,
            accessToken
        };
    }
}

async function fetchMarket(marketId: number) {
    const response = await axios.get(EVENT_API_URL, { params: { id: marketId } });
    return response.data;
}

function getRandomAmount(...amounts: number[]): number {
    return amounts[Math.floor(Math.random() * amounts.length)];
}

function generateOrders(startDigit: number, endDigit: number, budget: number, side: 'YES' | 'NO') {
    const orders = [];
    let price = startDigit;
    const endPrice = endDigit;
    const step = price > endPrice ? -5 : 5; // Use 5% steps

    // Map price to shares using mmil.ts logic, but dynamically for any start/end
    function sharesForPrice(p: number, start: number) {
        if (p === start) return getRandomAmount(30, 32, 28, 35); // Top order
        if (p >= 75) return getRandomAmount(2, 3, 4);
        if (p >= 70) return getRandomAmount(2, 3, 4);
        if (p >= 65) return getRandomAmount(2, 3, 4);
        if (p >= 60) return getRandomAmount(2, 3, 4);
        if (p >= 55) return getRandomAmount(2, 3, 4);
        if (p >= 50) return getRandomAmount(2, 3, 4);
        if (p >= 45) return getRandomAmount(3, 4, 5);
        if (p >= 40) return getRandomAmount(2, 3, 4);
        if (p >= 35) return getRandomAmount(2, 3, 4);
        if (p >= 30) return getRandomAmount(3, 4, 5);
        if (p >= 25) return getRandomAmount(6, 7, 8);
        return 1;
    }

    // Place orders at each step
    for (let p = price; step > 0 ? p <= endPrice : p >= endPrice; p += step) {
        const shares = sharesForPrice(p, startDigit);
        orders.push({ price: p / 100, amount: shares });
    }

    // Adjust to budget
    let totalCost = orders.reduce((sum, order) => sum + (order.price * order.amount), 0);
    if (totalCost > budget) {
        // Reduce amounts proportionally except top order
        const reductionFactor = budget / totalCost;
        for (let i = 1; i < orders.length; i++) {
            orders[i].amount = Math.max(1, Math.floor(orders[i].amount * reductionFactor));
        }
    }
    return orders;
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
    console.log('💰 SINGLE-SIDE LIQUIDITY PROVISION');
    console.log('='.repeat(60));

    // Ask which side to place orders on first
    const sideStr = await getUserInput('Which side do you want to place orders on? (YES/NO): ');
    const side = sideStr.trim().toUpperCase() === 'NO' ? 'NO' : 'YES';

    const marketIdStr = await getUserInput('Enter market ID: ');
    const marketId = parseInt(marketIdStr.trim());
    if (isNaN(marketId)) {
        console.error('Invalid market ID.');
        process.exit(1);
    }

    const startDigitStr = await getUserInput('Enter starting digit (e.g. 58 for 58%): ');
    const startDigit = parseInt(startDigitStr.trim());
    if (isNaN(startDigit) || startDigit < 1 || startDigit > 99) {
        console.error('Invalid starting digit.');
        process.exit(1);
    }

    const endDigitStr = await getUserInput('Enter ending digit (e.g. 10 for 10%): ');
    const endDigit = parseInt(endDigitStr.trim());
    if (isNaN(endDigit) || endDigit < 1 || endDigit > 99) {
        console.error('Invalid ending digit.');
        process.exit(1);
    }

    const budgetStr = await getUserInput('Enter total budget for this side (e.g. 50): ');
    const budget = parseFloat(budgetStr.trim());
    if (isNaN(budget) || budget <= 0) {
        console.error('Invalid budget.');
        process.exit(1);
    }

    // Login account for the chosen side
    const accessToken = await loginAndGetAccessToken(side === 'YES' ? CONFIG[NETWORK].PRIVATE_KEY : CONFIG[NETWORK].PRIVATE_KEY_2);
    const account = getAccount(side, accessToken);

    // Fetch market and outcome
    const event = await fetchMarket(marketId);
    if (!event.markets || event.markets.length === 0) {
        console.error('No markets found for market ID.');
        process.exit(1);
    }
    const market = event.markets[0];
    const outcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === side.toLowerCase());
    if (!outcome) {
        console.error(`No outcome found for side "${side}"`);
        process.exit(1);
    }

    // Generate orders
    const orders = generateOrders(startDigit, endDigit, budget, side);

    // Preview orders
    let totalCost = 0;
    console.log(`\n📊 ${side} Orders Preview:`);
    for (const order of orders) {
        const cost = order.price * order.amount;
        totalCost += cost;
        console.log(` Price: $${order.price} | Shares: ${order.amount} | Cost: $${cost.toFixed(2)}`);
    }
    console.log(` Total ${side} Cost: $${totalCost.toFixed(2)}`);

    const confirmStr = await getUserInput('\n✅ Do you want to place ALL these orders? (y/n): ');
    if (confirmStr.toLowerCase() !== 'y' && confirmStr.toLowerCase() !== 'yes') {
        console.log('❌ Operation cancelled by user.');
        rl.close();
        return;
    }

    // Place orders
    for (const order of orders) {
        const orderBody = {
            marketId: market.id,
            token: outcome,
            account,
            price: order.price,
            amount: order.amount,
            side: 0,
            accessToken: account.accessToken
        };
        try {
            await placeOrder(orderBody);
            const cost = order.price * order.amount;
            console.log(`✅ ${side} order placed at $${order.price} (${order.amount} shares) - Cost: $${cost.toFixed(2)}`);
            await new Promise(res => setTimeout(res, 500));
        } catch (e) {
            console.error(`❌ Failed ${side} order at $${order.price}:`, e.message);
        }
    }

    rl.close();
    console.log('\n🏁 SINGLE-SIDE LIQUIDITY PROVISION COMPLETED');
}

main();

// Example for startDigit = 69, endDigit = 45
// The script will place orders at: 69, 65, 60, 55, 50, 45
// Shares for each price (randomly chosen from ranges):
// 69: getRandomAmount(30, 32, 28, 35)   // Top order
// 65: getRandomAmount(2, 3, 4)
// 60: getRandomAmount(2, 3, 4)
// 55: getRandomAmount(2, 3, 4)
// 50: getRandomAmount(2, 3, 4)
// 45: getRandomAmount(3, 4, 5)

// Example output (actual shares will be randomly picked each run):
// [
//   { price: 0.69, amount: 32 }, // Top order
//   { price: 0.65, amount: 3 },
//   { price: 0.60, amount: 2 },
//   { price: 0.55, amount: 4 },
//   { price: 0.50, amount: 2 },
//   { price: 0.45, amount: 5 }
// ]

// Each order is placed as:
// {
//   marketId: ...,
//   token: ...,
//   account: ...,
//   price: <price>,
//   amount: <amount>,
//   side: 0,
//   accessToken: ...
// }
