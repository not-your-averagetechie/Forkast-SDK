import axios from 'axios';
import * as readline from 'readline';
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

function generateYesOrders(startDigit: number) {
  const startPrice = startDigit / 100;
  const orders = [];

  // Top order
  orders.push({ price: startPrice, amount: getRandomAmount(30, 35, 40, 45, 50) });

  // Place orders at every 0.05 gap down to 0.10
  let currentPrice = startPrice - 0.05;
  while (currentPrice >= 0.10) {
    orders.push({ price: parseFloat(currentPrice.toFixed(2)), amount: getRandomAmount(20, 22, 24, 26, 28) });
    currentPrice -= 0.05;
  }

  // Add bottom orders with higher shares
  orders.push(
    { price: 0.09, amount: getRandomAmount(50, 55, 60) },
    { price: 0.08, amount: getRandomAmount(60, 65, 70) },
    { price: 0.07, amount: getRandomAmount(70, 75, 80) },
    { price: 0.06, amount: getRandomAmount(80, 85, 90) },
    { price: 0.05, amount: getRandomAmount(90, 95, 100) },
    { price: 0.04, amount: getRandomAmount(100, 110, 120) },
    { price: 0.03, amount: getRandomAmount(120, 130, 140) },
    { price: 0.02, amount: getRandomAmount(140, 150, 160) },
    { price: 0.01, amount: getRandomAmount(160, 170, 180) }
  );

  return adjustOrdersToMaxBudget(orders, 30);
}

