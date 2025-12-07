---
id: "017"
status: pending
priority: p1
category: data-integrity
title: Missing Transaction Boundaries for Multi-Table Operations
created: 2024-12-07
source: pr-review
pr: 1
---

# Missing Transaction Boundaries for Multi-Table Operations

## Problem

The `saveTradesToDatabase` function performs multiple related database operations without wrapping them in a transaction. If any operation fails mid-way, the database is left in an inconsistent state.

## Location

`backend/src/services/politicalTracker.js:200-250`

```javascript
async function saveTradesToDatabase(trades) {
  // Multiple INSERT operations without transaction
  for (const trade of trades) {
    await pool.query('INSERT INTO political_trades ...');
    await pool.query('INSERT INTO trade_audit_log ...');
    // If second insert fails, first is already committed
  }
}
```

## Impact

- **Data Consistency**: Partial saves leave orphaned records
- **Audit Trail**: Missing audit records for saved trades
- **Recovery**: Manual intervention needed to fix inconsistencies

## Solution

Wrap related operations in explicit transactions:

```javascript
async function saveTradesToDatabase(trades) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Bulk insert trades
    const tradeValues = trades.map(t => [t.official, t.ticker, ...]);
    await client.query(`
      INSERT INTO political_trades (official_name, ticker, ...)
      SELECT * FROM UNNEST($1::text[], $2::text[], ...)
      ON CONFLICT ON CONSTRAINT political_trades_unique_trade DO NOTHING
    `, [tradeValues.map(v => v[0]), tradeValues.map(v => v[1]), ...]);

    // Audit log in same transaction
    await client.query(`
      INSERT INTO trade_audit_log (action, count, timestamp)
      VALUES ('bulk_insert', $1, NOW())
    `, [trades.length]);

    await client.query('COMMIT');
    return { success: true, count: trades.length };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## Files Affected

- `backend/src/services/politicalTracker.js`
- `backend/src/services/insiderTracker.js` (same pattern)

## Testing

- [ ] Verify transaction rollback on failure
- [ ] Verify all-or-nothing insert behavior
- [ ] Test with intentional mid-operation failure
- [ ] Verify connection is properly released
