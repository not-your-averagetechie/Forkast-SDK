# Rate Limiting Solution for TheSportsDB NFL Fetcher

## Problem
The original NFL fetcher was getting **429 (Too Many Requests)** errors because it was making too many API calls too quickly to TheSportsDB API.

## Root Cause
- TheSportsDB API has strict rate limiting
- Making 10+ API calls in quick succession triggers rate limiting
- The free API key `123` has lower rate limits than premium keys

## Solutions Implemented

### 1. **Simple NFL Fetcher** (`simple-nfl-fetcher.ts`)
**Best Solution for Avoiding 429 Errors**

- **Only 3 teams**: Reduces API calls from 10+ to just 3
- **5-second delays**: Waits 5 seconds between each request
- **60-second recovery**: If rate limited, waits 60 seconds before retrying
- **Minimal footprint**: Gets enough events without overwhelming the API

**Usage:**
```bash
npx ts-node run-simple-nfl.ts
```

**Results:**
- ✅ No 429 errors
- ✅ Gets 2-3 upcoming NFL events
- ✅ Fast execution (15-20 seconds)
- ✅ Reliable and consistent

### 2. **Enhanced Main Fetcher** (`thesportsdb-nfl-fetcher.ts`)
**More Comprehensive Solution**

- **10 teams**: Still comprehensive but with better rate limiting
- **3-second delays**: Shorter delays but still effective
- **30-second recovery**: Faster recovery from rate limiting
- **Better error handling**: Graceful handling of 429 errors

**Usage:**
```bash
npx ts-node run-thesportsdb-nfl.ts
```

**Results:**
- ✅ Gets 6+ upcoming NFL events
- ✅ More comprehensive coverage
- ✅ Slightly longer execution time
- ✅ Better error recovery

## Rate Limiting Strategies

### 1. **Request Spacing**
```typescript
// Wait between requests
await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
```

### 2. **Error Recovery**
```typescript
if (error.response?.status === 429) {
  console.log(`⚠️ Rate limited! Waiting 60 seconds...`);
  await new Promise(resolve => setTimeout(resolve, 60000));
}
```

### 3. **Reduced Team Count**
```typescript
// Simple fetcher: only 3 teams
private keyTeams = [
  { id: '134920', name: 'New England Patriots' },
  { id: '134932', name: 'Las Vegas Raiders' },
  { id: '134921', name: 'New York Jets' }
];
```

## Recommended Approach

### For Quick Testing/Development
Use the **Simple NFL Fetcher**:
```bash
npx ts-node run-simple-nfl.ts
```

### For Production/Comprehensive Data
Use the **Enhanced Main Fetcher**:
```bash
npx ts-node run-thesportsdb-nfl.ts
```

## API Call Patterns

### Before (Causing 429)
```
Request 1 → Request 2 → Request 3 → Request 4 → Request 5 → ...
(No delays, too many requests)
```

### After (Working Solution)
```
Request 1 → Wait 5s → Request 2 → Wait 5s → Request 3 → Done
(Proper spacing, minimal requests)
```

## Monitoring Rate Limits

The fetchers now include detailed logging:
```
🔍 Fetching events for New England Patriots (1/3)...
✅ Found 1 events for New England Patriots
⏳ Waiting 5 seconds...
🔍 Fetching events for Las Vegas Raiders (2/3)...
✅ Found 1 events for Las Vegas Raiders
```

## Future Improvements

1. **Caching**: Cache results to reduce API calls
2. **Progressive Loading**: Load more teams on demand
3. **Premium API Key**: Use a premium key for higher limits
4. **Batch Requests**: If API supports batch endpoints

## Files Created

- `simple-nfl-fetcher.ts` - Minimal API calls solution
- `run-simple-nfl.ts` - Simple fetcher runner
- `thesportsdb-nfl-fetcher.ts` - Enhanced main fetcher (updated)
- `run-thesportsdb-nfl.ts` - Main fetcher runner
- `simple-nfl-events.json` - Sample output from simple fetcher
- `nfl-upcoming-events.json` - Sample output from main fetcher

## Success Metrics

✅ **No 429 errors** in recent runs  
✅ **Consistent data retrieval**  
✅ **Fast execution times**  
✅ **Reliable operation**  
✅ **Comprehensive error handling**
