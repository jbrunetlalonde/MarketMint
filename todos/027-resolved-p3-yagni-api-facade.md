---
id: "027"
status: pending
priority: p3
category: code-quality
title: Potentially Unnecessary API Facade Layer
created: 2024-12-07
source: pr-review
pr: 1
---

# Potentially Unnecessary API Facade Layer

## Problem

The `src/lib/utils/api.ts` file exists purely to re-export functions from modular API files for "backward compatibility". If there are no actual consumers using the old import paths, this facade adds unnecessary indirection.

## Location

`src/lib/utils/api.ts` (125 lines)

```typescript
// Re-export from modular API structure for backward compatibility
import { authApi } from './api/auth';
import { quotesApi } from './api/quotes';
// ... 13 more imports

export const api = {
  login: authApi.login,
  register: authApi.register,
  // ... 50+ re-exports
};
```

## Questions to Answer

1. Are there imports from `$lib/utils/api` in the codebase?
2. Are there imports directly from `$lib/utils/api/auth`, etc.?
3. Is backward compatibility actually needed?

## Investigation

Run these commands to check usage:

```bash
# Check imports of the facade
grep -r "from '\$lib/utils/api'" src/ --include="*.svelte" --include="*.ts"

# Check direct module imports
grep -r "from '\$lib/utils/api/" src/ --include="*.svelte" --include="*.ts"
```

## Solution (if facade is unnecessary)

Option A - Keep modular imports only:
```typescript
// In components, import directly
import { authApi } from '$lib/utils/api/auth';
import { quotesApi } from '$lib/utils/api/quotes';
```

Option B - Keep facade but make it the barrel export:
```typescript
// api/index.ts becomes the single entry point
export * from './auth';
export * from './quotes';
// etc.
```

## Files Affected

- `src/lib/utils/api.ts` (potentially remove)
- Components importing from api.ts (update imports)

## Decision

- [ ] Investigate actual usage patterns
- [ ] Decide: keep, remove, or simplify facade
- [ ] Update imports if removing
