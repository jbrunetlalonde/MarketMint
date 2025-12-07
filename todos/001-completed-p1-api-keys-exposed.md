---
status: completed
priority: p1
issue_id: "001"
tags: [code-review, security, critical]
dependencies: []
---

# API Keys Exposed in Committed .env Files

## Problem Statement

Live API keys and secrets have been committed to the git repository in `.env` and `backend/.env` files. This is a critical security vulnerability that exposes:

- FMP API key
- Replicate API token
- Finnhub API key
- FRED API key
- JWT secret

**Why it matters:** Anyone with repository access can steal these credentials. If the repo is public or becomes public, attackers can abuse the APIs, exhaust quotas, and impersonate users via forged JWT tokens.

## Findings

**Source:** Security Sentinel Agent

**Evidence:**
```bash
git log --all --full-history -- .env
# Returns commit 8aedc8237 showing .env was committed
```

**Exposed credentials in `.env`:**
```
FMP_API_KEY=7p0h9TVs9mgSRGfY0JfxMam6ygKVJcwn
REPLICATE_API_TOKEN=r8_dwBgorL1uT5DxKVGvthGCgUeMzIe75a0ZUQDf
FINNHUB_API_KEY=d4g6fg9r01qm5b345bcgd4g6fg9r01qm5b345bd0
FRED_API_KEY=ce713b2ef6273bbb4fdd79bd397e6ae7
JWT_SECRET=dev-secret-change-in-production
```

**CVSS Score:** 9.1 (Critical)

## Proposed Solutions

### Solution 1: Rotate Keys + Remove from History (Recommended)
**Pros:** Complete remediation, prevents future exposure
**Cons:** Requires force push, disrupts collaborators
**Effort:** Medium (2-3 hours)
**Risk:** Low

Steps:
1. Rotate ALL exposed API keys at their respective dashboards
2. Remove `.env` from git history using `git filter-branch`
3. Add `.gitignore` entries
4. Force push to all branches

### Solution 2: Rotate Keys Only
**Pros:** Quick fix
**Cons:** Old keys remain in history (searchable)
**Effort:** Low (30 minutes)
**Risk:** Medium - history still contains secrets

### Solution 3: Use git-secrets Pre-commit Hook
**Pros:** Prevents future accidents
**Cons:** Doesn't fix current exposure
**Effort:** Low (15 minutes)
**Risk:** N/A - preventive only

## Recommended Action

Implement Solution 1 + Solution 3

## Technical Details

**Affected Files:**
- `/.env`
- `/backend/.env`

**Services requiring key rotation:**
- Financial Modeling Prep (FMP)
- Replicate
- Finnhub
- FRED
- JWT Secret (regenerate random string)

## Acceptance Criteria

- [ ] All API keys rotated at provider dashboards
- [ ] `.env` files removed from git history
- [ ] `.gitignore` contains `.env`, `.env.local`, `.env.*.local`
- [ ] Pre-commit hook installed to prevent secret commits
- [ ] Application still functions with new keys

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-06 | Identified during PR review | .env files committed in initial setup |
| 2025-12-06 | Added .gitignore, removed .env from tracking | Prevents future commits of secrets |

**REMAINING:** User must manually rotate all API keys at provider dashboards. Old keys remain in git history.

## Resources

- PR: https://github.com/jbrunetlalonde/MarketMint/pull/1
- git-secrets: https://github.com/awslabs/git-secrets
- BFG Repo-Cleaner: https://rtyley.github.io/bfg-repo-cleaner/
