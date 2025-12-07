# MarketMint Development Guide

## Project Overview

MarketMint is a retro newspaper-style stock trading platform built for personal use. The application provides market data, financial analysis, political trading tracking, and newsletter functionality with a distinctive IBM Plex Mono typography aesthetic.

### Tech Stack
- **Frontend**: SvelteKit 5, Tailwind CSS 4, TypeScript
- **Backend**: Node.js, Express, WebSocket
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker, Docker Compose
- **Charting**: TradingView Lightweight Charts (planned)

### Architecture
```
Frontend (SvelteKit) -> Backend (Express) -> PostgreSQL
                    -> WebSocket (real-time quotes)
                    -> External APIs (Yahoo Finance, FMP, etc.)
```

---

## Code Style Rules

### Strict Requirements
- NEVER use emojis in code, comments, or UI text
- Keep comments minimal and only where logic is non-obvious
- No verbose JSDoc blocks for simple functions
- Prefer self-documenting code over excessive comments
- Use TypeScript strictly - no `any` types unless absolutely necessary

### Naming Conventions
- Files: kebab-case (`price-card.svelte`, `auth-store.ts`)
- Components: PascalCase (`PriceCard.svelte`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE for true constants
- Database columns: snake_case

### Code Organization
```
src/
  lib/
    components/    # Reusable UI components
    stores/        # Svelte stores (.svelte.ts for runes)
    utils/         # Pure utility functions
  routes/          # SvelteKit file-based routing
backend/
  src/
    config/        # Database, env configuration
    middleware/    # Express middleware
    routes/        # API route handlers
    services/      # External API integrations
    models/        # Database query functions
```

---

## Markdown Documentation Standards

When writing `.md` plan files, technical documents, or any markdown documentation, follow these formatting rules to ensure clean, professional output in Typora and other markdown readers.

### Document Structure
- Start every document with a centered title using HTML: `<h1 align="center">Title</h1>`
- Add a centered subtitle or description below the title when appropriate
- Use horizontal rules (`---`) to separate major sections
- Maintain consistent heading hierarchy (H2 for sections, H3 for subsections)
- Include a brief overview or summary section after the title

### Layout and Spacing
- Use blank lines before and after headings, code blocks, and lists
- Keep paragraphs concise (3-5 sentences maximum)
- Use blockquotes (`>`) for important callouts or notes
- Prefer tables over long lists when comparing options or showing structured data

### Visual Hierarchy
- Use **bold** sparingly for emphasis on key terms
- Use `inline code` for file names, commands, and technical identifiers
- Use bullet lists for unordered items, numbered lists for sequential steps
- Indent nested content consistently (2 spaces for sub-items)

### Plan Document Template
```markdown
<h1 align="center">Feature/Task Name</h1>

<p align="center">Brief one-line description of the plan</p>

---

## Overview

Summary of what this plan accomplishes and why.

---

## Implementation Steps

### Phase 1: Description
- Step details
- Step details

### Phase 2: Description
- Step details

---

## Technical Considerations

Key decisions, trade-offs, or notes.

---

## Files Affected

| File | Change Type | Description |
|------|-------------|-------------|
| `path/to/file.ts` | Modify | What changes |

---

## Checklist

- [ ] Task 1
- [ ] Task 2
```

### Typora Compatibility
- Avoid raw HTML except for centering (`align="center"`)
- Use fenced code blocks with language specifiers (```typescript)
- Keep table columns balanced in width
- Test that collapsible sections render correctly if used

### Plan File Storage
- Save all implementation plans to `/docs/` directory
- Use descriptive filenames: `{feature-name}-plan.md` (e.g., `congress-trades-plan.md`)
- Reference plan files from this location when resuming work
- Keep plans updated as implementation progresses

---

## Svelte 5 Best Practices

### Use Svelte MCP Tools
1. **list-sections** - Always call first to discover relevant docs
2. **get-documentation** - Fetch all relevant sections for the task
3. **svelte-autofixer** - Run on ALL Svelte code before finalizing
4. **playground-link** - Only offer if code is NOT written to project files

### Runes Usage
```svelte
<script lang="ts">
  // State
  let count = $state(0);

  // Derived values
  const doubled = $derived(count * 2);

  // Props
  let { data, children } = $props();
</script>
```

### Component Patterns
- Always add keys to `{#each}` blocks: `{#each items as item (item.id)}`
- Use `$derived` for computed values, not inline expressions
- Prefer `onsubmit` over `on:submit` (Svelte 5 syntax)
- Associate labels with form controls via `for` and `id` attributes

---

## Git Workflow

### Branch Strategy
```
main              # Production-ready code
  develop         # Integration branch
    feature/*     # New features (feature/add-watchlist)
    fix/*         # Bug fixes (fix/auth-token-refresh)
    refactor/*    # Code improvements (refactor/api-client)
```

### Commit Messages
Format: `type(scope): description`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `style`: Formatting, no logic change
- `docs`: Documentation only
- `test`: Adding tests
- `chore`: Build, config, dependencies

Examples:
```
feat(auth): add JWT refresh token rotation
fix(quotes): handle API rate limit errors
refactor(api): consolidate fetch logic into single client
```

### Branch Rules
- Never commit directly to `main` or `develop`
- Squash commits when merging feature branches
- Delete branches after merge
- Keep PRs focused and small (<400 lines when possible)

### Pre-commit Checklist
1. Run `npm run check` - TypeScript and Svelte validation
2. Run `npm run lint` - ESLint and Prettier
3. Run `npm run test` - Unit tests pass
4. No console.log statements in production code
5. No hardcoded secrets or API keys

---

## CI/CD Pipeline

### GitHub Actions Workflow
Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run check

      - name: Unit tests
        run: npm run test:unit

      - name: Build
        run: npm run build

  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: marketmint_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install backend dependencies
        run: cd backend && npm ci

      - name: Run backend tests
        run: cd backend && npm test
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/marketmint_test
```

### Deployment Pipeline
```yaml
deploy:
  needs: [lint-and-test, backend-test]
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Deploy to server
      run: |
        # SSH and deploy commands
        # docker-compose pull && docker-compose up -d
```

---

## Infrastructure Best Practices

### Docker Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Rebuild after changes
docker-compose up -d --build backend

# Reset database
docker-compose down -v && docker-compose up -d
```

### Environment Variables
- Never commit `.env` files
- Use `.env.example` as template
- Rotate secrets quarterly
- Different values for dev/staging/prod

### Database
- Always use parameterized queries (prevent SQL injection)
- Use connection pooling (configured in `database.js`)
- Run migrations in transactions
- Index foreign keys and frequently queried columns
- Use `EXPLAIN ANALYZE` for slow queries

### API Rate Limiting
External API limits to respect:
- Yahoo Finance: 2,000/hour
- Financial Modelprep: 250/day (free tier)
- SERP API: 100/month (free tier)
- Alpha Vantage: 5/minute

Caching strategy:
- Quotes: 60s TTL
- Price history: 1 hour TTL
- Financials: 24 hour TTL
- Company profiles: 7 day TTL

### Security Checklist
- [ ] JWT tokens expire in 24h
- [ ] Refresh tokens stored as hashes
- [ ] Rate limiting on all API endpoints
- [ ] CORS restricted to known origins
- [ ] Input validation on all user inputs
- [ ] Ticker symbols validated: `/^[A-Z]{1,5}$/`
- [ ] No sensitive data in logs
- [ ] HTTPS in production

---

## Development Commands

```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # TypeScript + Svelte check
npm run lint         # ESLint + Prettier check
npm run format       # Auto-format code

# Backend
cd backend
npm run dev          # Start with file watching
npm run start        # Production start
npm test             # Run tests

# Docker
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f [service]  # Tail logs
docker-compose exec postgres psql -U marketmint  # DB shell
```

---

## API Endpoints Reference

### Authentication
```
POST /api/auth/register   # Create account
POST /api/auth/login      # Get tokens
POST /api/auth/refresh    # Refresh access token
POST /api/auth/logout     # Invalidate tokens
GET  /api/auth/me         # Current user info
```

### Market Data
```
GET /api/quotes/:ticker           # Single quote
GET /api/quotes/bulk?tickers=...  # Multiple quotes
GET /api/history/:ticker          # Price history
WS  /ws                           # Real-time updates
```

### User Data
```
GET    /api/watchlist             # Get watchlist
POST   /api/watchlist/add         # Add ticker
DELETE /api/watchlist/:ticker     # Remove ticker
GET    /api/ideas                 # Trading ideas
POST   /api/ideas                 # Create idea
```

---

## Troubleshooting

### Common Issues

**Port already in use**
```bash
lsof -i :5173  # Find process
kill -9 <PID>  # Kill it
```

**Database connection failed**
```bash
docker-compose ps  # Check if postgres is running
docker-compose logs postgres  # Check for errors
```

**Type errors after changes**
```bash
npm run check  # Run full type check
rm -rf .svelte-kit && npm run dev  # Clear cache
```

**API rate limited**
- Check cache TTLs in `backend/src/config/env.js`
- Implement request queuing for burst protection
- Use fallback APIs (Alpha Vantage as backup)
