# Market Check Bot - Hosted Endpoints Version

This is a modified version of `market-check.ts` that uses hosted Forkast API endpoints instead of localhost APIs.

## Key Changes

### Endpoints Updated
All API endpoints now point to the hosted Forkast API:

- **Event API**: `https://api.forkast.gg/api/v1/markets/get-by-slug`
- **Login API**: `https://api.forkast.gg/api/v1/auth`
- **Order API**: `https://api.forkast.gg/api/v1/order/place/v2`
- **Order Book API**: `https://api.forkast.gg/api/v1/orderbook`

### Configuration
The script automatically uses hosted endpoints as defaults, but you can still override them with environment variables:

```bash
# Mainnet (default)
MAINNET_MARKET_API_URL=https://api.forkast.gg/api/v1/markets/get-by-slug
MAINNET_ACCOUNT_API_URL=https://api.forkast.gg/api/v1/auth
MAINNET_ORDER_API_URL=https://api.forkast.gg/api/v1/order/place/v2

# Testnet
TESTNET_MARKET_API_URL=https://api.forkast.gg/api/v1/markets/get-by-slug
TESTNET_ACCOUNT_API_URL=https://api.forkast.gg/api/v1/auth
TESTNET_ORDER_API_URL=https://api.forkast.gg/api/v1/order/place/v2
```

## Usage

Run the hosted version:

```bash
npx ts-node market-check-hosted.ts
```

## Features

- ✅ Uses hosted Forkast API endpoints
- ✅ No localhost dependencies
- ✅ Same functionality as original market-check.ts
- ✅ Automatic order book filling
- ✅ Multi-wallet support (wallets 3-11)
- ✅ Rate limiting and error handling
- ✅ Comprehensive logging

## Environment Variables

Make sure to set up your wallet configuration:

```bash
# Mainnet wallets (3-11)
MAINNET_WALLET_ADDRESS_3=your_wallet_address
MAINNET_PRIVATE_KEY_3=your_private_key
MAINNET_PROXY_WALLET_3=your_proxy_wallet

# ... repeat for wallets 4-11

# Network selection
NETWORK=mainnet  # or testnet
```

## Differences from Original

1. **Endpoints**: All localhost URLs replaced with hosted API URLs
2. **Default Configuration**: Hosted endpoints are now the default fallback
3. **Console Output**: Updated to indicate "HOSTED ENDPOINTS VERSION"
4. **API Endpoint Display**: Shows hosted endpoint information in startup logs

## Benefits

- 🚀 **No Local Setup Required**: No need to run local API servers
- 🌐 **Production Ready**: Uses production Forkast API endpoints
- 🔄 **Same Functionality**: All features from original script preserved
- 📊 **Better Reliability**: Hosted endpoints are more stable than localhost
