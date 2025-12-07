---
status: pending
priority: p2
issue_id: "003"
tags: [code-review, security, validation]
dependencies: []
---

# Missing Input Validation on API Query Parameters

## Problem Statement

Multiple API endpoints accept unvalidated query parameters (`limit`, `page`) that are directly parsed without bounds checking. This creates potential for:

- Denial of Service via extreme limit values
- Integer overflow attacks
- Type confusion with NaN/Infinity

**Why it matters:** An attacker could crash the server or exhaust memory by requesting `?limit=999999999`.

## Findings

**Source:** Security Sentinel Agent

**Vulnerable Code:**

`backend/src/routes/political.js` line 236:
```javascript
limit: parseInt(limit)  // No validation, could be "999999999"
```

`backend/src/routes/insider.js` lines 18-19:
```javascript
page: parseInt(page),    // Could be negative
limit: parseInt(limit)   // No upper bound
```

**CVSS Score:** 7.5 (High)

## Proposed Solutions

### Solution 1: Add Validation Helper (Recommended)
**Pros:** Reusable, consistent validation
**Cons:** Requires updating all endpoints
**Effort:** Low (1 hour)
**Risk:** Low

```javascript
function validatePagination(page, limit) {
  const parsedPage = parseInt(page, 10) || 0;
  const parsedLimit = parseInt(limit, 10) || 50;

  if (parsedPage < 0 || parsedPage > 1000) {
    throw new ApiError(400, 'Invalid page (0-1000)');
  }
  if (parsedLimit < 1 || parsedLimit > 500) {
    throw new ApiError(400, 'Invalid limit (1-500)');
  }

  return { page: parsedPage, limit: parsedLimit };
}
```

### Solution 2: Use Validation Library (Joi/Zod)
**Pros:** Schema-based, comprehensive
**Cons:** Additional dependency
**Effort:** Medium (2-3 hours)
**Risk:** Low

## Recommended Action

Solution 1 - Add simple validation helper

## Technical Details

**Affected Files:**
- `backend/src/routes/political.js`
- `backend/src/routes/insider.js`

**Endpoints to fix:**
- GET `/api/political/trades`
- GET `/api/political/officials`
- GET `/api/insider/trades`
- GET `/api/insider/latest`

## Acceptance Criteria

- [ ] All pagination parameters validated
- [ ] Invalid values return 400 Bad Request
- [ ] Reasonable limits enforced (max 500)
- [ ] Negative values rejected

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-06 | Identified during security review | |

## Resources

- OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
