  // Helper to reattempt if minimum order value error
  async function tryPlaceOrderWithRetry(orderBody: any, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await placeOrder(orderBody);
      if (
        (res.success && (res.data?.orderId || res.data?.id)) ||
        (res.message && res.message.toLowerCase().includes('insufficient balance'))
      ) {
        return { result: '✔️', res };
      }
      if (
        res.data?.message &&
        res.data.message.toLowerCase().includes('minimum order value should be 0.50')
      ) {
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }
      return { result: '❌', res };
    }
    return { result: '❌', res: null };
  }
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { randomBytes } from 'crypto';
import { parse } from 'csv-parse/sync';
import { ForkastSDK, Network } from '@forkastgg/client';

dotenv.config();

const ACCOUNTS_CSV = 'accounts8.csv';
const EVENT_API_URL = 'https://mgapi.forkast.gg/api/v1/markets';


const sdk = new ForkastSDK(Network.MAINNET, process.env.API_KEY);
const DONE_WALLETS_FILE = 'wallets_done.json';


async function promptMarketId(): Promise<number> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('Enter market ID: ', (answer) => {
      rl.close();
      const marketId = parseInt(answer.trim());
      if (isNaN(marketId) || marketId <= 0) {
        console.log('Invalid input. Exiting.');
        process.exit(1);
      }
      resolve(marketId);
    });
  });
}

async function promptPrice(): Promise<number> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('Enter price to place orders: ', (answer) => {
      rl.close();
      const price = parseFloat(answer.trim());
      if (isNaN(price) || price <= 0 || price > 1) {
        console.log('Invalid price. Exiting.');
        process.exit(1);
      }
      resolve(price);
    });
  });
}

async function fetchMarketById(marketId: number) {
  try {
    const response = await axios.get(`${EVENT_API_URL}/${marketId}`, { timeout: 30000 });
    const event = response.data;
    if (!event || !event.data || !Array.isArray(event.data.markets) || event.data.markets.length === 0) {
      return null;
    }
    const market = event.data.markets.find((m: any) => m.id === marketId) || event.data.markets[0];
    return market;
  } catch (error: any) {
    console.error(`Error fetching market ${marketId}:`, error.message);
    return null;
  }
}

async function loginAndGetAccessToken(privateKey: string): Promise<string> {
  try {
    const loginResponse = await sdk.getAccountService().loginWithPrivateKey(privateKey);
    return loginResponse.accessToken;
  } catch (error: any) {
    console.error('Login failed:', error.message);
    throw error;
  }
}

async function placeOrder(orderBody: any): Promise<any> {
  try {
    // Use salt from orderBody at root, do not generate or assign inside token/account
    const response = await sdk.getOrderService().placeSingleOrder(
      orderBody.marketId,
      orderBody.token,
      orderBody.account,
      orderBody.price,
      orderBody.amount,
      orderBody.side
    );
    return { success: true, data: response };
  } catch (error: any) {
    console.error('Order failed:', error.message);
    return { success: false, message: error.message };
  }
}

