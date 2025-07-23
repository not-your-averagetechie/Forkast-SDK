import axios from 'axios';
import * as readline from 'readline';
const dotenv = require('dotenv');
dotenv.config();

const NETWORK = process.env.NETWORK || 'mainnet';

const CONFIG = {
  testnet: {
    EVENT_API_URL: process.env.TESTNET_MARKET_API_URL || 'http://localhost:3000/market/event',
    LOGIN_API_URL: process.env.TESTNET_ACCOUNT_API_URL || 'http://localhost:3000/account/login',
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

function getUserInput(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function fetchEvent(eventId: number) {
  const response = await axios.get(EVENT_API_URL, { params: { id: eventId } });
  return response.data;
}

function getRandomAmount(...amounts: number[]): number {
  return amounts[Math.floor(Math.random() * amounts.length)];
}

function generateYesOrders(startDigit: number) {
  const startPrice = startDigit / 100;
  const orders = [];
  orders.push({ price: startPrice, amount: getRandomAmount(80, 60, 50, 65) });
  let currentPrice = Math.floor(startPrice * 20) * 0.05;
  if (currentPrice >= startPrice) currentPrice -= 0.05;
  while (currentPrice >= 0.10) {
    if (currentPrice >= 0.50) orders.push({ price: currentPrice, amount: getRandomAmount(35, 45, 30, 20, 25, 22, 24) });
    else if (currentPrice >= 0.30) orders.push({ price: currentPrice, amount: getRandomAmount(20, 24, 26, 28, 30, 25) });
    else if (currentPrice >= 0.20) orders.push({ price: currentPrice, amount: getRandomAmount(26, 28, 25, 30, 35, 40) });
    else if (currentPrice >= 0.10) orders.push({ price: currentPrice, amount: getRandomAmount(30, 35, 40, 45, 50, 55, 65, 70, 45) });
    currentPrice -= 0.05;
  }
  orders.push(
    { price: 0.09, amount: getRandomAmount(50, 55, 60, 65, 45, 64, 40) },
    { price: 0.08, amount: getRandomAmount(50, 55, 60, 65, 45, 64, 40) },
    { price: 0.07, amount: getRandomAmount(30, 55, 60, 65, 45, 64, 40) },
    { price: 0.06, amount: getRandomAmount(80, 85, 95,70,65,60) },
    { price: 0.05, amount: getRandomAmount(80, 85, 95, 105, 90, 100, 110) },
    { price: 0.04, amount: getRandomAmount(105,100,90,85,102, 110) },
    { price: 0.03, amount: getRandomAmount(150, 140, 120,125,130,110,105,100) },
    { price: 0.02, amount: getRandomAmount(150,160,175,165,155,170,185,145,140) },
    { price: 0.01, amount: getRandomAmount(250,280,300,350,380,350,320,310,345,340) }
  );
  return orders;
}

function generateNoOrders(startDigit: number) {
  const startPrice = startDigit / 100;
  const orders = [];
  const noStartPrice = 0.99 - startPrice;
  if (noStartPrice >= 0.10 && noStartPrice <= 0.90) orders.push({ price: noStartPrice, amount: getRandomAmount(80, 60, 50, 65) });
  let currentNoPrice = Math.floor(noStartPrice * 20) * 0.05;
  if (currentNoPrice >= noStartPrice) currentNoPrice -= 0.05;
  while (currentNoPrice >= 0.10) {
    if (currentNoPrice >= 0.50) orders.push({ price: currentNoPrice, amount: getRandomAmount(35, 45, 30, 20, 25, 22, 24) });
    else if (currentNoPrice >= 0.30) orders.push({ price: currentNoPrice, amount: getRandomAmount(20, 24, 26, 28, 30, 25) });
    else if (currentNoPrice >= 0.20) orders.push({ price: currentNoPrice, amount: getRandomAmount(26, 28, 25, 30, 35, 40) });
    else if (currentNoPrice >= 0.10) orders.push({ price: currentNoPrice, amount: getRandomAmount(30, 35, 40, 45, 50, 55, 65, 70, 45) });
    currentNoPrice -= 0.05;
  }
  orders.push(
    { price: 0.09, amount: getRandomAmount(50, 55, 60, 65, 45, 64, 40) },
    { price: 0.08, amount: getRandomAmount(50, 55, 60, 65, 45, 64, 40) },
    { price: 0.07, amount: getRandomAmount(30, 55, 60, 65, 45, 64, 40) },
    { price: 0.06, amount: getRandomAmount(80, 85, 95,70,65,60) },
    { price: 0.05, amount: getRandomAmount(80, 85, 95, 105, 90, 100, 110) },
    { price: 0.04, amount: getRandomAmount(105,100,90,85,102, 110) },
    { price: 0.03, amount: getRandomAmount(150, 140, 120,125,130,110,105,100) },
    { price: 0.02, amount: getRandomAmount(150,160,175,165,155,170,185,145,140) },
    { price: 0.01, amount: getRandomAmount(250,280,300,350,380,350,320,310,345,340) }
  );
  return orders.sort((a, b) => b.price - a.price);
}

async function placeOrder(orderBody: any, API_URL: string) {
  const response = await axios.post(API_URL, orderBody, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orderBody.accessToken}`
    }
  });
  return response.data;
}

async function main() {
  console.log('='.repeat(60));
  console.log('💰 MULTI-MARKET (MULTI-MARKETS IN SINGLE EVENT) LIQUIDITY PROVISION');
  console.log('='.repeat(60));

  const eventIdStr = await getUserInput('Enter event ID: ');
  const eventId = parseInt(eventIdStr.trim());
  if (isNaN(eventId)) {
    console.error('Invalid event ID.');
    process.exit(1);
  }

  // Login both accounts
  const yesAccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY);
  const noAccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY_2);
  const yesAccount = getYesAccount(yesAccessToken);
  const noAccount = getNoAccount(noAccessToken);

  // Fetch event and all markets
  const event = await fetchEvent(eventId);
  if (!event.markets || event.markets.length === 0) {
    console.error('No markets found in event.');
    process.exit(1);
  }

  console.log(`\nEvent: ${event.title}`);
  console.log(`Markets found: ${event.markets.length}\n`);

  for (const market of event.markets) {
    console.log(`Market ID: ${market.id}`);
    console.log(`Title: ${market.title}`);
    console.log(`Question: ${market.question}`);
    console.log(`Status: ${market.status}`);
    console.log(`Volume: ${market.volume}`);
    console.log('Outcomes:');
    for (const outcome of market.outcomes) {
      console.log(`  - Outcome: ${outcome.title} (ID: ${outcome.id}) | Token ID: ${outcome.tokenId} | Price: ${outcome.price}`);
    }
    console.log('-'.repeat(40));
  }

  for (const market of event.markets) {
    const startDigitStr = await getUserInput(`Enter starting digit for YES outcome for Market ${market.id} (${market.title}): `);
    const startDigit = parseInt(startDigitStr.trim());
    if (isNaN(startDigit) || startDigit < 10 || startDigit > 90) {
      console.log('Invalid start digit, skipping this market.');
      continue;
    }

    // Place YES orders
    const yesOrders = generateYesOrders(startDigit);
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
        await placeOrder(orderBody, process.env.MAINNET_ORDER_API_URL || process.env.TESTNET_ORDER_API_URL);
        console.log(`✅ YES order placed for Market ${market.id} at $${order.price} (${order.amount} shares)`);
        await new Promise(res => setTimeout(res, 1000));
      } catch (e) {
        console.error(`❌ Failed YES order for Market ${market.id} at $${order.price}:`, e.message);
      }
    }

    // Place NO orders
    const noOrders = generateNoOrders(startDigit);
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
        await placeOrder(orderBody, process.env.MAINNET_ORDER_API_URL || process.env.TESTNET_ORDER_API_URL);
        console.log(`✅ NO order placed for Market ${market.id} at $${order.price} (${order.amount} shares)`);
        await new Promise(res => setTimeout(res, 1000));
      } catch (e) {
        console.error(`❌ Failed NO order for Market ${market.id} at $${order.price}:`, e.message);
      }
    }
    console.log(`Finished liquidity for Market ${market.id}\n`);
  }

  rl.close();
  console.log('🏁 MULTI-MARKET LIQUIDITY PROVISION COMPLETED');
}

main();
