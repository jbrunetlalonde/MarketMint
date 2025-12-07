---
id: "021"
status: pending
priority: p2
category: architecture
title: God Object Anti-Pattern in financials.js Route
created: 2024-12-07
source: pr-review
pr: 1
---

# God Object Anti-Pattern in financials.js Route

## Problem

The `financials.js` route file has grown to 655 lines with 18 endpoints handling disparate concerns (company profile, financials, executives, ratings, dividends, etc.). This violates Single Responsibility Principle and makes the code difficult to maintain.

## Location

`backend/src/routes/financials.js` (655 lines)

Endpoints currently in file:
- GET /profile/:ticker
- GET /income-statement/:ticker
- GET /balance-sheet/:ticker
- GET /cash-flow/:ticker
- GET /revenue-segments/:ticker
- GET /institutional-holders/:ticker
- GET /executives/:ticker
- GET /rating/:ticker
- GET /dcf/:ticker
- GET /price-target/:ticker
- GET /peers/:ticker
- GET /dividends/:ticker
- GET /splits/:ticker
- GET /historical-prices/:ticker
- GET /earnings-calendar
- And more...

## Impact

- **Maintainability**: Hard to find and modify specific functionality
- **Testing**: Difficult to test in isolation
- **Cognitive Load**: Developers must understand entire file

## Solution

Split into domain-focused route modules:

```
backend/src/routes/
  financials/
    index.js           # Router composition
    profile.js         # Company profile, executives
    statements.js      # Income, balance sheet, cash flow
    analysis.js        # DCF, ratings, price targets
    corporate.js       # Dividends, splits, peers
    calendar.js        # Earnings calendar
```

Example split:

```javascript
// routes/financials/index.js
const profileRoutes = require('./profile');
const statementsRoutes = require('./statements');
const analysisRoutes = require('./analysis');

const router = express.Router();
router.use('/', profileRoutes);
router.use('/', statementsRoutes);
router.use('/', analysisRoutes);

module.exports = router;
```

## Files Affected

- `backend/src/routes/financials.js` (split into multiple)
- `backend/src/routes/financials/` (new directory)
- `backend/src/app.js` (update route registration)

## Testing

- [ ] Verify all endpoints still work after split
- [ ] Verify no route conflicts
- [ ] Update any integration tests
