---
id: "023"
status: pending
priority: p2
category: code-quality
title: 112 Console.log Statements in Production Code
created: 2024-12-07
source: pr-review
pr: 1
---

# 112 Console.log Statements in Production Code

## Problem

The codebase contains 112 `console.log` statements that will output to production logs, creating noise and potentially exposing sensitive information.

## Locations

Distributed across multiple files:
- `backend/src/services/politicalTracker.js` (~15 instances)
- `backend/src/services/insiderTracker.js` (~12 instances)
- `backend/src/routes/political.js` (~18 instances)
- `backend/src/routes/financials.js` (~20 instances)
- `src/routes/political/[chamber]/+page.svelte` (~8 instances)
- Various other files (~39 instances)

## Impact

- **Security**: May log sensitive data (tokens, user info)
- **Performance**: Console operations have overhead
- **Noise**: Hard to find real errors in logs
- **Professionalism**: Looks unfinished

## Solution

1. Replace with proper logging library
2. Add ESLint rule to prevent console.log
3. Use log levels appropriately

```javascript
// Install winston or pino
const logger = require('./utils/logger');

// Replace console.log
// Before:
console.log('Fetched trades:', trades.length);

// After:
logger.debug('Fetched trades', { count: trades.length });
logger.info('Trade refresh completed');
logger.error('API request failed', { error: err.message });
```

Add ESLint rule:

```javascript
// .eslintrc.js
rules: {
  'no-console': ['error', { allow: ['warn', 'error'] }]
}
```

## Files Affected

- All backend service files
- All backend route files
- Several frontend Svelte components
- `.eslintrc.js` (add rule)
- `backend/src/utils/logger.js` (new file)

## Testing

- [ ] Run ESLint and fix all violations
- [ ] Verify logger outputs correctly
- [ ] Verify log levels work (DEBUG, INFO, WARN, ERROR)
- [ ] Check no sensitive data in logs
