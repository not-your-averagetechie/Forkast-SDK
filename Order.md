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

modify the MMIL-c.ts script 
so that if i put odds for any amrket at 02 , 05 , 04 00 
then it should place orders like 

for 02 odds
place 300orders at 02 on yes side and place 300 orders at 98 on no side to match the internal order. 
and then it should place 100 shares at 0.02 and 220 sahres at 0.01 
and then on NO side place first open order at ((1-0.02)-0.01)= 0.97 
so the first order would be 0.97 at 20-30 shares adn and then all remaining at 5- 5 each similar to what is already there 


if i put any any number lets say this time 04 for odds then it would put 300 sahres inititlay for match at 0.4 yes sdie and 0.96 no  side and then after initial matching
it should place shares according to the below table price: 0.09, amount: getRandomAmount(32, 34, 38, 40) },
        { price: 0.08, amount: getRandomAmount(30, 34, 38, 40) },
        { price: 0.07, amount: getRandomAmount(30, 55, 60, 65, 45, 64, 40) },
        { price: 0.06, amount: getRandomAmount(80, 85, 95, 70, 65, 60) },
        { price: 0.05, amount: getRandomAmount(80, 85, 95, 105, 90, 100, 110) },
        { price: 0.04, amount: getRandomAmount(105, 100, 90, 85, 102, 110) },
        { price: 0.03, amount: getRandomAmount(150, 140, 120, 125, 130, 110, 105, 100) },
        { price: 0.02, amount: getRandomAmount(150, 160, 175, 165, 155, 170, 185, 145, 140) },
        { price: 0.01, amount: getRandomAmount(250, 280, 300, 350, 380, 350, 320, 310, 345, 340) }
    );

    so for 04 after initial matiching it will place orders of oly 0.04, 0.03 ,0.02 and 0.01  and then on no side 20-3- shares on (1-0.04)-1 = 0.95 and then contuniue 1-2 ranodm sahres accoridng to the ciurrent logic. 

    please do this and first show me the orderbook placement and ask me for orderconfirmation before placing initial order asn and then open orders. first who me whol orderbook then place. 



so in this case it will place on yes order as 
0.06
0.05
0.04
0.03
0.02
0.01


NO Side Open Orders (price x shares):
  $0.93 x 30
  $0.90 x 1
  $0.85 x 2
  $0.80 x 2
  $0.75 x 1
  $0.70 x 1
  $0.65 x 2
  $0.60 x 2
  $0.55 x 2
  $0.50 x 2
  $0.45 x 3
  $0.40 x 3
  $0.35 x 3
  $0.30 x 3
  $0.25 x 3
  $0.2 x 10
  $0.15 x 20
  $0.1 x 30
  $0.09 x 40
  $0.08 x 40
  $0.07 x 60
  $0.06 x 65
  $0.05 x 80
  $0.04 x 110
  $0.03 x 130
  $0.02 x 145
  $0.01 x 310
