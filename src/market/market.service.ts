import { ForkastSDK, Network, Event, OrderBook, TokenPrices } from '@forkastgg/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MarketService {

  private readonly sdk: ForkastSDK;
  private readonly marketService: ReturnType<ForkastSDK['getMarketService']>;

  constructor() {
    const network = (process.env.NETWORK === 'mainnet' ? Network.MAINNET : Network.TESTNET);
    const apiKey = process.env.API_KEY;
    this.sdk = new ForkastSDK(network, apiKey);
    this.marketService = this.sdk.getMarketService();
  }

  async getEventDetails(id: number): Promise<Event> {
    let retries = 0;
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second
    while (retries < maxRetries) {
      try {
        const eventDetails = await this.marketService.getEventData(String(id));
        return eventDetails;
      } catch (err: any) {
        if (err?.message?.includes('429') || err?.response?.status === 429) {
          // Exponential backoff
          const delay = baseDelay * Math.pow(2, retries);
          await new Promise(res => setTimeout(res, delay));
          retries++;
        } else {
          throw err;
        }
      }
    }
    throw new Error('Failed to fetch event data after multiple retries due to rate limiting.');
  }

  async getOrderBook(mid: number, oid: number, otype: number): Promise<OrderBook> {
    const orderBook = await this.marketService.getOrderBook(mid, oid, otype);
    return orderBook;
  }

  async getTokenPrices(mid: number, side: number): Promise<TokenPrices> {
    const tokenPrices = await this.marketService.getTokenPrices(mid, side);
    return tokenPrices;
  }
}