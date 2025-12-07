---
id: "022"
status: pending
priority: p2
category: architecture
title: Mock Data Embedded in Route Handlers
created: 2024-12-07
source: pr-review
pr: 1
---

# Mock Data Embedded in Route Handlers

## Problem

The political routes file contains 196 lines of hardcoded mock data used as fallback when the API fails. This clutters the route file and makes it difficult to maintain or update mock data.

## Location

`backend/src/routes/political.js:50-246`

```javascript
// 196 lines of mock data inline
const MOCK_OFFICIALS = [
  { name: 'Nancy Pelosi', party: 'Democrat', chamber: 'House', ... },
  { name: 'Mitch McConnell', party: 'Republican', chamber: 'Senate', ... },
  // ... 50+ more entries
];

const MOCK_TRADES = [
  { official: 'Nancy Pelosi', ticker: 'NVDA', ... },
  // ... 100+ entries
];
```

## Impact

- **Readability**: Route file is 50% mock data
- **Maintenance**: Mock data updates require editing route file
- **Testing**: Can't easily swap mock data for tests

## Solution

1. Extract mock data to separate fixtures directory
2. Use environment flag to enable mock mode
3. Create mock data generator for tests

```javascript
// fixtures/political-mocks.js
module.exports = {
  officials: require('./political-officials.json'),
  trades: require('./political-trades.json')
};

// routes/political.js
const mocks = require('../fixtures/political-mocks');

async function getOfficials() {
  if (process.env.USE_MOCK_DATA === 'true') {
    return mocks.officials;
  }
  return await fetchFromAPI();
}
```

Better approach - return error instead of silent fallback:

```javascript
async function getOfficials() {
  try {
    return await fetchFromAPI();
  } catch (error) {
    // Don't silently return mock data in production
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    console.warn('Using mock data due to API failure');
    return mocks.officials;
  }
}
```

## Files Affected

- `backend/src/routes/political.js`
- `backend/src/fixtures/` (new directory)
- `backend/src/fixtures/political-officials.json` (new)
- `backend/src/fixtures/political-trades.json` (new)

## Testing

- [ ] Verify mock data loads correctly in dev
- [ ] Verify production throws on API failure
- [ ] Verify fixture files are valid JSON
