# Retro Newspaper Trading Platform - Production Implementation Plan

**Status:** All Phases Complete (9/9 Phases Done)
**Team:** Solo + Claude  
**Tech Stack:** Svelte, Docker, PostgreSQL, Node.js  
**Timeline:** Comprehensive Build (No MVP Phase)  
**Access:** Private (You & Friends)

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### Technology Stack

```
Frontend:          Svelte + SvelteKit (SSR for SEO-friendly newsletter sharing)
Backend:           Node.js + Express
Database:          PostgreSQL (time-series data, user watchlists, trading history)
Containerization:  Docker + Docker Compose
Charting:          svelte-chart.js + TradingView (embedded lightweight-charts)
Typography:        IBM Plex Mono (retro monospace aesthetic)
Design System:     CSS Grid + CSS Variables (newspaper layout)
```

### External APIs

| Service | Purpose | Rate Limits | Priority |
|---------|---------|-------------|----------|
| **TradingView Lightweight Charts** | Real-time OHLC charting | Embedded (no limits) | P0 |
| **Yahoo Finance** | Historical data, fundamentals, news | 2,000/hour | P0 |
| **Financial Modelprep** | Financial statements, ratios, screening | 250/day (free) | P0 |
| **SERP API** | Economic news, market sentiment | 100/month (free) | P1 |
| **Alpha Vantage** | Backup real-time quotes | 5/minute (free) | P1 |
| **NewsAPI** | Financial headlines | 100/day (free) | P1 |

### Data Flow Architecture

```
External APIs
    ↓
Node.js Backend (Caching Layer)
    ↓
PostgreSQL (Time-series + snapshot storage)
    ↓
Svelte Frontend (Real-time via WebSocket)
    ↓
TradingView Charts + Custom Visualizations
```

---

## 2. DATABASE SCHEMA (PostgreSQL)

### Core Tables

```sql
-- Users & Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  role VARCHAR(50) DEFAULT 'user' -- 'admin', 'user'
);

-- Watchlist Management
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Historical Price Data (cached from Yahoo Finance)
CREATE TABLE price_history (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  open DECIMAL(10,4),
  high DECIMAL(10,4),
  low DECIMAL(10,4),
  close DECIMAL(10,4),
  volume BIGINT,
  adjusted_close DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ticker, date)
);

-- Real-time Quote Cache
CREATE TABLE quote_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) UNIQUE NOT NULL,
  price DECIMAL(10,4),
  change_percent DECIMAL(8,4),
  market_cap BIGINT,
  pe_ratio DECIMAL(10,4),
  dividend_yield DECIMAL(8,4),
  last_updated TIMESTAMP DEFAULT NOW(),
  ttl_expires TIMESTAMP
);

-- Financial Statements (quarterly/annual)
CREATE TABLE financials (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  period VARCHAR(20) NOT NULL, -- 'Q1', 'Q2', 'FY2024', etc.
  revenue BIGINT,
  net_income BIGINT,
  operating_cash_flow BIGINT,
  free_cash_flow BIGINT,
  total_debt BIGINT,
  total_assets BIGINT,
  shareholders_equity BIGINT,
  eps DECIMAL(10,4),
  roe DECIMAL(8,4),
  roa DECIMAL(8,4),
  debt_to_equity DECIMAL(8,4),
  retrieved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ticker, period)
);

-- Political Trading Tracking (House/Senate)
CREATE TABLE political_trades (
  id BIGSERIAL PRIMARY KEY,
  official_name VARCHAR(255) NOT NULL,
  title VARCHAR(255), -- 'Senator', 'Representative'
  party VARCHAR(50),
  ticker VARCHAR(20) NOT NULL,
  transaction_type VARCHAR(20), -- 'BUY', 'SELL'
  transaction_date DATE,
  reported_date DATE,
  estimated_value VARCHAR(100), -- e.g., '$100,000-$250,000'
  ai_generated_portrait VARCHAR(255), -- URL to AI-generated image
  retrieved_at TIMESTAMP DEFAULT NOW()
);

-- Newsletter Articles
CREATE TABLE newsletter_articles (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  category VARCHAR(50), -- 'trending_stocks', 'market_news', 'economics', 'political_trades'
  content TEXT NOT NULL,
  featured_ticker VARCHAR(20),
  chart_data JSONB, -- Embedded chart configuration
  ai_generated_image VARCHAR(255), -- URL for CEO portraits or market imagery
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trading Ideas / Analysis
CREATE TABLE trading_ideas (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  thesis TEXT NOT NULL,
  entry_price DECIMAL(10,4),
  target_price DECIMAL(10,4),
  stop_loss DECIMAL(10,4),
  timeframe VARCHAR(50), -- 'intraday', 'swing', 'position'
  sentiment VARCHAR(20), -- 'bullish', 'bearish', 'neutral'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_price_history_ticker_date ON price_history(ticker, date DESC);
CREATE INDEX idx_quote_cache_ticker ON quote_cache(ticker);
CREATE INDEX idx_financials_ticker ON financials(ticker);
CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_newsletter_published_at ON newsletter_articles(published_at DESC);
CREATE INDEX idx_political_trades_ticker ON political_trades(ticker);
```

