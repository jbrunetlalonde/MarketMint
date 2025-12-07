---
id: "013"
status: pending
priority: p1
category: security
title: Weak JWT Secret with Fallback Default
created: 2024-12-07
source: pr-review
pr: 1
---

# Weak JWT Secret with Fallback Default

## Problem

The JWT configuration uses a fallback default secret when `JWT_SECRET` environment variable is not set. This default secret could be discovered through source code and used to forge authentication tokens.

## Location

`backend/src/config/env.js` or authentication configuration

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
```

## Risk

- **Severity**: Critical
- **Impact**: Complete authentication bypass, account takeover
- **OWASP**: A02:2021 Cryptographic Failures

## Solution

1. Remove fallback default - fail fast if secret is missing
2. Enforce minimum secret length (32+ characters)
3. Use cryptographically random secret generation
4. Add startup validation

```javascript
// Fail fast - no defaults
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

// Generate a secure secret for .env.example documentation:
// node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Files Affected

- `backend/src/config/env.js`
- `.env.example` (document secure secret generation)

## Testing

- [ ] Verify app fails to start without JWT_SECRET
- [ ] Verify app fails with short JWT_SECRET
- [ ] Verify existing tokens work with proper secret
- [ ] Rotate secret and verify token invalidation
