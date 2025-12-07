---
id: "015"
status: pending
priority: p1
category: performance
title: Missing Functional Index on official_name
created: 2024-12-07
source: pr-review
pr: 1
---

# Missing Functional Index on official_name

## Problem

Queries filter by `LOWER(official_name)` but there's no functional index to support this. Every query results in a full table scan with case conversion on each row.

## Location

Multiple queries in `politicalTracker.js` and `political.js`:

```sql
WHERE LOWER(official_name) LIKE LOWER($1)
WHERE official_name LIKE 'Sen.%'
WHERE official_name LIKE 'Rep.%'
```

## Impact

- **Query Time**: O(n) instead of O(log n)
- **CPU**: LOWER() called for every row on every query
- **Scalability**: Performance degrades linearly with data growth

## Solution

Create functional indexes for common query patterns:

```sql
-- For case-insensitive name searches
CREATE INDEX idx_political_trades_official_name_lower
ON political_trades (LOWER(official_name));

-- For chamber filtering (prefix matching)
CREATE INDEX idx_political_trades_official_name_prefix
ON political_trades (official_name text_pattern_ops);

-- Composite index for common query pattern
CREATE INDEX idx_political_trades_official_date
ON political_trades (LOWER(official_name), transaction_date DESC);
```

Add migration file:

```javascript
// migrations/004_add_political_indexes.js
exports.up = async (pool) => {
  await pool.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS
    idx_political_trades_official_name_lower
    ON political_trades (LOWER(official_name));
  `);
};
```

## Files Affected

- `backend/src/migrations/` (new migration file)
- Database schema

## Testing

- [ ] Run EXPLAIN ANALYZE before/after index
- [ ] Verify index is used (no Seq Scan)
- [ ] Benchmark query performance improvement
