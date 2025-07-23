import axios from 'axios';
import * as readline from 'readline';
const dotenv = require('dotenv');
dotenv.config();

const NETWORK = process.env.NETWORK || 'mainnet';

const CONFIG = {
  testnet: {
    API_URL: process.env.TESTNET_ORDER_API_URL || 'http://localhost:3000/orders',
    EVENT_API_URL: process.env.TESTNET_MARKET_API_URL || 'http://localhost:3000/market/event',
    LOGIN_API_URL: process.env.TESTNET_ACCOUNT_API_URL || 'http://localhost:3000/account/login',
    API_KEY: process.env.TESTNET_API_KEY,
    WALLET_ADDRESS: process.env.TESTNET_WALLET_ADDRESS,
    PRIVATE_KEY: process.env.TESTNET_PRIVATE_KEY,
    PROXY_WALLET: process.env.TESTNET_PROXY_WALLET,
    WALLET_ADDRESS_2: process.env.TESTNET_WALLET_ADDRESS_2,
    PRIVATE_KEY_2: process.env.TESTNET_PRIVATE_KEY_2,
    PROXY_WALLET_2: process.env.TESTNET_PROXY_WALLET_2
  },
  mainnet: {
    API_URL: process.env.MAINNET_ORDER_API_URL,
    EVENT_API_URL: process.env.MAINNET_MARKET_API_URL,
    LOGIN_API_URL: process.env.MAINNET_ACCOUNT_API_URL,
    API_KEY: process.env.MAINNET_API_KEY,
    WALLET_ADDRESS: process.env.MAINNET_WALLET_ADDRESS,
    PRIVATE_KEY: process.env.MAINNET_PRIVATE_KEY,
    PROXY_WALLET: process.env.MAINNET_PROXY_WALLET,
    WALLET_ADDRESS_2: process.env.MAINNET_WALLET_ADDRESS_2,
    PRIVATE_KEY_2: process.env.MAINNET_PRIVATE_KEY_2,
    PROXY_WALLET_2: process.env.MAINNET_PROXY_WALLET_2
  }
};

