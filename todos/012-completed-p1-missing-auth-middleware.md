---
id: "012"
status: pending
priority: p1
category: security
title: Missing Authentication Middleware on Admin Endpoints
created: 2024-12-07
source: pr-review
pr: 1
---

# Missing Authentication Middleware on Admin Endpoints

## Problem

The `/api/political/refresh` endpoint performs admin operations (triggering data refresh) but lacks authentication middleware. Any unauthenticated user can trigger expensive API calls and database operations.

## Location

`backend/src/routes/political.js:580-595`

```javascript
// POST /api/political/refresh - Manually trigger a refresh
router.post('/refresh', async (req, res) => {
  // No auth check!
  await refreshTradesInternal();
});
```

## Risk

- **Severity**: Critical
- **Impact**: Resource exhaustion, API quota depletion, DoS
- **OWASP**: A01:2021 Broken Access Control

## Solution

1. Add authentication middleware to admin routes
2. Implement role-based access control (admin only)
3. Add rate limiting specific to refresh endpoints

```javascript
const { authMiddleware, requireAdmin } = require('../middleware/auth');

router.post('/refresh',
  authMiddleware,
  requireAdmin,
  rateLimit({ windowMs: 60000, max: 1 }), // 1 per minute
  async (req, res) => {
    // Now protected
  }
);
```

## Files Affected

- `backend/src/routes/political.js`
- `backend/src/middleware/auth.js` (may need requireAdmin)

## Testing

- [ ] Verify unauthenticated requests return 401
- [ ] Verify non-admin users return 403
- [ ] Verify admin users can trigger refresh
- [ ] Verify rate limiting works
