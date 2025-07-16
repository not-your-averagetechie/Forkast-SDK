import { ForkastSDK, Network } from '@forkastgg/client';
import { OrderResponse } from '@forkastgg/client/dist/src/types/orders';
import { Injectable } from '@nestjs/common';
import { CancelOrderDto, PlaceOrderDto } from './order.types';

@Injectable()
export class OrderService {

  private readonly sdk = new ForkastSDK(Network.TESTNET, process.env.API_KEY);
  private readonly orderService = this.sdk.getOrderService();  

  async getAllOrders(address: string, outcomeId: number, accessToken: string, status?: number, limit?: number, page?: number): Promise<OrderResponse> {
    const allOrders =  await this.orderService.getAllOrders(address, outcomeId, accessToken, status, limit, page);
    return allOrders;
  }

  async placeOrder(request: PlaceOrderDto): Promise<OrderResponse> {
    const { marketId, token, account, price, amount, side, accessToken } = request;
    const response = await this.orderService.placeSingleOrder(marketId, token, account, price, amount, side, accessToken);
    return response;
  }

  async cancelOrder(request: CancelOrderDto): Promise<any> {
    const response = await this.orderService.cancelOrder(request.orderId, request.accessToken);
    return response;
  }
}