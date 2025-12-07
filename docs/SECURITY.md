# MarketMint Security Documentation

This document outlines the security measures implemented in MarketMint.

## Authentication

### JWT Token Strategy
- **Access Tokens**: Short-lived (24 hours), signed with HS256
- **Refresh Tokens**: Long-lived (7 days), stored as bcrypt hashes in database
- **Token Rotation**: Refresh tokens are rotated on each refresh for added security

### Token Storage
- Access tokens: Stored in memory (JavaScript variable) on frontend
- Refresh tokens: Stored in httpOnly cookies (when using cookie transport)
- Token hashes only stored in database, never raw tokens

### Password Security
- Passwords hashed using bcrypt with cost factor 10
- Minimum password length enforced
- No password reuse validation (consider implementing)

## Authorization

### User Scoping
All user data endpoints verify ownership:
- Watchlist items scoped to authenticated user
- Trading ideas scoped to authenticated user
- Alerts scoped to authenticated user

### Admin Role
- Admin endpoints protected by `requireAdmin` middleware
- Admin status stored in `users.is_admin` column
- Admin endpoints: Data refresh, cache management, system stats

## Input Validation

### Ticker Symbols
```javascript
// Validation pattern
/^[A-Z]{1,5}$/

// Applied to:
- Watchlist add
- Trading ideas
- Quote requests
```

### Request Body Validation
- Maximum body size: 10MB (configured in express.json)
- JSON parsing errors return 400 with "Invalid JSON body"
- Type validation on all API inputs

### SQL Injection Prevention
All database queries use parameterized statements:
```javascript
await query('SELECT * FROM users WHERE id = $1', [userId]);
```

## Rate Limiting

### Global API Limit
- Window: 1 minute
- Max requests: 100 per window
- Applied to: All `/api/*` routes

### External API Caching
To respect external API limits and reduce costs:
- Yahoo Finance quotes: 60s cache
- Price history: 1 hour cache
- Company profiles: 30 days cache
- Financial statements: 7 days cache

## HTTP Security Headers

Using Helmet.js with defaults:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- CSP configured for production

## CORS Configuration

```javascript
cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['http://localhost:3000']  // Update for production domains
    : true,
  credentials: true
})
```

## Secrets Management

### Environment Variables
Store in `.env` file (never commit):
```
JWT_SECRET=<32+ character random string>
DATABASE_URL=<connection string with password>
FMP_API_KEY=<api key>
SENTRY_DSN=<dsn for error monitoring>
```

### Secret Rotation
Rotate quarterly:
- JWT_SECRET (will invalidate all sessions)
- API keys for external services
- Database passwords

## Error Handling

### Production Error Responses
- Stack traces hidden in production
- Generic "Internal Server Error" for 500s
- Specific messages for 4xx client errors

### Error Logging
- All 500 errors logged to file (production)
- All 500 errors sent to Sentry (if configured)
- Request context included in error logs

## Database Security

### Connection Pooling
- Max connections: 20 (configurable)
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

### Backups
- Automated daily backups at 2 AM ET
- 7-day retention policy
- Compressed with gzip

### Sensitive Data
Never stored in plaintext:
- Passwords (bcrypt hashed)
- Refresh tokens (bcrypt hashed)
- Never log: passwords, tokens, API keys

## Monitoring

### Sentry Integration
- Captures uncaught exceptions
- Filters out 4xx errors
- 10% transaction sampling in production

### Winston Logging
- JSON format in production
- File transport for error.log and combined.log
- Max file size: 5MB with rotation

## Security Checklist

Before deployment:
- [ ] Change default JWT_SECRET
- [ ] Set NODE_ENV=production
- [ ] Configure allowed CORS origins
- [ ] Enable HTTPS (reverse proxy)
- [ ] Set secure database password
- [ ] Configure Sentry DSN
- [ ] Set up database backups
- [ ] Review rate limit settings
- [ ] Test authentication flows
- [ ] Verify admin access controls

## Reporting Security Issues

For security concerns, contact the project maintainer directly.
Do not open public issues for security vulnerabilities.