async function main() {
  if (!fs.existsSync(ACCOUNTS_CSV)) {
    console.error(`Accounts CSV file not found: ${ACCOUNTS_CSV}`);
    process.exit(1);
  }
  const csvContent = fs.readFileSync(ACCOUNTS_CSV, 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  let wallets = records.map((row: any) => ({
    wallet_address: row.wallet,
    private_key: row.privateKey,
    proxy_wallet: row.proxyWallet
  }));
  if (!Array.isArray(wallets) || wallets.length === 0) {
    console.error('No wallets found in accounts.csv');
    process.exit(1);
  }

  // Ignore doneWallets, always retry all wallets in descending order
  // Prompt for start line (default: middle)
  const readline = require('readline');
  const rlStart = readline.createInterface({ input: process.stdin, output: process.stdout });
  const totalWallets = wallets.length;
  const defaultStart = Math.floor(totalWallets / 2);
  const startIndex: number = await new Promise((resolve) => {
    rlStart.question(`Enter start line (1-${totalWallets}) [default: ${defaultStart + 1}]: `, (answer: string) => {
      rlStart.close();
      let idx = parseInt(answer.trim());
      if (isNaN(idx) || idx < 1 || idx > totalWallets) {
        idx = defaultStart + 1;
      }
      resolve(idx - 1);
    });
  });
  wallets = wallets.reverse().slice(startIndex);
  const marketId = await promptMarketId();
  const price = await promptPrice();
  const market = await fetchMarketById(marketId);
  if (!market) {
    console.error('Market not found or invalid.');
    process.exit(1);
  }
  const yesOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'yes');
  const noOutcome = market.outcomes.find((o: any) => o.title.trim().toLowerCase() === 'no');
  if (!yesOutcome || !noOutcome) {
    console.error('YES or NO outcome not found in this market.');
    process.exit(1);
  }
  // Prompt user for outcome to buy
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const outcomeChoice: string = await new Promise((resolve) => {
    rl.question('Do you want to buy YES or NO? (type yes or no): ', (answer) => {
      rl.close();
      const val = answer.trim().toLowerCase();
      if (val !== 'yes' && val !== 'no') {
        console.log('Invalid outcome choice. Exiting.');
        process.exit(1);
      }
      resolve(val);
    });
  });
  const selectedOutcome = outcomeChoice === 'yes' ? yesOutcome : noOutcome;
  // Process wallets in pairs for fast matched orders
  let i = 0;
  const walletResults: { wallet: string, result: string }[] = [];
  const LOG_FILE = 'multi_wallet_trader_log.txt';
  fs.writeFileSync(LOG_FILE, ''); // Clear log file at start
  while (i < wallets.length - 1) {
    const w1 = wallets[i];
    const w2 = wallets[i + 1];
    let result1 = '❌';
    let result2 = '❌';
    try {
      // First wallet places the selected outcome at the chosen price
      const accessToken1 = await loginAndGetAccessToken(w1.private_key);
      const salt1 = BigInt('0x' + randomBytes(16).toString('hex'));
      const orderBody1 = {
        marketId: market.id,
        token: selectedOutcome,
        account: {
          wallet: w1.wallet_address,
          private_key: w1.private_key,
          proxy_wallet: w1.proxy_wallet,
          accessToken: accessToken1
        },
        price: price,
        amount: 2,
        side: 0, // BUY
        accessToken: accessToken1,
        salt: salt1.toString()
      };
      // Second wallet places the opposite outcome at (1 - price)
      const accessToken2 = await loginAndGetAccessToken(w2.private_key);
      const salt2 = BigInt('0x' + randomBytes(16).toString('hex'));
      const oppositeOutcome = (selectedOutcome.id === yesOutcome.id) ? noOutcome : yesOutcome;
      const orderBody2 = {
        marketId: market.id,
        token: oppositeOutcome,
        account: {
          wallet: w2.wallet_address,
          private_key: w2.private_key,
          proxy_wallet: w2.proxy_wallet,
          accessToken: accessToken2
        },
        price: (1 - price),
        amount: 2,
        side: 0, // BUY
        accessToken: accessToken2,
        salt: salt2.toString()
      };
      // Place both orders as close together as possible, with retry on min order value error
      const [order1, order2] = await Promise.all([
        tryPlaceOrderWithRetry(orderBody1),
        tryPlaceOrderWithRetry(orderBody2)
      ]);
      result1 = order1.result;
      result2 = order2.result;
    } catch (e: any) {
      if (e.message && e.message.toLowerCase().includes('insufficient balance')) {
        result1 = '✔️';
        result2 = '✔️';
      }
    }
    walletResults.push({ wallet: w1.wallet_address, result: result1 });
    walletResults.push({ wallet: w2.wallet_address, result: result2 });
    const logLine1 = `${w1.wallet_address}: ${result1}\n`;
    const logLine2 = `${w2.wallet_address}: ${result2}\n`;
    process.stdout.write(logLine1);
    process.stdout.write(logLine2);
    fs.appendFileSync(LOG_FILE, logLine1);
    fs.appendFileSync(LOG_FILE, logLine2);
    i += 2;
    // Wait 3-4 seconds before placing the next two orders
    await new Promise(resolve => setTimeout(resolve, 3500));
  }
  // If odd number of wallets, process last one
  if (i < wallets.length) {
    const w = wallets[i];
    let result = '❌';
    try {
      const accessToken = await loginAndGetAccessToken(w.private_key);
      const salt = BigInt('0x' + randomBytes(16).toString('hex'));
      const orderBody = {
        marketId: market.id,
        token: selectedOutcome,
        account: {
          wallet: w.wallet_address,
          private_key: w.private_key,
          proxy_wallet: w.proxy_wallet,
          accessToken
        },
        price: price,
        amount: 2,
        side: 0, // BUY
        accessToken,
        salt: salt.toString()
      };
      const orderResult = await tryPlaceOrderWithRetry(orderBody);
      result = orderResult.result;
    } catch (e: any) {
      if (e.message && e.message.toLowerCase().includes('insufficient balance')) {
        result = '✔️';
      }
    }
    walletResults.push({ wallet: w.wallet_address, result });
    const logLine = `${w.wallet_address}: ${result}\n`;
    process.stdout.write(logLine);
    fs.appendFileSync(LOG_FILE, logLine);
  }
}


if (require.main === module) {
  main();
}
