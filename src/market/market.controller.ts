import { Controller, Get, Query } from '@nestjs/common';
import { MarketService } from './market.service';
import { Event, OrderBook, TokenPrices } from '@forkastgg/client';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}
@Get('event')
async getEvent(@Query('id') id: string, @Query('accessToken') accessToken?: string): Promise<Event> {
  if (!id) {
    throw new Error('Event ID is required');
  }
  const eventId = id;
  //if (isNaN(eventId)) {
  //  throw new Error('Event ID must be a number');
 // }
  return this.marketService.getEventDetails(eventId, accessToken);
}


  @Get('orderbook')
  async getOrderBook(
    @Query('marketId') mid: number, 
    @Query('outcomeId') oid: number, 
    @Query('outcomeType') otype: number,
    @Query('accessToken') accessToken?: string ): Promise<OrderBook> {
    if (!mid || !oid || !otype) {
      throw new Error('Market ID, Outcome ID, and Outcome Type are required');
    }
    return this.marketService.getOrderBook(Number(mid), Number(oid), otype, accessToken);
  }

  @Get('token-prices')
  async getTokenPrices(
    @Query('marketId') mid: number, 
    @Query('side') side: number,
    @Query('accessToken') accessToken?: string): Promise<TokenPrices> {
    if (!mid || !side) {
      throw new Error('Market ID and Side are required');
    }
    return this.marketService.getTokenPrices(Number(mid), side, accessToken);
  }
}