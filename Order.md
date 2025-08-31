---
title: Order
slug: -tYNipvtjtqJ6QuWi6BwJ
createdAt: 2025-07-01T08:18:25.656Z
updatedAt: 2025-07-24T05:34:21.231Z
---

This section documents the core interfaces used when working with placing, querying, or processing orders in ForkastSDK.

## Functions

### Get All Orders

```typescript
import { OrderResponse } from '@forkastgg/client/dist/src/types/orders';

async getAllOrders(
  address: string,
  outcomeId: number,
  accessToken: string,
  status?: number,
  limit?: number,
  page?: number
): Promise<OrderResponse[]>
```

**Parameters**

| **Field**     | **Type** | **Required** | **Description**                           |
| ------------- | -------- | ------------ | ----------------------------------------- |
| `address`     | string   | Yes          | Wallet address                            |
| `outcomeId`   | number   | Yes          | Outcome ID                                |
| `accessToken` | string   | Yes          | Access Token received from login response |
| `status`      | number   | No           | Filter orders by status (optional)        |
| `limit`       | number   | No           | Number of results per page (optional)     |
| `page`        | number   | No           | Page number for pagination (optional)     |

### Place an Order

```typescript
import { OrderResponse } from '@forkastgg/client/dist/src/types/orders';

async placeSingleOrder(
  marketId,
  token,
  account,
  price,
  amount,
  side,
  accessToken
);: Promise<OrderResponse>
```

**Parameters**

| **Field**     | **Type** | **Required** | **Description**                                       |
| ------------- | -------- | ------------ | ----------------------------------------------------- |
| `marketId`    | number   | Yes          | Market ID                                             |
| `token`       | string   | Yes          | Address of the token                                  |
| `account`     | string   | Yes          | Wallet Address                                        |
| `price`       | number   | Yes          | Price at which to place the order ( 0 \< price \< 1 ) |
| `amount`      | number   | Yes          | Number of shares ( amount > 1)                        |
| `side`        | number   | Yes          | The side of the order ( 0 = buy, 1 = sell)            |
| `accessToken` | string   | Yes          | Access Token received from login response             |

### Cancel An Order

```typescript
cancelOrder(
  orderId,
  accessToken
)
```

| **Field**     | **Type** | **Required** | **Description**                           |
| ------------- | -------- | ------------ | ----------------------------------------- |
| `orderId`     | number   | Yes          | Id of the order                           |
| `accessToken` | string   | Yes          | Access Token received from login response |

## Types

### Order

Used to place a new order (buy/sell) on the market.

```typescript
interface Order {
  marketId: number;
  outcomeId: number;
  tokenId: string;
  side: number; // 0 for buy, 1 for sell
  type: number; // 1 for limit, 2 for market
  outcomeType: number; // 1 for Yes, 0 for No
  price: number;
  amount: number;
  total: number;
  maxMatchedTimes: number;
  expiredAt: number;
}
```

**Key Fields**

| **Field**         | **Type** | **Description**                          |
| ----------------- | -------- | ---------------------------------------- |
| `marketId`        | number   | Unique ID of the market                  |
| `outcomeId`       | number   | Title of the event                       |
| `tokenId`         | string   | Token address (represents outcome share) |
| `side`            | number   | - 0 = Buy
- 1 = Sell                     |
| `type`            | number   | * 1 = Limit Order
* 2 = Market Order     |
| `outcomeType`     | number   | - 1 = Yes outcome
- 0 = No outcome       |
| `price`           | number   | Price per unit of outcome token          |
| `amount`          | number   | Number of shares to buy/sell             |
| `total`           | number   | Total value (price \* amount)            |
| `maxMatchedItems` | number   | Max times this order is matched          |
| `expiredAt`       | number   | Order expiry timestamp in UNIX format    |

### Order Info

Represents a specific tradable question within an event.

```typescript
interface OrderInfo {
  SIGNER_ADDRESS: string;
  MAKER_ADDRESS: string;
  MARKET_ID: number;
  AMOUNT: number;
  PRICE: number;
  OUTCOME_ID: number;
  TOKEN_ID: string;
  OUTCOME_TYPE: number;
  SIDE: number;
  TYPE: number;
}
```

**Key Fields**

| **Field**        | **Type** | **Description**               |
| ---------------- | -------- | ----------------------------- |
| `SIGNER_ADDRESS` | string   | Wallet that signed the order  |
| `MAKER_ADDRESS`  | string   | Address that placed the order |

### Order Book

Represents live buy/sell offers for a specific outcome in a market.

```typescript
export interface OrderBook {
  asks: Array<{ price: number; size: number }>;
  bids: Array<{ price: number; size: number }>;
}

// Example
/*
{
  "asks": [{ "price": 0.75, "size": 100 }],
  "bids": [{ "price": 0.68, "size": 80 }]
}
*/
```

**Key Fields**

| **Field** | **Description**                             |
| --------- | ------------------------------------------- |
| `asks`    | Sell offers with price and available shares |
| `bids`    | Buy offers with price and available shares  |

