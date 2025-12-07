---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, architecture, dry]
dependencies: []
---

# Massive Code Duplication Between House/Senate Pages

## Problem Statement

The House and Senate trade pages are **99% identical** with 760+ duplicated lines. Only differences are:
- Filter string: `'senator'` vs `'representative'`
- Chamber parameter in API calls
- Header text

This violates DRY (Don't Repeat Yourself) and creates maintenance burden where bug fixes must be applied twice.

**Why it matters:** Any bug or enhancement requires changes in 2 locations, doubling maintenance cost and risk of inconsistency.

## Findings

**Source:** Architecture Strategist + Code Simplicity Reviewer

**Evidence:**
- `src/routes/political/house/+page.svelte`: 384 lines
- `src/routes/political/senate/+page.svelte`: 381 lines
- Diff between files: ~10 lines different

**Duplicated sections:**
- Lines 33-58: Filtering logic (identical)
- Lines 61-96: Stats calculation (identical)
- Lines 113-122: `getPartyAbbrev()` helper (identical)
- Lines 197-330: Entire template (nearly identical)
- Lines 340-383: CSS styles (identical)

## Proposed Solutions

### Solution 1: Dynamic [chamber] Route (Recommended)
**Pros:** Single source of truth, 563 lines removed
**Cons:** Requires route restructuring
**Effort:** Medium (2-3 hours)
**Risk:** Low

Create `src/routes/political/[chamber]/+page.svelte`:
```svelte
<script lang="ts">
  import { page } from '$app/state';

  const chamber = $derived(page.params.chamber as 'house' | 'senate');

  const config = $derived({
    house: {
      title: 'House Trading Activity',
      titleFilter: (t) => t.title?.toLowerCase().includes('representative'),
      label: 'Representative'
    },
    senate: {
      title: 'Senate Trading Activity',
      titleFilter: (t) => t.title?.toLowerCase().includes('senator'),
      label: 'Senator'
    }
  }[chamber]);
</script>
```

### Solution 2: Extract Shared Component
**Pros:** Less restructuring
**Cons:** Still have two route files
**Effort:** Low (1-2 hours)
**Risk:** Low

Create `ChamberTradePage.svelte` and import in both routes.

## Recommended Action

Solution 1 - Dynamic route provides cleanest architecture

## Technical Details

**Files to modify:**
- DELETE `src/routes/political/house/+page.svelte`
- DELETE `src/routes/political/senate/+page.svelte`
- CREATE `src/routes/political/[chamber]/+page.svelte`
- UPDATE `src/routes/political/+layout.svelte` (update nav links)

**URL changes:**
- `/political/house` -> `/political/house` (same)
- `/political/senate` -> `/political/senate` (same)

## Acceptance Criteria

- [ ] Single page component handles both chambers
- [ ] URLs unchanged (`/political/house`, `/political/senate`)
- [ ] All functionality preserved
- [ ] Code reduced from 765 to ~200 lines

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-06 | Identified during architecture review | |

## Resources

- SvelteKit dynamic routes: https://kit.svelte.dev/docs/routing#parameters