---

## 3. PROJECT STRUCTURE

```
trading-platform/
├── docker-compose.yml              # PostgreSQL + Node.js services
├── .env.production                 # Production secrets
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── server.js              # Express setup, WebSocket
│   │   ├── config/
│   │   │   ├── database.js        # PostgreSQL connection pool
│   │   │   ├── cache.js           # Redis or in-memory cache strategy
│   │   │   └── env.js             # Environment variables
│   │   ├── routes/
│   │   │   ├── auth.js            # JWT auth endpoints
│   │   │   ├── quotes.js          # Real-time stock quotes
│   │   │   ├── financials.js      # Financial statements
│   │   │   ├── news.js            # Market news & SERP
│   │   │   ├── political.js       # Congress trading data
│   │   │   ├── watchlist.js       # User watchlists
│   │   │   └── newsletter.js      # Newsletter distribution
│   │   ├── services/
│   │   │   ├── yahooFinance.js    # Yahoo Finance API wrapper
│   │   │   ├── financialModelPrep.js
│   │   │   ├── serpApi.js         # Economic news/search
│   │   │   ├── politicalTracker.js # House/Senate scraper or API
│   │   │   ├── aiImageGen.js      # Call to AI image generation (Replicate/Stability)
│   │   │   └── cache.js           # Caching logic & TTL management
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification
│   │   │   └── errorHandler.js
│   │   └── models/
│   │       └── index.js           # SQL queries organized by model
│   └── tests/
│       └── integration.test.js
│
├── frontend/
│   ├── Dockerfile
│   ├── svelte.config.js           # SvelteKit configuration
│   ├── package.json
│   ├── src/
│   │   ├── app.html               # Root HTML template
│   │   ├── routes/
│   │   │   ├── +page.svelte       # Homepage (market overview)
│   │   │   ├── +layout.svelte     # Root layout (IBM Plex Mono, retro style)
│   │   │   ├── ticker/
│   │   │   │   └── [symbol]/+page.svelte  # Stock detail page
│   │   │   ├── newsletter/
│   │   │   │   └── +page.svelte   # Newsletter archive
│   │   │   ├── political/
│   │   │   │   └── +page.svelte   # Congress trading tracker
│   │   │   ├── watchlist/
│   │   │   │   └── +page.svelte   # User watchlist
│   │   │   └── analysis/
│   │   │       └── +page.svelte   # Trading ideas dashboard
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── Header.svelte
│   │   │   │   ├── Sidebar.svelte
│   │   │   │   ├── PriceCard.svelte
│   │   │   │   ├── Chart.svelte   # svelte-chart wrapper
│   │   │   │   ├── NewsCard.svelte
│   │   │   │   ├── PoliticalTradeCard.svelte
│   │   │   │   └── NewsletterPreview.svelte
│   │   │   ├── stores/
│   │   │   │   ├── user.js        # User context (Svelte store)
│   │   │   │   ├── quotes.js      # Real-time quote updates
│   │   │   │   └── watchlist.js   # Watchlist state
│   │   │   ├── utils/
│   │   │   │   ├── api.js         # API client wrapper
│   │   │   │   ├── formatters.js  # Number/currency formatting
│   │   │   │   └── websocket.js   # WebSocket management
│   │   │   └── styles/
│   │   │       ├── variables.css  # Design system (IBM Plex Mono vars)
│   │   │       ├── newspaper.css  # Retro newspaper layout grid
│   │   │       └── global.css
│   │   └── hooks.js               # SvelteKit hooks (auth, etc.)
│   └── static/
│       └── fonts/                 # IBM Plex Mono locally hosted
│
├── scripts/
│   ├── seed-database.js           # Initial data import
│   ├── cron-jobs.js               # Scheduled API calls
│   └── generate-ai-portraits.js   # Batch AI image generation
│
└── docs/
    ├── API.md                     # Backend API documentation
    ├── DEPLOYMENT.md              # Docker & production setup
    └── FEATURE_ROADMAP.md         # Future enhancements
```

---

## 4. IMPLEMENTATION PHASES

### Phase 1: Core Infrastructure (Weeks 1-2) - COMPLETE

**Deliverables:**
- [x] Docker Compose setup (PostgreSQL + Node.js + Svelte services)
- [x] Database schema and initial migrations
- [x] Express backend skeleton with middleware
- [x] SvelteKit frontend with basic routing
- [x] User authentication (JWT) with simple login/register
- [x] Environment configuration for production

