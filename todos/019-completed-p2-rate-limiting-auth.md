---
id: "019"
status: pending
priority: p2
category: security
title: Insufficient Rate Limiting on Auth Endpoints
created: 2024-12-07
source: pr-review
pr: 1
---

# Insufficient Rate Limiting on Auth Endpoints

## Problem

Authentication endpoints (login, register, password reset) lack aggressive rate limiting, making them vulnerable to brute force and credential stuffing attacks.

## Location

`backend/src/routes/auth.js`

```javascript
// No rate limiting on sensitive endpoints
router.post('/login', async (req, res) => { ... });
router.post('/register', async (req, res) => { ... });
```

## Risk

- **Severity**: Medium
- **Impact**: Account takeover, credential stuffing
- **OWASP**: A07:2021 Identification and Authentication Failures

## Solution

Add tiered rate limiting with increasing delays:

```javascript
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip + ':' + req.body.email // Per IP + email
});

// Progressive slowdown
const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3, // Start slowing after 3 requests
  delayMs: (hits) => hits * 500 // Add 500ms per request
});

router.post('/login', authSlowDown, authLimiter, async (req, res) => { ... });
router.post('/register', authLimiter, async (req, res) => { ... });
```

## Files Affected

- `backend/src/routes/auth.js`
- `backend/package.json` (add express-slow-down)

## Testing

- [ ] Verify rate limit triggers after threshold
- [ ] Verify slowdown adds progressive delay
- [ ] Verify legitimate users aren't blocked
- [ ] Test with distributed attack simulation
