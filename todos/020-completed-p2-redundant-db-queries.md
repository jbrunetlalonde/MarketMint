---
id: "020"
status: pending
priority: p2
category: performance
title: Redundant Database Queries in getChamberStats
created: 2024-12-07
source: pr-review
pr: 1
---

# Redundant Database Queries in getChamberStats

## Problem

The `getChamberStats` function executes 3 separate database queries to compute statistics that could be retrieved in a single query using SQL aggregation.

## Location

`backend/src/services/politicalTracker.js:460-520`

```javascript
async function getChamberStats(chamber) {
  // Query 1: Get all trades for chamber
  const trades = await pool.query('SELECT * FROM political_trades WHERE ...');

  // Query 2: Get distinct officials
  const officials = await pool.query('SELECT DISTINCT official_name FROM ...');

  // Query 3: Get top tickers
  const tickers = await pool.query('SELECT ticker, COUNT(*) FROM ...');

  // Then compute stats in JavaScript...
}
```

## Impact

- **Latency**: 3x database round trips
- **Load**: Unnecessary database connections
- **Efficiency**: Transferring data only to aggregate in JS

## Solution

Combine into single query with SQL aggregation:

```javascript
async function getChamberStats(chamber) {
  const prefix = chamber === 'senate' ? 'Sen.' : 'Rep.';

  const result = await pool.query(`
    WITH chamber_trades AS (
      SELECT * FROM political_trades
      WHERE official_name LIKE $1 || '%'
    )
    SELECT
      COUNT(*) AS total_trades,
      COUNT(DISTINCT official_name) AS unique_officials,
      COUNT(DISTINCT ticker) AS unique_tickers,
      SUM(CASE WHEN transaction_type = 'purchase' THEN 1 ELSE 0 END) AS purchases,
      SUM(CASE WHEN transaction_type = 'sale' THEN 1 ELSE 0 END) AS sales,
      (
        SELECT json_agg(t) FROM (
          SELECT ticker, COUNT(*) as count
          FROM chamber_trades
          GROUP BY ticker
          ORDER BY count DESC
          LIMIT 10
        ) t
      ) AS top_tickers,
      (
        SELECT json_agg(o) FROM (
          SELECT official_name, COUNT(*) as trade_count
          FROM chamber_trades
          GROUP BY official_name
          ORDER BY trade_count DESC
          LIMIT 10
        ) o
      ) AS top_officials
    FROM chamber_trades
  `, [prefix]);

  return result.rows[0];
}
```

## Files Affected

- `backend/src/services/politicalTracker.js`

## Testing

- [ ] Verify stats match previous implementation
- [ ] Benchmark query performance (target <50ms)
- [ ] Test with empty result set
- [ ] Verify JSON aggregation format
