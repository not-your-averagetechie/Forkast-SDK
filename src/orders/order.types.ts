import { MarketOutcome } from "@forkastgg/client";

interface Account {
  wallet: string;
  private_key: string;
  proxy_wallet:string;
}

export interface PlaceOrderDto {
  marketId: number,
  token: MarketOutcome,
  account: Account,
  price: number,
  amount: number,
  side: number,
  accessToken: string
}

export interface CancelOrderDto {
  orderId: string;
  accessToken: string;
}
