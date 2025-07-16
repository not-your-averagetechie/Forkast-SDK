import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { OrderService } from './orders.service';
import { OrderResponse } from '@forkastgg/client/dist/src/types/orders';
import { CancelOrderDto, PlaceOrderDto } from './order.types';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('all')
  async getAllOrders(
    @Query('address') address: string,
    @Query('outcomeId') outcomeId: number,
    @Query('accessToken') accessToken: string,
    @Query('status') status?: number,
    @Query('limit') limit?: number,
    @Query('page') page?: number
  ): Promise<OrderResponse> {

    return this.orderService.getAllOrders(address, Number(outcomeId), accessToken, status, limit, page);
  }

  @Post('')
  async placeOrder(@Body() body: PlaceOrderDto): Promise<OrderResponse> {
    return this.orderService.placeOrder(body);
  }

  @Post('cancel')
  async cancelOrder(@Body() body: CancelOrderDto): Promise<any> {
    return this.orderService.cancelOrder(body);
  }
}