**Key Files Created:**
```
✓ docker-compose.yml
✓ backend/Dockerfile + backend/package.json
✓ frontend/Dockerfile + frontend/svelte.config.js
✓ Database schema SQL file
✓ Auth routes (backend) + Login page (frontend)
✓ backend/src/models/index.js (SQL queries)
✓ All route files (watchlist, quotes, financials, news, political, newsletter)
```

---

### Phase 2: Real-time Quote System (Weeks 2-3) - COMPLETE

**Deliverables:**
- [x] Yahoo Finance API integration (with caching)
- [x] WebSocket connection for live updates
- [x] Quote cache table + TTL refresh logic
- [x] Price card component (display price, % change, sparkline)
- [x] Homepage market overview grid
- [x] Watchlist add/remove functionality

**Key Files Created:**
```
✓ backend/src/services/yahooFinance.js (Yahoo Finance API with caching)
✓ backend/src/services/websocket.js (WebSocket subscription service)
✓ backend/src/routes/quotes.js (real quotes + fallback mock)
✓ src/lib/components/PriceCard.svelte
✓ src/routes/+page.svelte (homepage with market overview)
✓ src/lib/stores/quotes.svelte.ts (Svelte 5 runes store)
```

**API Endpoints:**
```
GET  /api/quotes/:ticker          # Get current quote
GET  /api/quotes?tickers=X,Y,Z    # Get multiple quotes
GET  /api/quotes/:ticker/history  # Historical price data
WS   /ws                          # WebSocket live feed
POST /api/watchlist/add           # Add to watchlist
GET  /api/watchlist               # Get user's watchlist
```

---

### Phase 3: Historical Charting (Weeks 3-4) - COMPLETE

**Deliverables:**
- [x] Price history retrieval from Yahoo Finance (5y of data)
- [x] TradingView Lightweight Charts integration
- [x] Candlestick chart component with volume bars
- [x] Stock detail page with OHLC candlestick + volume
- [x] Technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands)
- [x] Time-range selector (1D, 1W, 1M, 3M, 1Y, 5Y)
- [x] DB-first caching strategy (no API chaining)
- [x] Docker optimization for fast loading

**Key Files Created:**
```
✓ backend/src/services/priceHistory.js (DB-first caching, batch storage)
✓ backend/src/routes/charts.js (OHLC and indicators API)
✓ backend/src/scripts/preload-data.js (data preloader)
✓ src/lib/components/CandlestickChart.svelte (TradingView Lightweight Charts)
✓ src/lib/components/IndicatorPanel.svelte (RSI/MACD panels)
✓ src/routes/ticker/[symbol]/+page.svelte (updated with new charting)
✓ scripts/postgres-init.sql (PostgreSQL performance tuning)
✓ docker-compose.yml (optimized with preloader service)
```

**API Endpoints:**
```
GET  /api/charts/:ticker/ohlc        # OHLC candlestick data
GET  /api/charts/:ticker/indicators  # OHLC with technical indicators
GET  /api/charts/:ticker/freshness   # Data freshness info
POST /api/charts/preload             # Preload tickers (admin)
```

**DB-First Caching Strategy:**
- Historical data stored permanently in PostgreSQL (price_history table)
- Memory cache (5 min TTL) for recent requests
- API only called if data missing or stale
- Preloader script populates common tickers on startup
- PostgreSQL optimized for time-series queries

---

### Phase 4: Financial Statements & Analysis (Weeks 4-5) - COMPLETE

**Deliverables:**
- [x] Financial Modelprep API integration
- [x] Income statement, balance sheet, cash flow retrieval
- [x] Quarterly + annual data display
- [x] Key metrics dashboard (P/E, ROE, Debt-to-Equity, etc.)
- [x] DB-first caching (PostgreSQL) for all FMP data
- [x] Request deduplication (prevents duplicate API calls)
- [x] Admin bulk refresh endpoints
- [x] Extended TTLs (profiles: 30 days, financials: 7 days)

**Key Files Created:**
```
✓ backend/src/services/financialModelPrep.js (DB-first caching, deduplication)
✓ backend/src/routes/financials.js (all financial endpoints)
✓ backend/src/routes/admin.js (bulk refresh, cache management)
✓ scripts/add-fmp-cache-tables.sql (FMP cache tables migration)
✓ Schema: fmp_*_cache tables (income, balance, cashflow, metrics, ratios, etc.)
```

