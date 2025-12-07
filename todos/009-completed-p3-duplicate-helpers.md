---
status: pending
priority: p3
issue_id: "009"
tags: [code-review, dry, refactor]
dependencies: []
---

# Duplicate Helper Functions Across Files

## Problem Statement

`getPartyAbbrev()` and `getPartyClass()` are duplicated in 4 files. Should be in shared utility.

**Why it matters:** Bug fixes must be applied in multiple places.

## Findings

**Source:** Code Simplicity Reviewer

**Duplicated functions:**
- `getPartyAbbrev()`: house/+page.svelte, senate/+page.svelte, members/+page.svelte, PoliticalTradeCard.svelte
- `getPartyClass()`: members/+page.svelte, insider/+page.svelte

## Proposed Solutions

### Solution 1: Extract to Shared Utility (Recommended)
**Pros:** Single source of truth
**Cons:** Minor refactor
**Effort:** Low (30 minutes)
**Risk:** None

Create `src/lib/utils/political.ts`:
```typescript
export function getPartyAbbrev(party?: string | null): string {
  if (!party) return '?';
  const p = party.toLowerCase();
  if (p.includes('democrat')) return 'D';
  if (p.includes('republican')) return 'R';
  return party.charAt(0).toUpperCase();
}

export function getPartyClass(party?: string | null): string {
  // ...
}
```

## Recommended Action

Solution 1 - Create shared utility

## Acceptance Criteria

- [ ] Helper functions in `src/lib/utils/political.ts`
- [ ] All pages import from shared utility
- [ ] No duplicate function definitions

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-06 | Identified during code review | |
