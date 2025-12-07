---
id: "018"
status: pending
priority: p2
category: security
title: CORS Misconfiguration with Credentials
created: 2024-12-07
source: pr-review
pr: 1
---

# CORS Misconfiguration with Credentials

## Problem

The CORS configuration may allow credentials with wildcard origins, which is a security vulnerability. Additionally, the origin whitelist may be too permissive for production.

## Location

`backend/src/app.js` or `backend/src/middleware/cors.js`

```javascript
app.use(cors({
  origin: '*', // or true for all origins
  credentials: true // Dangerous combination!
}));
```

## Risk

- **Severity**: Medium
- **Impact**: Cross-site request forgery, credential theft
- **OWASP**: A05:2021 Security Misconfiguration

## Solution

1. Explicitly whitelist allowed origins
2. Use a function for dynamic origin validation
3. Never use wildcard with credentials

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Files Affected

- `backend/src/app.js`
- `backend/src/config/env.js` (add FRONTEND_URL)

## Testing

- [ ] Verify allowed origins can make credentialed requests
- [ ] Verify unknown origins are rejected
- [ ] Verify preflight OPTIONS requests work
- [ ] Test from production frontend URL
