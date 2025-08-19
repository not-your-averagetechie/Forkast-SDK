// Key differences between mml.ts and mmls.ts:

// 1. mml.ts is designed for initial liquidity provision for binary (YES/NO) markets.
//    - It places initial orders on both YES and NO sides for each market (using two wallets).
//    - The initial order size is 100 shares per side (recently changed from 300).
//    - It supports multiple markets, auto-incrementing market IDs, and collects starting odds for each market.
//    - It uses budget allocation and places further orders on both sides after the initial liquidity.

// 2. mmls.ts is designed for initial liquidity provision for multi-outcome markets (markets with more than 2 outcomes).
//    - It only places YES-side liquidity (single wallet/account).
//    - The user selects a specific market and then chooses 3 outcomes to provide liquidity for.
//    - For each selected outcome, it collects the starting odds and places orders only on the YES side.
//    - The order size and budget for each outcome is set to $80 (not shares, but total cost).
//    - It does not handle NO-side liquidity or binary markets.

// In summary:
// - mml.ts: Binary markets, YES and NO sides, multiple markets, two wallets, initial order is 100 shares per side.
// - mmls.ts: Multi-outcome markets, YES side only, user selects 3 outcomes, single wallet, budget is $80 per outcome.
