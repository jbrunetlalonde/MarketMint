---
status: pending
priority: p3
issue_id: "008"
tags: [code-review, performance, frontend]
dependencies: []
---

# Missing Lazy Loading for 600+ Portrait Images

## Problem Statement

Members page loads all 600+ portrait images immediately on page load. Browser limits concurrent requests to ~6 per domain, causing slow load times.

**Why it matters:** 600 images / 6 concurrent = 100 batches. At 50ms/image = 5-8 seconds until all loaded.

## Findings

**Source:** Performance Oracle Agent

**Current Code:**
```svelte
<img
  src={getPortraitUrl(member.name, 'house')}
  onerror={(e) => ...}
/>
```

Missing `loading="lazy"` attribute.

## Proposed Solutions

### Solution 1: Add Native Lazy Loading (Recommended)
**Pros:** Zero dependencies, browser-native
**Cons:** None
**Effort:** Low (15 minutes)
**Risk:** None

```svelte
<img
  src={getPortraitUrl(member.name, 'house')}
  loading="lazy"
  decoding="async"
  onerror={(e) => ...}
/>
```

## Recommended Action

Solution 1 - Add `loading="lazy"` to all portrait images

## Acceptance Criteria

- [ ] All portrait `<img>` tags have `loading="lazy"`
- [ ] Only visible images load initially
- [ ] Page load time reduced significantly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-06 | Identified during performance review | |