**API Endpoints:**
```
GET  /api/financials/:ticker              # Financial summary
GET  /api/financials/:ticker/profile      # Company profile
GET  /api/financials/:ticker/income       # Income statements
GET  /api/financials/:ticker/balance      # Balance sheet
GET  /api/financials/:ticker/cashflow     # Cash flow
GET  /api/financials/:ticker/executives   # Key executives
GET  /api/financials/:ticker/rating       # Analyst rating
GET  /api/financials/:ticker/dcf          # DCF valuation
GET  /api/financials/:ticker/price-target # Price target consensus
GET  /api/financials/:ticker/peers        # Competitor stocks
GET  /api/financials/:ticker/dividends    # Dividend history
GET  /api/financials/:ticker/splits       # Stock splits
GET  /api/financials/:ticker/full         # All data in one call
```

**Admin Endpoints (require admin auth):**
```
GET    /api/admin/cache/stats           # View cache statistics
POST   /api/admin/refresh/profiles      # Bulk refresh company profiles
POST   /api/admin/refresh/financials    # Bulk refresh financial data
POST   /api/admin/refresh/ohlc          # Bulk refresh price history
GET    /api/admin/refresh/status/:id    # Check job status
GET    /api/admin/refresh/history       # View refresh history
DELETE /api/admin/cache/clear           # Clear caches
GET    /api/admin/watchlist/tickers     # Get all watched tickers
```

**DB-First Caching Strategy:**
```
Request → Memory Cache (5min) → PostgreSQL Cache (7-30 days) → External API
              instant              ~1ms latency              500ms+ latency
```

| Data Type | PostgreSQL Table | TTL | API Calls Saved |
|-----------|------------------|-----|-----------------|
| Profiles | company_profiles | 30 days | ~95% |
| Financials | fmp_income/balance/cashflow_cache | 7 days | ~90% |
| Metrics/Ratios | fmp_metrics/ratios_cache | 7 days | ~90% |
| Valuations | fmp_dcf/rating/price_target_cache | 7 days | ~90% |
| Executives | fmp_executives_cache | 30 days | ~95% |
| Peers | fmp_peers_cache | 30 days | ~95% |
| Real-time Quotes | Memory only | 60 sec | N/A (real-time) |

---

### Phase 5: News & Economic Data (Weeks 5-6) - COMPLETE

**Deliverables:**
- [x] FMP Stock News integration (replaced SERP/NewsAPI)
- [x] FRED API integration for Federal Reserve economic data
- [x] News aggregator service with DB-first caching
- [x] Economic indicators dashboard (Fed Funds, Treasury yields, VIX, unemployment)
- [x] Email newsletter system (SendGrid/SMTP support)
- [x] Newsletter generator with retro HTML template
- [x] Scheduler service (4PM ET daily newsletter, weekly data refresh)
- [x] Newsletter subscription management

**Key Files Created:**
```
✓ backend/src/services/fredApi.js (FRED API with DB-first caching)
✓ backend/src/services/newsAggregator.js (FMP news with caching)
✓ backend/src/services/emailService.js (SendGrid/SMTP)
✓ backend/src/services/newsletterGenerator.js (HTML email template)
✓ backend/src/services/scheduler.js (node-cron jobs)
✓ backend/src/routes/economic.js (FRED endpoints)
✓ backend/src/routes/news.js (updated with real data)
✓ backend/src/routes/newsletter.js (subscription management)
✓ scripts/add-phase5-tables.sql (fred_cache, fmp_news_cache, newsletter_subscribers, newsletter_sends)
✓ src/routes/economic/+page.svelte (economic dashboard)
✓ src/routes/newsletter/+page.svelte (subscription form)
✓ src/lib/utils/api.ts (new API methods)
```

**API Endpoints:**
```
GET  /api/news                    # Latest market news
GET  /api/news/trending           # Top stories
GET  /api/news/summary            # News summary for dashboard
GET  /api/news/:ticker            # Stock-specific news

GET  /api/economic/indicators     # All FRED indicators
GET  /api/economic/dashboard      # Summary for frontend
GET  /api/economic/series/:id     # Specific series data
GET  /api/economic/available      # List available series

POST /api/newsletter/subscribe    # Subscribe to newsletter
POST /api/newsletter/unsubscribe  # Unsubscribe with token
GET  /api/newsletter/preview      # Preview newsletter (admin)
POST /api/newsletter/send         # Manual send (admin)
GET  /api/newsletter/history      # Send history (admin)
GET  /api/newsletter/subscribers  # Subscriber list (admin)
GET  /api/newsletter/status       # System status (admin)
```

**Scheduling:**
- Daily newsletter: 4:00 PM ET (weekdays, after market close)
- Weekly data refresh: Sunday 8:00 PM ET
- Cache cleanup: Daily 3:00 AM ET

**FRED Economic Indicators:**
- FEDFUNDS (Federal Funds Rate)
- DGS10/DGS2 (Treasury Yields)
- T10Y2Y (Yield Spread)
- UNRATE (Unemployment)
- CPIAUCSL (CPI)
- VIXCLS (VIX)
- GDP (Gross Domestic Product)
- MORTGAGE30US (30-Year Mortgage)
- DCOILWTICO (WTI Crude Oil)

