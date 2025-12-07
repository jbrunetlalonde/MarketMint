---
id: "014"
status: pending
priority: p1
category: performance
title: N+1 Query Pattern in Officials Endpoint
created: 2024-12-07
source: pr-review
pr: 1
---

# N+1 Query Pattern in Officials Endpoint

## Problem

The `/officials/:name` endpoint fetches all trades (up to 500) and then filters in memory by official name. This creates O(n) memory usage and database load regardless of result size.

## Location

`backend/src/routes/political.js:320-345`

```javascript
router.get('/officials/:name', async (req, res) => {
  const { name } = req.params;
  // Fetches ALL trades, filters in memory
  const allTrades = await getAllTrades({ limit: 500 });
  const officialTrades = allTrades.filter(t =>
    t.official_name.toLowerCase().includes(name.toLowerCase())
  );
});
```

## Impact

- **Response Time**: 200-500ms instead of <50ms
- **Memory**: Loads 500 records for potentially 1 result
- **Database**: Full table scan on every request

## Solution

Add a dedicated query method with proper filtering:

```javascript
// In politicalTracker.js
async function getTradesByOfficial(name, options = {}) {
  const { limit = 50, offset = 0 } = options;

  const result = await pool.query(`
    SELECT * FROM political_trades
    WHERE LOWER(official_name) LIKE LOWER($1)
    ORDER BY transaction_date DESC
    LIMIT $2 OFFSET $3
  `, [`%${name}%`, limit, offset]);

  return result.rows;
}

// In routes/political.js
router.get('/officials/:name', async (req, res) => {
  const trades = await getTradesByOfficial(
    req.params.name,
    { limit: req.query.limit, offset: req.query.offset }
  );
  res.json(trades);
});
```

## Files Affected

- `backend/src/services/politicalTracker.js`
- `backend/src/routes/political.js`

## Related

- See #015 for missing index on official_name

## Testing

- [ ] Verify filtered query returns correct results
- [ ] Benchmark: should be <50ms for single official
- [ ] Verify pagination works correctly
