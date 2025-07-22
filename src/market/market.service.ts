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

<<<<<<< HEAD
  async getEventDetails(id: number): Promise<Event> {
    const eventDetails =  await this.marketService.getEventData(String(id));
=======
  async getEventDetails(id: string): Promise<Event> {
    const eventDetails =  await this.marketService.getEventData(id);
>>>>>>> ab93898865dea7a8a039c3b941640ce24ef27345
    return eventDetails;
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