const API_URL = CONFIG[NETWORK].API_URL;
const EVENT_API_URL = CONFIG[NETWORK].EVENT_API_URL;
const LOGIN_API_URL = CONFIG[NETWORK].LOGIN_API_URL;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export async function placeOrder(orderBody: any) {
  try {
    const response = await axios.post(API_URL, orderBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${orderBody.accessToken}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Order placement failed:', error);
    throw error;
  }
}

async function getMarketAndOutcomeFromEvent(eventId: number, outcomeTitle: string) {
  try {
    const response = await axios.get(EVENT_API_URL, { params: { id: eventId } });
    const event = response.data;

    const market = event.markets[0];
    if (!market) throw new Error('No markets found in event');

    // Print available outcome titles for debugging
    console.log('Available outcomes:', market.outcomes.map((o: any) => o.title));

    // Map "yes"/"no" to "Yes"/"No" for matching
    let normalizedTitle = outcomeTitle.trim().toLowerCase();
    if (normalizedTitle === 'yes') normalizedTitle = 'yes';
    if (normalizedTitle === 'no') normalizedTitle = 'no';

    const outcome = market.outcomes.find((o: any) =>
      o.title.trim().toLowerCase() === normalizedTitle
    );
    if (!outcome) throw new Error(`Outcome "${outcomeTitle}" not found. Available: ${market.outcomes.map((o: any) => o.title).join(', ')}`);

    return {
      eventId: eventId,
      marketId: market.id,
      outcome: {
        id: outcome.id,
        price: outcome.price,
        tokenId: outcome.tokenId,
        outcomeType: outcome.outcomeType,
        title: outcome.title
      }
    };
  } catch (error) {
    console.error('Error fetching event details:', error);
    throw error;
  }
}

// Function to fetch and display market info
async function fetchMarketInfo(eventId: number) {
  try {
    console.log(`\n🔍 Fetching market info for Event ID: ${eventId}`);
    const response = await axios.get(EVENT_API_URL, { params: { id: eventId } });
    const event = response.data;
    
    if (!event.markets || event.markets.length === 0) {
      throw new Error(`No markets found for event ${eventId}`);
    }
    
    const market = event.markets[0];
    console.log(`📊 Market ID: ${market.id}`);
    console.log(`📋 Market Title: ${market.title}`);
    console.log(`❓ Question: ${market.question}`);
    console.log(`📈 Volume: ${market.volume}`);
    console.log(`🎯 Status: ${market.status}`);
    
    console.log('\n📈 Outcomes:');
    market.outcomes.forEach((outcome: any, index: number) => {
      console.log(`  ${index + 1}. ${outcome.title} (ID: ${outcome.id})`);
      console.log(`     Price: $${outcome.price}`);
      console.log(`     Token ID: ${outcome.tokenId}`);
      console.log(`     Outcome Type: ${outcome.outcomeType}`);
      console.log('');
    });
    
    return {
      eventId: eventId,
      marketId: market.id,
      marketTitle: market.title,
      question: market.question,
      volume: market.volume,
      status: market.status,
      outcomes: market.outcomes
    };
    
  } catch (error) {
    console.error(`❌ Error fetching market info for event ${eventId}:`, error);
    throw error;
  }
}

// Function to place a single order with specific price and amount
async function placeOrderAtPrice(eventId: number, outcomeTitle: string, price: number, amount: number, account: any) {
  try {
    const { marketId, outcome } = await getMarketAndOutcomeFromEvent(eventId, outcomeTitle);

    const orderBody = {
      marketId: marketId,
      token: outcome,
      account,
      price: price,
      amount: amount,
      side: 0, // 0 for buy, 1 for sell
      accessToken: account.accessToken
    };

    const result = await placeOrder(orderBody);
    console.log(`✅ Order placed: ${amount} shares of "${outcomeTitle}" at $${price.toFixed(2)} (Market: ${marketId})`);
    return result;

  } catch (error) {
    console.error(`❌ Failed to place order: ${amount} shares of "${outcomeTitle}" at $${price.toFixed(2)}:`, error);
    throw error;
  }
}

// Function to get random amount from array of options
function getRandomAmount(...amounts: number[]): number {
  return amounts[Math.floor(Math.random() * amounts.length)];
}

// Function to generate YES side orders based on starting digit
function generateYesOrders(startDigit: number) {
  const startPrice = startDigit / 100; // Convert to decimal (e.g., 58 -> 0.58)
  const orders = [];
  
  // First order (starting price, highest quantity)
  orders.push({
    price: startPrice,
    amount: getRandomAmount(80, 60, 50, 65)
  });
  
  // Generate orders at exact 0.05 intervals starting from the nearest 0.05 below start price
  let currentPrice = Math.floor(startPrice * 20) * 0.05; // Round down to nearest 0.05
  if (currentPrice >= startPrice) {
    currentPrice -= 0.05; // Ensure it's below start price
  }
  
  while (currentPrice >= 0.10) {
    if (currentPrice >= 0.50) {
      orders.push({
        price: currentPrice,
        amount: getRandomAmount(35, 45, 30, 20, 25, 22, 24)
      });
    } else if (currentPrice >= 0.30) {
      orders.push({
        price: currentPrice,
        amount: getRandomAmount(20, 24, 26, 28, 30, 25)
      });
    } else if (currentPrice >= 0.20) {
      orders.push({
        price: currentPrice,
        amount: getRandomAmount(26, 28, 25, 30, 35, 40)
      });
    } else if (currentPrice >= 0.10) {
      orders.push({
        price: currentPrice,
        amount: getRandomAmount(30, 35, 40, 45, 50, 55, 65, 70, 45)
      });
    }
    currentPrice -= 0.05;
  }
  
  // Add fixed low-price orders
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

// Function to generate NO side orders that sum to 0.99 with YES prices
function generateNoOrders(startDigit: number) {
  const startPrice = startDigit / 100; // Convert to decimal
  const orders = [];
  
  // Calculate NO starting price so YES + NO = 0.99
  const noStartPrice = 0.99 - startPrice;
  
  // Add starting NO price
  if (noStartPrice >= 0.10 && noStartPrice <= 0.90) {
    orders.push({
      price: noStartPrice,
      amount: getRandomAmount(80, 60, 50, 65)
    });
  }
  
  // Generate NO orders in 0.05 intervals starting from nearest 0.05 below NO start price
  let currentNoPrice = Math.floor(noStartPrice * 20) * 0.05; // Round down to nearest 0.05
  if (currentNoPrice >= noStartPrice) {
    currentNoPrice -= 0.05; // Ensure it's below NO start price
  }
  
  // Continue with 0.05 intervals down to 0.10
  while (currentNoPrice >= 0.10) {
    if (currentNoPrice >= 0.50) {
      orders.push({
        price: currentNoPrice,
        amount: getRandomAmount(35, 45, 30, 20, 25, 22, 24)
      });
    } else if (currentNoPrice >= 0.30) {
      orders.push({
        price: currentNoPrice,
        amount: getRandomAmount(20, 24, 26, 28, 30, 25)
      });
    } else if (currentNoPrice >= 0.20) {
      orders.push({
        price: currentNoPrice,
        amount: getRandomAmount(26, 28, 25, 30, 35, 40)
      });
    } else if (currentNoPrice >= 0.10) {
      orders.push({
        price: currentNoPrice,
        amount: getRandomAmount(30, 35, 40, 45, 50, 55, 65, 70, 45)
      });
    }
    currentNoPrice -= 0.05;
  }
  
  // Add fixed low-price orders
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
  
  return orders.sort((a, b) => b.price - a.price); // Sort by price descending
}

// Function to login and fetch access tokens for both accounts using their private keys
async function loginAndGetAccessToken(privateKey: string): Promise<string> {
  try {
    const response = await axios.get(LOGIN_API_URL, { params: { privateKey } });
    // Assuming response.data.accessToken is the token
    return response.data.accessToken;
  } catch (error) {
    console.error('Failed to login and get access token:', error);
    throw error;
  }
}

// Function to place YES side liquidity orders for a specific market
async function placeYesLiquidityOrders(eventId: number, startDigit: number, yesAccount: any) {
  const yesOrders = generateYesOrders(startDigit);
  
  console.log(`Generated ${yesOrders.length} YES orders for Event ${eventId}:`);
  yesOrders.forEach((order, index) => {
    console.log(`${index + 1}. Price: $${order.price.toFixed(2)}, Amount: ${order.amount} shares`);
  });
  
  const results = [];
  
  for (const order of yesOrders) {
    try {
      const result = await placeOrderAtPrice(eventId, 'yes', order.price, order.amount, yesAccount);
      results.push({ success: true, order, result });
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      results.push({ success: false, order, error: error.message });
      console.error(`Failed YES order at $${order.price.toFixed(2)} for Event ${eventId}:`, error.message);
    }
  }
  
  return results;
}

// Function to place NO side liquidity orders for a specific market
async function placeNoLiquidityOrders(eventId: number, startDigit: number, noAccount: any) {
  const noOrders = generateNoOrders(startDigit);
  
  console.log(`Generated ${noOrders.length} NO orders for Event ${eventId}:`);
  noOrders.forEach((order, index) => {
    console.log(`${index + 1}. Price: $${order.price.toFixed(2)}, Amount: ${order.amount} shares`);
  });
  
  const results = [];
  
  for (const order of noOrders) {
    try {
      const result = await placeOrderAtPrice(eventId, 'No', order.price, order.amount, noAccount);
      results.push({ success: true, order, result });
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      results.push({ success: false, order, error: error.message });
      console.error(`Failed NO order at $${order.price.toFixed(2)} for Event ${eventId}:`, error.message);
    }
  }
  
  return results;
}

// Function to get market IDs from user
function getMarketIds(): Promise<number[]> {
  return new Promise((resolve) => {
    rl.question('Enter market ID(s) separated by commas (e.g., 389,456,789): ', (answer) => {
      const marketIds = answer.split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0);
      
      if (marketIds.length === 0) {
        console.log('Please enter valid market IDs');
        resolve(getMarketIds());
      } else {
        resolve(marketIds);
      }
    });
  });
}

// Function to get user input for starting digit
function getUserInput(): Promise<number> {
  return new Promise((resolve) => {
    rl.question('Enter the starting digit for YES outcome (e.g., 58 for 58%): ', (answer) => {
      const startDigit = parseInt(answer);
      if (isNaN(startDigit) || startDigit < 10 || startDigit > 90) {
        console.log('Please enter a valid number between 10 and 90');
        resolve(getUserInput());
      } else {
        resolve(startDigit);
      }
    });
  });
}

// Use default account for YES, account 2 for NO
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

// Function to place liquidity orders for a single market
async function provideLiquidityForMarket(eventId: number, startDigit: number, yesAccount: any, noAccount: any) {
  console.log(`\n💰 STARTING LIQUIDITY PROVISION FOR EVENT ${eventId}`);
  
  try {
    // Fetch and display market info
    const marketInfo = await fetchMarketInfo(eventId);
    
    const yesStartPrice = startDigit / 100;
    const noStartPrice = 0.99 - yesStartPrice;
    
    console.log(`\n🎯 Starting liquidity provision for Market ${marketInfo.marketId}...`);
    console.log(`YES starting price: $${yesStartPrice.toFixed(2)} (${startDigit}%)`);
    console.log(`NO starting price: $${noStartPrice.toFixed(2)} (${(noStartPrice * 100).toFixed(0)}%)`);
    console.log(`Sum: $${(yesStartPrice + noStartPrice).toFixed(2)} (should be $0.99)`);
    
    // Place YES side orders
    const yesResults = await placeYesLiquidityOrders(eventId, startDigit, yesAccount);
    
    // Additional delay between YES and NO orders
    console.log('\n⏳ Waiting 3 seconds before placing NO orders...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Place NO side orders  
    const noResults = await placeNoLiquidityOrders(eventId, startDigit, noAccount);
    
    // Summary for this market
    const successfulYesOrders = yesResults.filter(r => r.success).length;
    const successfulNoOrders = noResults.filter(r => r.success).length;
    const totalYesShares = yesResults.filter(r => r.success).reduce((sum, r) => sum + r.order.amount, 0);
    const totalNoShares = noResults.filter(r => r.success).reduce((sum, r) => sum + r.order.amount, 0);
    
    console.log(`\n📊 LIQUIDITY PROVISION SUMMARY FOR EVENT ${eventId}:`);
    console.log(`Market ID: ${marketInfo.marketId}`);
    console.log(`YES Orders: ${successfulYesOrders}/${yesResults.length} successful`);
    console.log(`NO Orders: ${successfulNoOrders}/${noResults.length} successful`);
    console.log(`Total YES shares: ${totalYesShares}`);
    console.log(`Total NO shares: ${totalNoShares}`);
    
    return {
      eventId,
      marketId: marketInfo.marketId,
      success: true,
      yesResults,
      noResults,
      summary: {
        successfulYesOrders,
        successfulNoOrders,
        totalYesShares,
        totalNoShares
      }
    };
    
  } catch (error) {
    console.error(`❌ Error in liquidity provision for Event ${eventId}:`, error);
    return { 
      eventId,
      success: false, 
      error: error.message 
    };
  }
}

// Function to place liquidity orders for multiple markets
async function provideLiquidityForAllMarkets(eventIds: number[], startDigit: number, yesAccount: any, noAccount: any) {
  const yesStartPrice = startDigit / 100;
  const noStartPrice = 0.99 - yesStartPrice;
  
  console.log('\n💰 STARTING MULTI-MARKET LIQUIDITY PROVISION');
  console.log(`Markets: ${eventIds.join(', ')}`);
  console.log(`YES starting price: ${startDigit}% ($${yesStartPrice.toFixed(2)})`);
  console.log(`NO starting price: ${(noStartPrice * 100).toFixed(0)}% ($${noStartPrice.toFixed(2)})`);
  console.log(`Sum: $${(yesStartPrice + noStartPrice).toFixed(2)} (0.99 target)`);
  
  // Debug: log private key
  console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY ? 'Set' : 'Not set');
  
  const allResults = [];
  
  for (const eventId of eventIds) {
    const result = await provideLiquidityForMarket(eventId, startDigit, yesAccount, noAccount);
    allResults.push(result);
    
    // Delay between markets
    if (eventIds.length > 1) {
      console.log('\n⏳ Waiting 5 seconds before next market...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Overall summary
  const successfulMarkets = allResults.filter(r => r.success).length;
  const totalYesShares = allResults
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.summary.totalYesShares, 0);
  const totalNoShares = allResults
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.summary.totalNoShares, 0);
  
  console.log('\n🎯 OVERALL LIQUIDITY PROVISION SUMMARY:');
  console.log(`Successful Markets: ${successfulMarkets}/${eventIds.length}`);
  console.log(`Total YES shares across all markets: ${totalYesShares}`);
  console.log(`Total NO shares across all markets: ${totalNoShares}`);
  
  return {
    success: successfulMarkets > 0,
    processedMarkets: allResults.length,
    successfulMarkets,
    totalYesShares,
    totalNoShares,
    results: allResults
  };
}

// Main function - provides liquidity to multiple markets
async function main() {
  console.log('='.repeat(60));
  console.log('💰 MULTI-MARKET LIQUIDITY PROVISION SYSTEM');
  console.log('📈 Strategy: 0.05 intervals with YES + NO = 0.99');
  console.log('='.repeat(60));

  try {
    // Login both accounts and get access tokens
    console.log('🔑 Logging in YES account...');
    const yesAccessToken = await loginAndGetAccessToken(process.env.PRIVATE_KEY);
    console.log('✅ YES account logged in.');

    console.log('🔑 Logging in NO account...');
    const noAccessToken = await loginAndGetAccessToken(process.env.PRIVATE_KEY_2);
    console.log('✅ NO account logged in.');

    // Get market IDs from user
    const eventIds = await getMarketIds();
    console.log(`\n📋 Selected markets: ${eventIds.join(', ')}`);

    // Get starting digit from user
    const startDigit = await getUserInput();
    rl.close();

    // Prepare account objects with fresh tokens
    const yesAccount = getYesAccount(yesAccessToken);
    const noAccount = getNoAccount(noAccessToken);

    const result = await provideLiquidityForAllMarkets(eventIds, startDigit, yesAccount, noAccount);

    if (result.success) {
      console.log('\n🎉 SUCCESS: Multi-market liquidity provision completed!');
      console.log(`Processed ${result.processedMarkets} markets`);
      console.log(`Successfully provided liquidity to ${result.successfulMarkets} markets`);
    } else {
      console.log('\n💥 FAILURE: All markets failed');
    }

  } catch (error) {
    console.error('💥 Main function error:', error);
    rl.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 MULTI-MARKET LIQUIDITY PROVISION COMPLETED');
  console.log('='.repeat(60));
}

main();
