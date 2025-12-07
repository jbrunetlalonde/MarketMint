---
status: pending
priority: p3
issue_id: "007"
tags: [code-review, performance, database]
dependencies: []
---

# Stats Computed in Memory Instead of SQL

## Problem Statement

Stats endpoints fetch ALL trades (500+) and compute aggregations in JavaScript. This is O(n) complexity that should be O(1) with SQL aggregations.

**Why it matters:** As data grows, stats endpoints will become slower and use more memory.

## Findings

**Source:** Performance Oracle Agent

**Inefficient Code:**

`backend/src/routes/political.js` lines 422-445:
```javascript
const trades = await politicalTracker.getRecentTrades({ chamber: 'senate', limit: 500 });
const senateTrades = trades.filter(t => t.title?.toLowerCase().includes('senator'));
const buyCount = senateTrades.filter(t => t.transactionType === 'BUY').length;
// ... more in-memory filtering
```

## Proposed Solutions

### Solution 1: SQL Aggregation Query (Recommended)
**Pros:** O(1) with proper indexes, minimal memory
**Cons:** Requires new query
**Effort:** Medium (2 hours)
**Risk:** Low

```sql
SELECT
  COUNT(*) as total_trades,
  SUM(CASE WHEN transaction_type = 'BUY' THEN 1 ELSE 0 END) as buy_count,
  SUM(CASE WHEN transaction_type = 'SELL' THEN 1 ELSE 0 END) as sell_count
FROM political_trades pt
JOIN political_officials po ON pt.official_name = po.name
WHERE po.title LIKE '%Senator%'
```

## Recommended Action

Solution 1 - Move stats to SQL

## Acceptance Criteria

- [ ] Stats computed via SQL aggregation
- [ ] Stats endpoint response time <50ms
- [ ] Memory usage constant regardless of data size

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-06 | Identified during performance review | |
