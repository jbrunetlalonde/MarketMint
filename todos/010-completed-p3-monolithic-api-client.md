---
status: pending
priority: p3
issue_id: "010"
tags: [code-review, architecture, refactor]
dependencies: []
---

# Monolithic API Client (1,078 lines)

## Problem Statement

The API client `src/lib/utils/api.ts` is 1,078 lines with 70+ methods in a single file. This violates Interface Segregation Principle and makes the file hard to maintain.

**Why it matters:** Developer productivity decreases as file size grows. Finding and modifying methods becomes tedious.

## Findings

**Source:** Architecture Strategist Agent

**Current structure:**
- Auth methods: 8
- Quote methods: 2
- Financials methods: 25+
- Political methods: 8
- Insider methods: 4
- ... 70+ total methods

## Proposed Solutions

### Solution 1: Split into Domain Modules (Recommended)
**Pros:** Better organization, easier to test
**Cons:** Refactoring effort
**Effort:** Medium (3-4 hours)
**Risk:** Low

```
src/lib/utils/api/
  ├── index.ts       (re-exports)
  ├── core.ts        (request helper, types)
  ├── auth.ts
  ├── political.ts
  ├── financials.ts
  ├── insider.ts
  └── quotes.ts
```

## Recommended Action

Solution 1 - Split into domain modules

## Acceptance Criteria

- [ ] API client split into domain modules
- [ ] Each module <200 lines
- [ ] Existing imports still work via re-exports
- [ ] All tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-06 | Identified during architecture review | |