---

### Phase 6: Political Trading Tracker (Weeks 6-7) - COMPLETE

**Deliverables:**
- [x] Scraper for House/Senate trading data (Capitol Trades API)
- [x] Political trades table with transaction details
- [x] Political trading page with filters (by party, official, stock)
- [x] Member detail page with individual trading history
- [x] Common tickers tracking across congress members

**Key Files:**
```
✓ backend/services/politicalTracker.js (Capitol Trades API integration)
✓ backend/routes/political.js
✓ src/lib/components/PoliticalTradeCard.svelte
✓ src/routes/political/+page.svelte
✓ src/routes/political/member/[id]/+page.svelte
✓ Schema: political_trades table
```

---

### Phase 7: Newsletter System (Weeks 7-8) - COMPLETE (Merged into Phase 5)

**Deliverables:**
- [x] Automated newsletter generation (trending stocks, news, political trades)
- [x] HTML email template with retro newspaper styling
- [x] Email delivery service integration (SendGrid/SMTP)
- [x] Newsletter archive page
- [x] Subscription management (opt-in/out for friends)
- [x] Trending stocks algorithm (based on volume, P&L change)

**Key Files:**
```
✓ backend/src/services/newsletterGenerator.js (generation logic)
✓ backend/src/services/emailService.js (SendGrid/SMTP)
✓ backend/src/services/scheduler.js (4PM ET daily send)
✓ backend/src/routes/newsletter.js
✓ src/routes/newsletter/+page.svelte
```

**Content Sections:**
- Trending Stocks - Top gainers/losers, unusual volume
- Market News - Top headlines from FMP
- Economic Indicators - Key FRED data
- Congress Trades - Political trading activity

---

### Phase 8: User Dashboard & Trading Ideas (Weeks 8-9) - COMPLETE

**Deliverables:**
- [x] Trading ideas board (long/short thesis)
- [x] Entry/target/stop-loss tracking
- [x] Performance tracking against actual market
- [x] User dashboard with watchlist, open ideas, P&L
- [x] Export data (CSV, PDF)
- [x] Price alerts for target/stop-loss triggers

**Key Files:**
```
✓ backend/routes/tradingIdeas.js
✓ frontend/routes/analysis/+page.svelte
✓ frontend/lib/components/TradingIdeaCard.svelte
✓ Schema: trading_ideas table
```

---

### Phase 9: Production Hardening (Weeks 9-10) - COMPLETE

**Deliverables:**
- [x] Rate limiting on API endpoints
- [x] Error monitoring (Sentry integration)
- [x] Database backups & recovery plan
- [x] SSL/TLS certificates (skipped - HTTP only for private use)
- [x] Performance profiling & optimization
- [x] Security audit (input validation, SQL injection prevention)
- [x] Load testing (autocannon scripts)
- [x] Structured logging (Winston)

**Key Files:**
```
✓ backend/src/config/logger.js (Winston logging)
✓ backend/src/config/sentry.js (Sentry integration)
✓ scripts/backup-db.sh (Database backup)
✓ scripts/restore-db.sh (Database restore)
✓ scripts/load-test.js (Load testing)
✓ docs/SECURITY.md (Security documentation)
```

**Key Checklist:**
```
✓ All API endpoints have rate limiting
✓ Sensitive data encrypted (passwords, API keys in .env)
✓ CSRF protection on POST/DELETE routes
✓ Database connection pooling configured
✓ Cache TTLs optimized
✓ Docker containers health checks configured
✓ Logs aggregated and monitored (Winston + Sentry)
✓ Database backups automated (scripts ready)
```

---

## 5. DETAILED TECHNICAL SPECIFICATIONS

### Backend API Reference

#### Authentication
```
POST   /api/auth/register         # Create new user
POST   /api/auth/login            # JWT token issuance
POST   /api/auth/refresh          # Refresh expired token
POST   /api/auth/logout           # Invalidate token
```

#### Quotes & Market Data
```
GET    /api/quotes/:ticker        # Current quote
GET    /api/quotes/bulk           # Bulk quotes (comma-separated)
GET    /api/history/:ticker?period=1y&interval=daily
WS     /ws/quotes                 # Real-time WebSocket feed
```

#### Financials
```
GET    /api/financials/:ticker    # Latest financials
GET    /api/financials/:ticker/history  # Historical statements
GET    /api/metrics/:ticker       # Key ratios & multiples
```

#### News
```
GET    /api/news?category=market  # News feed
GET    /api/news/trending         # Trending topics
GET    /api/news/search?q=QUERY   # Search news
```