function generateNoOrders(startDigit: number) {
  const startPrice = startDigit / 100;
  const noStartPrice = 1 - startPrice;
  const orders = [];

  // Top order
  orders.push({ price: noStartPrice, amount: getRandomAmount(30, 35, 40, 45, 50) });

  // Place orders at every 0.05 gap down to 0.10
  let currentPrice = noStartPrice - 0.05;
  while (currentPrice >= 0.10) {
    orders.push({ price: parseFloat(currentPrice.toFixed(2)), amount: getRandomAmount(20, 22, 24, 26, 28) });
    currentPrice -= 0.05;
  }

  // Add bottom orders with higher shares
  orders.push(
    { price: 0.09, amount: getRandomAmount(50, 55, 60) },
    { price: 0.08, amount: getRandomAmount(60, 65, 70) },
    { price: 0.07, amount: getRandomAmount(70, 75, 80) },
    { price: 0.06, amount: getRandomAmount(80, 85, 90) },
    { price: 0.05, amount: getRandomAmount(90, 95, 100) },
    { price: 0.04, amount: getRandomAmount(100, 110, 120) },
    { price: 0.03, amount: getRandomAmount(120, 130, 140) },
    { price: 0.02, amount: getRandomAmount(140, 150, 160) },
    { price: 0.01, amount: getRandomAmount(160, 170, 180) }
  );

  return adjustOrdersToMaxBudget(orders, 30);
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

// Fix: Add missing printAccountBalances function (copied from mmil.ts)
async function getAccountBalance(accessToken: string): Promise<any> {
  try {
    const response = await axios.get(`${process.env.MAINNET_BALANCE_API_URL || 'https://api.forkast.gg/api/v1/account/balance'}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (e) {
    console.error('Error fetching account balance:', e.message);
    return null;
  }
}

async function printAccountBalances(yesAccount: any, noAccount: any) {
  console.log('\n🔎 Checking account balances...');
  const yesBalance = await getAccountBalance(yesAccount.accessToken);
  const noBalance = await getAccountBalance(noAccount.accessToken);
  if (yesBalance) {
    console.log(`YES Wallet (${yesAccount.wallet}):`);
    console.log(`  USDC: ${yesBalance.balanceUSDC}`);
    console.log(`  USDT: ${yesBalance.balanceUSDT}`);
    console.log(`  CGPC: ${yesBalance.balanceCGPC}`);
  }
  if (noBalance) {
    console.log(`NO Wallet (${noAccount.wallet}):`);
    console.log(`  USDC: ${noBalance.balanceUSDC}`);
    console.log(`  USDT: ${noBalance.balanceUSDT}`);
    console.log(`  CGPC: ${noBalance.balanceCGPC}`);
  }
}

// In main(), place initial matching orders before liquidity orders
async function main() {
  console.log('='.repeat(60));
  console.log('💰 MULTI-MARKET AUTOMATED LIQUIDITY PROVISION (MAX $80 BUDGET)');
  console.log('='.repeat(60));

  const eventIdStr = await getUserInput('Enter event ID: ');
  const eventId = parseInt(eventIdStr.trim());
  if (isNaN(eventId)) {
    console.error('Invalid event ID.');
    process.exit(1);
  }

  // Fetch event and all markets first
  console.log('\n🔍 Fetching event and markets...');
  const event = await fetchEvent(eventId);
  if (!event.markets || event.markets.length === 0) {
    console.error('No markets found in event.');
    process.exit(1);
  }

  console.log(`\nEvent: ${event.title}`);
  console.log(`Markets found: ${event.markets.length}\n`);

  // Display all markets first
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

  // **COLLECT ALL ODDS AT THE BEGINNING**
  console.log('\n📋 COLLECTING ALL STARTING ODDS');
  console.log('='.repeat(40));
  
  const marketOdds: { marketId: number, title: string, startDigit: number }[] = [];
  
  for (const market of event.markets) {
    const startDigitStr = await getUserInput(`Enter starting digit for YES outcome for Market ${market.id} (${market.title}): `);
    const startDigit = parseInt(startDigitStr.trim());
    if (isNaN(startDigit) || startDigit < 10 || startDigit > 90) {
      console.log('❌ Invalid start digit, skipping this market.');
      continue;
    }
    marketOdds.push({
      marketId: market.id,
      title: market.title,
      startDigit: startDigit
    });
  }

  if (marketOdds.length === 0) {
    console.error('No valid markets to process.');
    process.exit(1);
  }

  // Display summary of all odds
  console.log('\n📊 ODDS SUMMARY:');
  console.log('='.repeat(40));
  for (const { marketId, title, startDigit } of marketOdds) {
    console.log(`Market ${marketId}: ${title} | YES: ${startDigit}¢ | NO: ${99 - startDigit}¢`);
  }

  // Confirm before proceeding
  const confirmStr = await getUserInput('\n✅ Proceed with automated liquidity provision? (y/n): ');
  if (confirmStr.toLowerCase() !== 'y' && confirmStr.toLowerCase() !== 'yes') {
    console.log('❌ Operation cancelled.');
    rl.close();
    return;
  }

  // Login both accounts
  console.log('\n🔐 Logging in accounts...');
  const yesAccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY);
  const noAccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY_2);
  const yesAccount = getYesAccount(yesAccessToken);
  const noAccount = getNoAccount(noAccessToken);
  console.log('✅ Both accounts logged in successfully.');

  // Print balances before starting
  await printAccountBalances(yesAccount, noAccount);

  // **AUTOMATED PROCESSING OF ALL MARKETS**
  console.log('\n🚀 STARTING AUTOMATED LIQUIDITY PROVISION');
  console.log('='.repeat(60));

  for (const { marketId, title, startDigit } of marketOdds) {
    try {
      const market = event.markets.find(m => m.id === marketId);
      if (!market) {
        console.error(`❌ Market ${marketId} not found, skipping.`);
        continue;
      }

      console.log(`\n🎯 Processing Market ${marketId}: ${title}`);
      console.log(`📈 YES Start: ${startDigit}¢ | NO Start: ${100 - startDigit}¢`);

      // Place initial matching orders (100 shares each, not included in budget)
      const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
      const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
      if (!yesOutcome || !noOutcome) continue;

      // Prepare initial orders
      const initialYesOrder = {
        marketId: market.id,
        token: yesOutcome,
        account: yesAccount,
        price: startDigit / 100,
        amount: 100,
        side: 0,
        accessToken: yesAccount.accessToken
      };
      const initialNoOrder = {
        marketId: market.id,
        token: noOutcome,
        account: noAccount,
        price: 1 - (startDigit / 100),
        amount: 100,
        side: 0,
        accessToken: noAccount.accessToken
      };

      // Prepare liquidity orders
      const yesOrders = generateYesOrders(startDigit);
      const noOrders = generateNoOrders(startDigit);

      // Show all orders to be placed
      console.log('\n--- ORDERS TO BE PLACED ---');
      console.log(`Initial YES order: Price $${initialYesOrder.price}, Shares ${initialYesOrder.amount}`);
      console.log(`Initial NO order: Price $${initialNoOrder.price}, Shares ${initialNoOrder.amount}`);

      let yesTotalCost = 0;
      console.log('\nYES Liquidity Orders:');
      for (const order of yesOrders) {
        const cost = order.price * order.amount;
        yesTotalCost += cost;
        console.log(`  Price: $${order.price}, Shares: ${order.amount}, Cost: $${cost.toFixed(2)}`);
      }
      let noTotalCost = 0;
      console.log('\nNO Liquidity Orders:');
      for (const order of noOrders) {
        const cost = order.price * order.amount;
        noTotalCost += cost;
        console.log(`  Price: $${order.price}, Shares: ${order.amount}, Cost: $${cost.toFixed(2)}`);
      }
      console.log(`\nTotal YES Cost: $${yesTotalCost.toFixed(2)}`);
      console.log(`Total NO Cost: $${noTotalCost.toFixed(2)}`);
      console.log('---------------------------');

      // Ask for confirmation before placing orders
      const confirmOrders = await getUserInput('\nProceed with placing these orders for this market? (y/n): ');
      if (confirmOrders.toLowerCase() !== 'y' && confirmOrders.toLowerCase() !== 'yes') {
        console.log('❌ Skipping order placement for this market.');
        continue;
      }

      // Place initial YES order
      try {
        await placeOrder(initialYesOrder);
        console.log(`✅ Initial YES order placed at $${initialYesOrder.price} (100 shares)`);
      } catch (e) {
        console.error(`❌ Failed initial YES order: ${e.message}`);
      }

      // Place initial NO order
      try {
        await placeOrder(initialNoOrder);
        console.log(`✅ Initial NO order placed at $${initialNoOrder.price} (100 shares)`);
      } catch (e) {
        console.error(`❌ Failed initial NO order: ${e.message}`);
      }

      // Wait for initial orders to match before placing liquidity orders
      await new Promise(res => setTimeout(res, 2000));

      // Place YES liquidity orders
      for (const order of yesOrders) {
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
          console.log(`✅ YES $${order.price} (${order.amount} shares)`);
          await new Promise(res => setTimeout(res, 500));
        } catch (e) {
          console.error(`❌ Failed YES $${order.price}: ${e.message}`);
        }
      }

      // Place NO liquidity orders
      for (const order of noOrders) {
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
          console.log(`✅ NO $${order.price} (${order.amount} shares)`);
          await new Promise(res => setTimeout(res, 500));
        } catch (e) {
          console.error(`❌ Failed NO $${order.price}: ${e.message}`);
        }
      }

      console.log(`\n💰 Market ${marketId} Complete:`);
      console.log(`  YES: $${yesTotalCost.toFixed(2)} | NO: $${noTotalCost.toFixed(2)} | Total: $${(yesTotalCost + noTotalCost).toFixed(2)}`);
      console.log(`✅ Finished Market ${marketId}: ${title}`);

    } catch (err) {
      console.error(`❌ Error processing Market ${marketId}: ${err.message}`);
    }
  }

  rl.close();
  console.log('\n🏁 AUTOMATED MULTI-MARKET LIQUIDITY PROVISION COMPLETED');
  console.log(`📈 Processed ${marketOdds.length} markets successfully!`);
}

main();



