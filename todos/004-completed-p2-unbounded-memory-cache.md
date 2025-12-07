---
status: pending
priority: p2
issue_id: "004"
tags: [code-review, performance, memory]
dependencies: []
---

# Unbounded In-Memory Cache Growth

## Problem Statement

The caching system uses JavaScript Maps with no eviction policy or size limits. Under load, this will grow unbounded until Node.js runs out of memory and crashes.

**Why it matters:** Server will eventually OOM crash, especially if running 24/7.

## Findings

**Source:** Performance Oracle Agent

**Vulnerable Code:**

`backend/src/services/insiderTracker.js` lines 5-26:
```javascript
const memoryCache = new Map();  // No max size!

function setMemoryCache(key, data, ttlSeconds) {
  memoryCache.set(key, {
    data,
    expires: Date.now() + ttlSeconds * 1000
  });
  // Never checks size, never evicts old entries
}
```

Same pattern in `politicalTracker.js`.

**Projected Impact:**
- 100 unique API calls/hour: ~5MB/hour growth
- 24-hour runtime: ~120MB memory leak
- Node.js heap limit: 1.4GB (will crash)

## Proposed Solutions

### Solution 1: Use LRU Cache Library (Recommended)
**Pros:** Battle-tested, handles eviction automatically
**Cons:** Additional dependency
**Effort:** Low (1 hour)
**Risk:** Low

```javascript
import LRU from 'lru-cache';

const memoryCache = new LRU({
  max: 500,  // Max entries
  maxSize: 50 * 1024 * 1024,  // 50MB max
  sizeCalculation: (value) => JSON.stringify(value).length,
  ttl: 1000 * 60 * 60  // 1 hour default
});
```

### Solution 2: Add Manual Cleanup Job
**Pros:** No new dependencies
**Cons:** More code to maintain
**Effort:** Medium (2 hours)
**Risk:** Medium - may miss edge cases

## Recommended Action

Solution 1 - Use `lru-cache` package

## Technical Details

**Affected Files:**
- `backend/src/services/insiderTracker.js`
- `backend/src/services/politicalTracker.js`

**Package to install:**
```bash
cd backend && npm install lru-cache
```

## Acceptance Criteria

- [ ] LRU cache implemented with size limits
- [ ] Max 500 entries or 50MB (whichever first)
- [ ] Old entries evicted automatically
- [ ] Memory usage stays stable over 24h

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-06 | Identified during performance review | |

## Resources

- lru-cache: https://www.npmjs.com/package/lru-cache
