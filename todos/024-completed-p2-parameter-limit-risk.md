---
id: "024"
status: pending
priority: p2
category: data-integrity
title: PostgreSQL Parameter Limit Risk in Bulk Inserts
created: 2024-12-07
source: pr-review
pr: 1
---

# PostgreSQL Parameter Limit Risk in Bulk Inserts

## Problem

Bulk insert operations don't account for PostgreSQL's 65,535 parameter limit. When inserting large batches with many columns, the operation will fail with a cryptic error.

## Location

`backend/src/services/politicalTracker.js:180-220`

```javascript
async function bulkInsertTrades(trades) {
  // If trades has 10 columns and 7,000 records = 70,000 parameters
  // This exceeds PostgreSQL's 65,535 limit
  const values = trades.flatMap(t => [t.col1, t.col2, ..., t.col10]);
  await pool.query(`INSERT INTO ... VALUES ${placeholders}`, values);
}
```

## Impact

- **Failure**: Large imports silently fail
- **Data Loss**: Partial batches may not be retried
- **Debugging**: Error message doesn't indicate root cause

## Solution

Implement chunked batch processing:

```javascript
const POSTGRES_PARAM_LIMIT = 65535;

async function bulkInsertTrades(trades, columnsPerRow = 10) {
  const maxRowsPerBatch = Math.floor(POSTGRES_PARAM_LIMIT / columnsPerRow);
  const batches = chunk(trades, maxRowsPerBatch);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let totalInserted = 0;
    for (const batch of batches) {
      const result = await insertBatch(client, batch);
      totalInserted += result.rowCount;
    }

    await client.query('COMMIT');
    return { inserted: totalInserted };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

## Files Affected

- `backend/src/services/politicalTracker.js`
- `backend/src/services/insiderTracker.js`

## Testing

- [ ] Test with batch exceeding parameter limit
- [ ] Verify chunking produces correct results
- [ ] Verify transaction rollback on failure
- [ ] Test with exactly at limit boundary
