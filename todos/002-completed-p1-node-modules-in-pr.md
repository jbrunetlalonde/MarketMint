---
status: completed
priority: p1
issue_id: "002"
tags: [code-review, git-hygiene, critical]
dependencies: ["001"]
---

# node_modules and Generated Files Committed to Repository

## Problem Statement

The PR includes 13,188 files with 1.5M+ additions because `node_modules/` and `.svelte-kit/` directories were committed. This:

- Bloats repository size massively
- Makes PR impossible to review on GitHub (diff too large)
- Includes third-party code that shouldn't be versioned
- Slows down clone/pull operations

**Why it matters:** The PR cannot be properly reviewed or merged in its current state. GitHub API returns 406 errors when trying to view the diff.

## Findings

**Source:** PR Metadata Analysis

**Evidence:**
```json
{
  "additions": 1598524,
  "deletions": 925,
  "changedFiles": 13188
}
```

Files that should NOT be in PR:
- `backend/node_modules/` - thousands of dependency files
- `.svelte-kit/` - generated build artifacts
- `.DS_Store` - macOS metadata files

## Proposed Solutions

### Solution 1: Reset Branch with Only Source Files (Recommended)
**Pros:** Clean history, proper PR
**Cons:** Loses current branch history
**Effort:** Medium (1-2 hours)
**Risk:** Low

```bash
git checkout main && git pull
git checkout -b feature/congress-trades-v2
# Manually add only source files from old branch
git checkout feature/congress-trades-enhancement -- src/ backend/src/ docs/
git add src/ backend/src/ docs/
git commit -m "feat(political): add congress members and insider trading"
```

### Solution 2: Interactive Rebase to Remove Files
**Pros:** Preserves commit structure
**Cons:** Complex, error-prone
**Effort:** High (2-3 hours)
**Risk:** Medium

### Solution 3: Add .gitignore and New Commit
**Pros:** Simple
**Cons:** Files remain in history, repo still bloated
**Effort:** Low (15 minutes)
**Risk:** High - doesn't fix root issue

## Recommended Action

Solution 1 - Create fresh branch with only source files

## Technical Details

**Files to include in clean PR:**
- `src/routes/political/` (new pages)
- `src/lib/utils/api.ts` (new methods)
- `src/lib/utils/urls.ts` (port fix)
- `backend/src/routes/insider.js` (new)
- `backend/src/routes/political.js` (modified)
- `backend/src/services/insiderTracker.js` (new)
- `backend/src/server.js` (route registration)
- `docs/congress-trades-plan.md` (plan)

**Required .gitignore entries:**
```
node_modules/
.svelte-kit/
.DS_Store
*.log
```

## Acceptance Criteria

- [ ] PR contains only source code files (<50 files)
- [ ] `.gitignore` properly configured
- [ ] PR diff viewable on GitHub
- [ ] Repository size reasonable after clone

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-06 | Discovered during PR review | Initial project setup lacked .gitignore |
| 2025-12-06 | Added .gitignore, removed 6528 files from git | git rm --cached preserves local files |

**RESOLVED:** Created .gitignore with node_modules/, .svelte-kit/, .env entries. Removed tracked files with `git rm -r --cached`.

## Resources

- PR: https://github.com/jbrunetlalonde/MarketMint/pull/1
- GitHub file limits: https://docs.github.com/en/repositories/working-with-files/managing-large-files