#### Political Trading
```
GET    /api/political/trades      # All trades (filterable)
GET    /api/political/officials   # Congress members
GET    /api/political/trades/:ticker  # Trades for specific stock
```

#### Newsletter
```
GET    /api/newsletter/latest     # Latest newsletter
GET    /api/newsletter/archive    # Past newsletters
POST   /api/newsletter/subscribe  # Subscribe email
POST   /api/newsletter/unsubscribe
```

#### Watchlist (User-specific)
```
GET    /api/watchlist             # User's watchlist
POST   /api/watchlist/add         # Add ticker
DELETE /api/watchlist/:ticker     # Remove ticker
```

#### Trading Ideas
```
GET    /api/ideas                 # User's trading ideas
POST   /api/ideas                 # Create idea
PUT    /api/ideas/:id             # Update idea
DELETE /api/ideas/:id             # Delete idea
```

### Frontend Routes

```
/                           # Homepage (market overview)
/ticker/[symbol]            # Stock detail page
/watchlist                  # User's watchlist
/newsletter                 # Newsletter archive
/political                  # Congress trading tracker
/analysis                   # Trading ideas dashboard
/auth/login                 # Login page
/auth/register              # Sign up page
```

### Cron Jobs (Backend)

```javascript
// Every 15 minutes (during market hours: 9:30 AM - 4:00 PM ET)
- Refresh quote_cache for top 50 watchlist stocks
- Update real-time WebSocket feeds

// Every 6 hours
- Fetch latest news from SERP API
- Refresh financial metrics (quarterly updates less frequent)

// Every 2 hours (market hours)
- Check for unusual trading volume
- Monitor political trades for updates

// Daily at 4:15 PM ET (post-market)
- Generate newsletter (trending stocks, news summary, charts)
- Send email to subscribers

// Weekly (Sunday 6:00 AM)
- Batch generate AI portraits for new Congress members
- Archive old cache entries
- Database maintenance (VACUUM, ANALYZE)
```

---

## 6. DEPLOYMENT GUIDE

### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      YAHOO_API_KEY: ${YAHOO_API_KEY}
      FMP_API_KEY: ${FMP_API_KEY}
      SERP_API_KEY: ${SERP_API_KEY}
      REPLICATE_API_TOKEN: ${REPLICATE_API_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5000:5000"
    volumes:
      - ./backend/src:/app/src
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: http://backend:5000
      VITE_WS_URL: ws://backend:5000
    depends_on:
      - backend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend/src:/app/src

volumes:
  postgres_data:
```

### Production Deployment (VPS/Cloud)

**Option 1: DigitalOcean Droplet (Recommended for simplicity)**
```bash
# 1. SSH into VPS
ssh root@YOUR_VPS_IP

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh | sh
apt-get install docker-compose

# 3. Clone repository
git clone https://github.com/yourusername/trading-platform.git
cd trading-platform

# 4. Create .env.production
cp .env.example .env.production
# Edit with your API keys and secrets

# 5. Build and run
docker-compose up -d

# 6. Setup SSL (Let's Encrypt via Caddy)
# Add caddy service to docker-compose.yml
```

**Option 2: AWS EC2 + RDS (Better scaling)**
- Use managed PostgreSQL (RDS) instead of Docker container
- EC2 instance for backend + frontend
- S3 for storing AI-generated images
- CloudWatch for monitoring

### Backup Strategy

```bash
# Daily automated backups
docker-compose exec postgres pg_dump -U ${DB_USER} ${DB_NAME} > backups/db-$(date +%Y%m%d).sql

# Store in S3 or backup service
aws s3 cp backups/db-*.sql s3://your-backup-bucket/
```

### Monitoring & Logs

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Database performance
docker-compose exec postgres psql -U ${DB_USER} -d ${DB_NAME} -c "SELECT * FROM pg_stat_statements;"
```

---

## 7. DESIGN SYSTEM (Retro Newspaper Style)

### Typography
```css
/* IBM Plex Mono for everything */
font-family: 'IBM Plex Mono', 'Courier New', monospace;
font-size: 12px;  /* Retro newsprint scale */
line-height: 1.6;
letter-spacing: 0.05em;
```

### Color Palette (High Contrast, Newspaper-like)
```css
--bg-primary: #f5f5f0;      /* Off-white newsprint */
--bg-secondary: #ffffff;    /* Pure white for content cards */
--text-primary: #1a1a1a;    /* Deep black (like ink) */
--text-secondary: #666666;  /* Gray for captions */
--accent-positive: #0066cc; /* Blue for gains */
--accent-negative: #cc0000; /* Red for losses */
--border: #cccccc;          /* Light gray borders */
--headline: #000000;        /* Bold black for headlines */
```

### Layout Grid (Newspaper Columns)
```css
/* 3-column layout inspired by broadsheet */
.newspaper-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1rem;
  max-width: 1200px;
}

/* Responsive */
@media (max-width: 1024px) {
  .newspaper-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .newspaper-grid {
    grid-template-columns: 1fr;
  }
}
```

### Component Styling Examples

```html
<!-- Headline -->
<h1 class="headline">MARKET RALLIES ON RATE PAUSE</h1>

<!-- Stock Card (Narrow Column) -->
<div class="stock-card">
  <div class="ticker">AAPL</div>
  <div class="price">$185.50</div>
  <div class="change positive">+2.34%</div>
  <div class="sparkline"><!-- mini chart --></div>
</div>

<!-- News Article -->
<article class="article">
  <h3>Fed Signals Pause in Rate Hikes</h3>
  <p class="byline">By Market Reporter | 3:45 PM</p>
  <p>Lorem ipsum dolor sit amet...</p>
</article>
```

---

## 8. SECURITY & HARDENING CHECKLIST

- [ ] **Authentication:** JWT with 24h expiration + refresh tokens
- [ ] **Rate Limiting:** 100 req/min per IP on public endpoints
- [ ] **Input Validation:** Whitelist ticker symbols (regex: `^[A-Z]{1,5}$`)
- [ ] **SQL Injection Prevention:** Use parameterized queries (Node pg library)
- [ ] **CORS:** Restrict to localhost:3000 (private use)
- [ ] **Environment Variables:** Never commit `.env` files
- [ ] **API Keys:** Rotate quarterly; store in .env.production only
- [ ] **Database:** Enable SSL connections; use strong password
- [ ] **Secrets Management:** Use Docker secrets for sensitive data
- [ ] **Logging:** No sensitive data in logs (strip API keys, tokens)
- [ ] **SSL/TLS:** Use self-signed certs or Let's Encrypt
- [ ] **Database Backups:** Encrypted, stored off-server

---

## 9. PERFORMANCE OPTIMIZATION

### Database Query Optimization
```sql
-- Index strategy
CREATE INDEX idx_price_history_ticker_date ON price_history(ticker, date DESC);
CREATE INDEX idx_quote_cache_ttl ON quote_cache(ttl_expires) WHERE ttl_expires < NOW();
CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);

-- Materialized view for trending stocks
CREATE MATERIALIZED VIEW trending_stocks AS
SELECT ticker, COUNT(*) as watchlist_count, AVG(change_percent) as avg_change
FROM watchlists w
JOIN quote_cache q ON w.ticker = q.ticker
GROUP BY ticker
ORDER BY watchlist_count DESC
LIMIT 50;

-- Refresh daily
REFRESH MATERIALIZED VIEW trending_stocks;
```

### Backend Caching Strategy (DB-First)

**Three-Tier Caching Architecture:**
```
Tier 1: Memory Cache (5 min TTL)     - Instant access, hot data
Tier 2: PostgreSQL Cache (7-30 days) - Persistent, survives restarts
Tier 3: External API                 - Only called if cache miss
```

**Request Flow:**
```javascript
// DB-first caching pattern (used by all FMP endpoints)
async function getProfile(ticker) {
  // 1. Check memory cache first (instant)
  const memCached = getFromMemoryCache(key);
  if (memCached) return memCached;

  // 2. Check database cache (1ms latency)
  const dbCached = await getProfileFromDB(ticker);
  if (dbCached) {
    setMemoryCache(key, dbCached, 300); // warm memory cache
    return dbCached;
  }

  // 3. Fetch from external API with deduplication
  return deduplicatedRequest(key, async () => {
    const data = await fetchFMP(`/profile?symbol=${ticker}`);
    await saveProfileToDB(ticker, data, ttl); // persist to DB
    setMemoryCache(key, data, 300);
    return data;
  });
}
```

**Request Deduplication:**
```javascript
// Prevents duplicate API calls when multiple clients request same ticker
const pendingRequests = new Map();

async function deduplicatedRequest(key, fetchFn) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key); // return same promise
  }
  const promise = fetchFn().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}
```

**Cache TTL Configuration (env.js):**
```javascript
cacheTTL: {
  quote: 60,              // 1 minute (real-time)
  priceHistory: 3600,     // 1 hour
  financials: 604800,     // 7 days
  profile: 2592000,       // 30 days
  valuation: 604800,      // 7 days
  executives: 2592000,    // 30 days
  peers: 2592000          // 30 days
}
```

### Frontend Performance
```javascript
// Code splitting by route (SvelteKit automatic)
// Lazy-load charts only when needed
// Use WebSocket for real-time updates (not polling)
// Debounce search inputs (300ms)
// Image optimization for AI-generated portraits
```

---

## 10. ADDITIONAL FEATURES (Post-Roadmap)

The following features were added after the initial 9-phase roadmap:

### Portfolio Holdings
- [x] Track stock positions with cost basis and shares
- [x] Real-time P&L calculation (unrealized gains/losses)
- [x] Add/edit/delete positions with transaction history
- [x] Portfolio summary with total value and performance

### Price Alerts System
- [x] Trade alerts (target price hit, stop-loss triggered)
- [x] Idea alerts (new ideas, idea updates, idea closures)
- [x] Unread alert badge in navigation
- [x] Mark alerts as read/unread
- [x] Auto-cleanup of old read alerts (30+ days)

### Search Autocomplete
- [x] Typeahead ticker search with company names
- [x] Keyboard navigation (arrow keys, enter)
- [x] Debounced search (300ms)
- [x] Click-outside to close

### Reusable Components
- [x] NewsCard component for news display
- [x] NavBar component with auth state
- [x] MastheadHeader component

### Dark Mode
- [x] 3-way theme toggle (light/dark/system)
- [x] WCAG AA compliant contrast ratios
- [x] Persistent preference in localStorage
- [x] No flash on page load

### Scheduler Jobs
- [x] Trending stocks materialized view refresh (2h market hours)
- [x] Watchlist quote cache refresh (15min market hours)
- [x] Political trades refresh (daily 1PM ET)
- [x] Old alerts cleanup (weekly Sunday 2AM ET)

---

## 11. FUTURE ENHANCEMENTS (Planned)

- **Machine Learning:** Predictive models for stock trends
- **Options Chain:** Implied volatility, Greeks visualization
- **Backtesting Engine:** Test trading strategies historically
- **Mobile App:** React Native companion app
- **Community Features:** Private chat, shared watchlists
- **API for Friends:** RESTful API so friends can build tools on top

---

## 12. TIME ESTIMATE & RESOURCE PLANNING

| Phase | Duration | Priority | Effort | Status |
|-------|----------|----------|--------|--------|
| 1. Infrastructure | 2 weeks | P0 | High | COMPLETE |
| 2. Real-time Quotes | 1 week | P0 | Medium | COMPLETE |
| 3. Historical Charts | 1 week | P0 | Medium | COMPLETE |
| 4. Financials + Caching | 1 week | P0 | Medium | COMPLETE |
| 5. News & Economic Data | 1 week | P1 | Medium | COMPLETE |
| 6. Political Trading | 1 week | P1 | Medium | COMPLETE |
| 7. Newsletter | 1 week | P1 | Medium | (Merged into Phase 5) |
| 8. User Dashboard | 1 week | P2 | Medium | COMPLETE |
| 9. Hardening | 1 week | P0 | High | COMPLETE |
| **Total** | **~10 weeks** | — | — | 9/9 Done |

**Realistic Timeline:** 3-4 months solo with Claude (accounting for testing, refinement, bug fixes)

---

## 13. GETTING STARTED

### Step 1: Project Setup
```bash
mkdir trading-platform && cd trading-platform
git init
mkdir backend frontend scripts docs
echo "*.env.local\nnode_modules/\n.DS_Store" > .gitignore
```

### Step 2: Backend Initialization
```bash
cd backend
npm init -y
npm install express dotenv pg pg-pool node-cache axios cors jsonwebtoken bcrypt
npm install -D nodemon jest supertest
```

### Step 3: Frontend Initialization
```bash
cd ../frontend
npm create vite@latest . -- --template svelte
npm install
npm install axios ws
```

### Step 4: Docker Setup
- Create `docker-compose.yml` (see Section 6)
- Create `backend/Dockerfile` and `frontend/Dockerfile`
- Run: `docker-compose up -d`

### Step 5: Database Schema
```bash
docker-compose exec postgres psql -U postgres -d trading_platform -f ../schema.sql
```

### Step 6: Start Development
```bash
# Terminal 1
docker-compose up -d

# Terminal 2
cd backend && npm run dev

# Terminal 3
cd frontend && npm run dev
```

---

## 14. RESOURCES & DOCUMENTATION

### Official APIs
- **Yahoo Finance:** https://finance.yahoo.com
- **Financial Modelprep:** https://financialmodelingprep.com
- **SERP API:** https://serpapi.com
- **TradingView Charts:** https://www.tradingview.com/charting-library/
- **Replicate (AI):** https://replicate.com

### Libraries & Tools
- **SvelteKit:** https://kit.svelte.dev
- **Express:** https://expressjs.com
- **PostgreSQL:** https://www.postgresql.org
- **Docker:** https://docs.docker.com

### Inspirations
- Bloomberg Terminal (data density)
- Wall Street Journal (typography, layout)
- Old-school trading floors (retro aesthetic)

---

**Ready to build? Start with Phase 1: Infrastructure and database schema. Each phase builds on the previous, so execute sequentially. Good luck!**
