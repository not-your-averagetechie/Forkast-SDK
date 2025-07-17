import { ForkastSDK, Network, Event, OrderBook, TokenPrices } from '@forkastgg/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MarketService {

  private readonly sdk = new ForkastSDK(Network.TESTNET, process.env.API_KEY);
  private readonly marketService = this.sdk.getMarketService();  

  async getEventDetails(id: string): Promise<Event> {
    const eventDetails =  await this.marketService.getEventData(id);
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