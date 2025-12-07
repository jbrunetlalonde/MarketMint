---
id: "016"
status: pending
priority: p1
category: data-integrity
title: Missing UNIQUE Constraint on political_trades
created: 2024-12-07
source: pr-review
pr: 1
---

# Missing UNIQUE Constraint on political_trades

## Problem

The `political_trades` table lacks a unique constraint on the natural key (official_name + ticker + transaction_date + transaction_type + amount). This allows duplicate records to be inserted, causing data inconsistency and inflated statistics.

## Location

`backend/src/services/politicalTracker.js:180-220`

```javascript
// ON CONFLICT DO NOTHING without a constraint target
const query = `
  INSERT INTO political_trades (...)
  VALUES ($1, $2, ...)
  ON CONFLICT DO NOTHING
`;
```

## Impact

- **Data Quality**: Duplicate trades inflate statistics
- **Storage**: Wasted space on duplicate rows
- **Accuracy**: Misleading analytics and reporting

## Solution

1. Add unique constraint to table
2. Update INSERT to use ON CONFLICT with constraint
3. Clean up existing duplicates first

```sql
-- Migration: Add unique constraint
-- First, remove duplicates keeping most recent
DELETE FROM political_trades a
USING political_trades b
WHERE a.id < b.id
  AND a.official_name = b.official_name
  AND a.ticker = b.ticker
  AND a.transaction_date = b.transaction_date
  AND a.transaction_type = b.transaction_type
  AND a.amount = b.amount;

-- Then add constraint
ALTER TABLE political_trades
ADD CONSTRAINT political_trades_unique_trade
UNIQUE (official_name, ticker, transaction_date, transaction_type, amount);
```

Update insert query:

```javascript
const query = `
  INSERT INTO political_trades (...)
  VALUES ($1, $2, ...)
  ON CONFLICT ON CONSTRAINT political_trades_unique_trade
  DO NOTHING
`;
```

## Files Affected

- `backend/src/migrations/` (new migration)
- `backend/src/services/politicalTracker.js`

## Testing

- [ ] Verify duplicates are cleaned up
- [ ] Verify constraint prevents new duplicates
- [ ] Verify ON CONFLICT handles conflicts gracefully
- [ ] Run data integrity check after migration
