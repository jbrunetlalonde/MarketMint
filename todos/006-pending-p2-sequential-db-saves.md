---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, performance, database]
dependencies: []
---

# Sequential Database Saves Instead of Bulk Insert

## Problem Statement

Trades are saved one-by-one in a loop instead of using bulk insert, causing N database round-trips for N trades.

**Why it matters:** 100 trades = 100 database calls = ~2 seconds blocking. Should be 1 call = ~20ms.

## Findings

**Source:** Performance Oracle Agent

**Vulnerable Code:**

`backend/src/services/politicalTracker.js` lines 123-128:
```javascript
async function saveBulkTrades(trades) {
  for (const trade of trades) {
    await saveTradeToDB(trade);  // Sequential!
  }
}
```

**Performance Impact:**
- 10 trades: ~200ms (10x round-trips)
- 100 trades: ~2 seconds
- 1000 trades: ~20 seconds (blocks event loop)

## Proposed Solutions

### Solution 1: PostgreSQL UNNEST Bulk Insert (Recommended)
**Pros:** Single query, 10-100x faster
**Cons:** More complex SQL
**Effort:** Medium (2 hours)
**Risk:** Low

```javascript
async function saveBulkTrades(trades) {
  if (trades.length === 0) return;

  const values = trades.map((_, i) =>
    `($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5})`
  ).join(',');

  await query(`
    INSERT INTO political_trades (official_name, ticker, transaction_type, amount, transaction_date)
    VALUES ${values}
    ON CONFLICT DO NOTHING
  `, trades.flatMap(t => [t.officialName, t.ticker, t.type, t.amount, t.date]));
}
```

### Solution 2: Promise.all Parallel Inserts
**Pros:** Simple change
**Cons:** Still N queries, DB connection pool pressure
**Effort:** Low (30 minutes)
**Risk:** Medium - may exhaust connection pool

## Recommended Action

Solution 1 - Single bulk insert query

## Technical Details

**Affected Files:**
- `backend/src/services/politicalTracker.js`

## Acceptance Criteria

- [ ] Bulk save uses single INSERT query
- [ ] 100 trades saved in <100ms
- [ ] ON CONFLICT handles duplicates gracefully

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-06 | Identified during performance review | |

## Resources

- PostgreSQL bulk insert: https://www.postgresql.org/docs/current/dml-insert.html
