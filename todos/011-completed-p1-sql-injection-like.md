---
id: "011"
status: pending
priority: p1
category: security
title: SQL Injection via LIKE Pattern in Chamber Parameter
created: 2024-12-07
source: pr-review
pr: 1
---

# SQL Injection via LIKE Pattern in Chamber Parameter

## Problem

The `getChamberStats` function in `politicalTracker.js` constructs LIKE patterns without escaping special SQL characters (`%`, `_`). An attacker could inject pattern characters to manipulate query results.

## Location

`backend/src/services/politicalTracker.js:478-485`

```javascript
const chamberFilter = chamber === 'senate'
  ? "AND official_name LIKE 'Sen.%'"
  : "AND official_name LIKE 'Rep.%'";
```

## Risk

- **Severity**: High
- **Impact**: Data exfiltration, query manipulation
- **OWASP**: A03:2021 Injection

## Solution

1. Use parameterized queries with proper escaping
2. Validate chamber input against whitelist (`senate`, `house`)
3. Use exact prefix matching instead of LIKE

```javascript
// Safe approach - whitelist validation
const validChambers = ['senate', 'house'];
if (!validChambers.includes(chamber)) {
  throw new Error('Invalid chamber');
}

// Use STARTS WITH pattern with escaped parameter
const prefix = chamber === 'senate' ? 'Sen.' : 'Rep.';
const query = `
  SELECT * FROM political_trades
  WHERE official_name LIKE $1 || '%'
`;
await pool.query(query, [prefix]);
```

## Files Affected

- `backend/src/services/politicalTracker.js`
- `backend/src/routes/political.js`

## Testing

- [ ] Verify chamber parameter validation
- [ ] Test with malicious LIKE patterns (`%`, `_`, `[`, etc.)
- [ ] Confirm parameterized query execution
