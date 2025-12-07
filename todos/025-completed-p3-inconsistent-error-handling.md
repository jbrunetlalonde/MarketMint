---
id: "025"
status: pending
priority: p3
category: architecture
title: Inconsistent Error Handling Patterns
created: 2024-12-07
source: pr-review
pr: 1
---

# Inconsistent Error Handling Patterns

## Problem

The codebase uses multiple different error handling patterns, making it difficult to predict behavior and debug issues.

## Examples

Pattern 1 - Nested try-catch (bad):
```javascript
// routes/political.js
try {
  const data = await service.getData();
  try {
    const processed = await processData(data);
    res.json(processed);
  } catch (innerError) {
    res.status(500).json({ error: 'Processing failed' });
  }
} catch (outerError) {
  res.status(500).json({ error: 'Fetch failed' });
}
```

Pattern 2 - Silent failure with fallback:
```javascript
// Returns empty array on error, hiding failures
const data = await getData().catch(() => []);
```

Pattern 3 - Proper error propagation:
```javascript
// Good - lets errors bubble up
const data = await getData();
```

## Impact

- **Debugging**: Hard to trace error origins
- **Reliability**: Silent failures mask real problems
- **Consistency**: Different behaviors in similar situations

## Solution

Standardize on Express async error handling:

```javascript
// utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// routes/political.js
router.get('/trades', asyncHandler(async (req, res) => {
  const trades = await politicalService.getTrades();
  res.json(trades);
  // Errors automatically passed to error middleware
}));

// Error middleware
app.use((err, req, res, next) => {
  logger.error('Request failed', {
    path: req.path,
    error: err.message
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});
```

## Files Affected

- `backend/src/utils/asyncHandler.js` (new)
- `backend/src/routes/political.js`
- `backend/src/routes/financials.js`
- `backend/src/routes/insider.js`
- `backend/src/app.js` (error middleware)

## Testing

- [ ] Verify errors propagate to middleware
- [ ] Verify appropriate status codes
- [ ] Verify no sensitive info in production errors
