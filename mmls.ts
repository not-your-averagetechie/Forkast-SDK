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

function getUserInput(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function fetchEvent(eventId: number) {
  const response = await axios.get(EVENT_API_URL, { params: { eventId } });
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
    
    // REDUCTION STRATEGY:
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

function generateLiquidityOrders(startDigit: number) {
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
    { price: 0.06, amount: getRandomAmount(80, 85, 95, 70, 65, 60) },
    { price: 0.05, amount: getRandomAmount(80, 85, 95, 105, 90, 100, 110) },
    { price: 0.04, amount: getRandomAmount(105, 100, 90, 85, 102, 110) },
    { price: 0.03, amount: getRandomAmount(150, 140, 120, 125, 130, 110, 105, 100) },
    { price: 0.02, amount: getRandomAmount(150, 160, 175, 165, 155, 170, 185, 145, 140) },
    { price: 0.01, amount: getRandomAmount(250, 280, 300, 350, 380, 350, 320, 310, 345, 340) }
  );
  
  return adjustOrdersToMaxBudget(orders, 80);
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
  console.log('💰 MULTI-OUTCOME MARKET YES-SIDE LIQUIDITY PROVISION (3 OUTCOMES)');
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

  // Find multi-outcome markets and display them
  const multiOutcomeMarkets = event.markets.filter(market => market.outcomes && market.outcomes.length > 2);
  
  if (multiOutcomeMarkets.length === 0) {
    console.error('No multi-outcome markets found in this event.');
    process.exit(1);
  }

  console.log('🎯 MULTI-OUTCOME MARKETS FOUND:');
  console.log('='.repeat(40));
  
  for (const market of multiOutcomeMarkets) {
    console.log(`Market ID: ${market.id}`);
    console.log(`Title: ${market.title}`);
    console.log(`Question: ${market.question}`);
    console.log(`Status: ${market.status}`);
    console.log(`Volume: ${market.volume}`);
    console.log('Outcomes:');
    for (const outcome of market.outcomes) {
      console.log(`  - ${outcome.title} (ID: ${outcome.id}) | Token ID: ${outcome.tokenId} | Price: ${outcome.price}`);
    }
    console.log('-'.repeat(40));
  }

  // **SELECT TARGET MARKET AND OUTCOMES**
  const marketIdStr = await getUserInput('\nEnter the Market ID you want to add liquidity to: ');
  const targetMarketId = parseInt(marketIdStr.trim());
  const targetMarket = multiOutcomeMarkets.find(m => m.id === targetMarketId);
  
  if (!targetMarket) {
    console.error('Invalid market ID or market not found.');
    process.exit(1);
  }

  console.log(`\n📋 Selected Market: ${targetMarket.title}`);
  console.log('Available outcomes:');
  targetMarket.outcomes.forEach((outcome, index) => {
    console.log(`  ${index + 1}. ${outcome.title} (ID: ${outcome.id})`);
  });

  // **SELECT 3 OUTCOMES**
  console.log('\n🎯 SELECT 3 OUTCOMES TO ADD LIQUIDITY FOR:');
  const selectedOutcomes = [];
  
  for (let i = 1; i <= 3; i++) {
    const outcomeIdxStr = await getUserInput(`Select outcome ${i} (enter number 1-${targetMarket.outcomes.length}): `);
    const outcomeIdx = parseInt(outcomeIdxStr.trim()) - 1;
    
    if (outcomeIdx < 0 || outcomeIdx >= targetMarket.outcomes.length) {
      console.log('❌ Invalid outcome number, skipping.');
      continue;
    }
    
    const outcome = targetMarket.outcomes[outcomeIdx];
    if (selectedOutcomes.find(o => o.id === outcome.id)) {
      console.log('❌ Outcome already selected, skipping.');
      continue;
    }
    
    selectedOutcomes.push(outcome);
    console.log(`✅ Selected: ${outcome.title}`);
  }

  if (selectedOutcomes.length === 0) {
    console.error('No valid outcomes selected.');
    process.exit(1);
  }

  // **COLLECT STARTING ODDS FOR SELECTED OUTCOMES**
  console.log('\n📊 COLLECTING STARTING ODDS FOR SELECTED OUTCOMES');
  console.log('='.repeat(50));
  
  const outcomeOdds = [];
  
  for (const outcome of selectedOutcomes) {
    const startDigitStr = await getUserInput(`Enter starting digit (10-90) for "${outcome.title}": `);
    const startDigit = parseInt(startDigitStr.trim());
    if (isNaN(startDigit) || startDigit < 10 || startDigit > 90) {
      console.log('❌ Invalid start digit, skipping this outcome.');
      continue;
    }
    outcomeOdds.push({
      outcome: outcome,
      startDigit: startDigit
    });
  }

  if (outcomeOdds.length === 0) {
    console.error('No valid outcomes with odds configured.');
    process.exit(1);
  }

  // Display summary
  console.log('\n📈 LIQUIDITY SUMMARY:');
  console.log('='.repeat(40));
  console.log(`Market: ${targetMarket.title}`);
  for (const { outcome, startDigit } of outcomeOdds) {
    console.log(`  ${outcome.title}: ${startDigit}¢`);
  }

  // Confirm before proceeding
  const confirmStr = await getUserInput('\n✅ Proceed with YES-side liquidity provision? (y/n): ');
  if (confirmStr.toLowerCase() !== 'y' && confirmStr.toLowerCase() !== 'yes') {
    console.log('❌ Operation cancelled.');
    rl.close();
    return;
  }

  // Login account (only need one account for YES-side only)
  console.log('\n🔐 Logging in account...');
  const yesAccessToken = await loginAndGetAccessToken(CONFIG[NETWORK].PRIVATE_KEY);
  const yesAccount = getYesAccount(yesAccessToken);
  console.log('✅ Account logged in successfully.');

  // **AUTOMATED PROCESSING OF SELECTED OUTCOMES**
  console.log('\n🚀 STARTING YES-SIDE LIQUIDITY PROVISION');
  console.log('='.repeat(60));

  let totalSpent = 0;

  for (const { outcome, startDigit } of outcomeOdds) {
    try {
      console.log(`\n🎯 Processing Outcome: ${outcome.title}`);
      console.log(`📈 Starting Price: ${startDigit}¢`);

      // Generate orders for this outcome
      const orders = generateLiquidityOrders(startDigit);
      let outcomeTotalCost = 0;
      
      console.log(`\n📊 Orders for ${outcome.title} (Budget: $80):`);
      for (const order of orders) {
        const cost = order.price * order.amount;
        outcomeTotalCost += cost;
      }
      console.log(`  Total Cost: $${outcomeTotalCost.toFixed(2)} | Orders: ${orders.length}`);
      
      // Place orders for this outcome
      for (const order of orders) {
        const orderBody = {
          marketId: targetMarket.id,
          token: outcome,
          account: yesAccount,
          price: order.price,
          amount: order.amount,
          side: 0, // 0 for buy orders
          accessToken: yesAccount.accessToken
        };
        
        try {
          await placeOrder(orderBody);
          console.log(`✅ ${outcome.title} $${order.price.toFixed(2)} (${order.amount} shares)`);
          await new Promise(res => setTimeout(res, 500)); // Small delay between orders
        } catch (e) {
          console.error(`❌ Failed ${outcome.title} $${order.price.toFixed(2)}: ${e.message}`);
        }
      }
      
      totalSpent += outcomeTotalCost;
      console.log(`\n💰 ${outcome.title} Complete: $${outcomeTotalCost.toFixed(2)}`);
      
    } catch (err) {
      console.error(`❌ Error processing ${outcome.title}: ${err.message}`);
    }
  }

  rl.close();
  console.log('\n🏁 YES-SIDE LIQUIDITY PROVISION COMPLETED');
  console.log(`📈 Processed ${outcomeOdds.length} outcomes successfully!`);
  console.log(`💰 Total Spent: $${totalSpent.toFixed(2)}`);
  console.log(`🎯 Market: ${targetMarket.title}`);
}

main();
