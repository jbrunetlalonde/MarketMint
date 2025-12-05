# Retro Newspaper Trading Platform - Production Implementation Plan

**Status:** Ready for Development  
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

### Phase 1: Core Infrastructure (Weeks 1-2)

**Deliverables:**
- [ ] Docker Compose setup (PostgreSQL + Node.js + Svelte services)
- [ ] Database schema and initial migrations
- [ ] Express backend skeleton with middleware
- [ ] SvelteKit frontend with basic routing
- [ ] User authentication (JWT) with simple login/register
- [ ] Environment configuration for production

**Key Files to Create:**
```
✓ docker-compose.yml
✓ backend/Dockerfile + backend/package.json
✓ frontend/Dockerfile + frontend/svelte.config.js
✓ Database schema SQL file
✓ Auth routes (backend) + Login page (frontend)
```

---

### Phase 2: Real-time Quote System (Weeks 2-3)

**Deliverables:**
- [ ] Yahoo Finance API integration (with caching)
- [ ] WebSocket connection for live updates
- [ ] Quote cache table + TTL refresh logic
- [ ] Price card component (display price, % change, sparkline)
- [ ] Homepage market overview grid
- [ ] Watchlist add/remove functionality

**Key Files:**
```
✓ backend/services/yahooFinance.js
✓ backend/routes/quotes.js
✓ backend/src/utils/cache.js
✓ frontend/lib/components/PriceCard.svelte
✓ frontend/routes/+page.svelte (homepage)
✓ frontend/lib/stores/quotes.js (reactive store)
```

**API Endpoints:**
```
GET  /api/quotes/:ticker          # Get current quote
GET  /api/quotes/bulk/:tickers    # Get multiple quotes
WS   /ws/quotes/:ticker           # WebSocket live feed
POST /api/watchlist/add           # Add to watchlist
GET  /api/watchlist               # Get user's watchlist
```

---

### Phase 3: Historical Charting (Weeks 3-4)

**Deliverables:**
- [ ] Price history retrieval from Yahoo Finance (5y of data)
- [ ] TradingView Lightweight Charts integration
- [ ] svelte-chart.js wrapper for custom visualizations
- [ ] Stock detail page with OHLC candlestick + volume
- [ ] Technical indicators (SMA, EMA, RSI, MACD)
- [ ] Time-range selector (1D, 1W, 1M, 3M, 1Y, 5Y, ALL)

**Key Files:**
```
✓ backend/services/priceHistory.js (batch load 5y from Yahoo)
✓ backend/routes/charts.js
✓ frontend/lib/components/Chart.svelte
✓ frontend/routes/ticker/[symbol]/+page.svelte
✓ Schema: price_history table populated
```

**Optimization:**
- Pre-cache 5 years of data on first request, then daily updates
- Serve from PostgreSQL (not re-fetching from Yahoo each time)
- Use index on (ticker, date) for fast range queries

---

### Phase 4: Financial Statements & Analysis (Weeks 4-5)

**Deliverables:**
- [ ] Financial Modelprep API integration
- [ ] Income statement, balance sheet, cash flow retrieval
- [ ] Quarterly + annual data display
- [ ] Key metrics dashboard (P/E, ROE, Debt-to-Equity, etc.)
- [ ] Trend visualization (revenue/earnings growth)
- [ ] Valuation multiples comparison

**Key Files:**
```
✓ backend/services/financialModelPrep.js
✓ backend/routes/financials.js
✓ frontend/lib/components/FinancialMetrics.svelte
✓ Schema: financials table populated
```

**Data Refresh Strategy:**
- Pull quarterly financials on app startup
- Cache with 30-day TTL
- Manual refresh button for users

---

### Phase 5: News & Economic Data (Weeks 5-6)

**Deliverables:**
- [ ] SERP API integration for economic news
- [ ] Yahoo Finance news aggregation
- [ ] NewsAPI headlines (backup)
- [ ] News card component with sentiment tagging
- [ ] Market news feed page
- [ ] Newsletter article creation system

**Key Files:**
```
✓ backend/services/serpApi.js
✓ backend/routes/news.js
✓ frontend/lib/components/NewsCard.svelte
✓ frontend/routes/newsletter/+page.svelte
✓ Schema: newsletter_articles table
```

**Scheduling:**
- Cron job: Fetch news every 2 hours (during market hours)
- Cron job: Compile daily newsletter digest at 4:00 PM ET (after market close)

---

### Phase 6: Political Trading Tracker (Weeks 6-7)

**Deliverables:**
- [ ] Scraper for House/Senate trading data (OpenSecrets or Unusual Whales API)
- [ ] AI-generated portrait generation for officials (Replicate API)
- [ ] Political trades table with transaction details
- [ ] Political trading page with filters (by party, official, stock)
- [ ] Alerts for high-value trades in watchlist stocks

**Key Files:**
```
✓ backend/services/politicalTracker.js (scraper)
✓ backend/services/aiImageGen.js (portrait generation)
✓ backend/routes/political.js
✓ frontend/lib/components/PoliticalTradeCard.svelte
✓ frontend/routes/political/+page.svelte
✓ Schema: political_trades table + ai_generated_portrait field
```

**Portrait Generation:**
```javascript
// Example: Call Replicate API for AI portraits
// Store URL in political_trades.ai_generated_portrait
// Batch generate 1x per week for new officials
```

---

### Phase 7: Newsletter System (Weeks 7-8)

**Deliverables:**
- [ ] Automated newsletter generation (trending stocks, news, political trades, charts)
- [ ] HTML email template with retro newspaper styling
- [ ] Email delivery service integration (SendGrid or AWS SES)
- [ ] Newsletter archive page
- [ ] Subscription management (opt-in/out for friends)
- [ ] Trending stocks algorithm (based on volume, P&L change)

**Key Files:**
```
✓ backend/services/newsletter.js (generation logic)
✓ backend/routes/newsletter.js
✓ backend/templates/newsletter.html (email template)
✓ frontend/routes/newsletter/+page.svelte
✓ Cron: Newsletter generation daily at 4:00 PM ET
```

**Content Sections:**
- 📈 **Trending Stocks** - Top gainers/losers, unusual volume
- 📰 **Market News** - Top headlines from SERP API
- 💰 **Economic Calendar** - Key economic events
- 🏛️ **Congress Trades** - Political trading activity
- 📊 **Charts** - Featured stock chart (embedded image)

---

### Phase 8: User Dashboard & Trading Ideas (Weeks 8-9)

**Deliverables:**
- [ ] Trading ideas board (long/short thesis)
- [ ] Entry/target/stop-loss tracking
- [ ] Performance tracking against actual market
- [ ] User dashboard with watchlist, open ideas, P&L
- [ ] Export data (CSV, PDF)

**Key Files:**
```
✓ backend/routes/tradingIdeas.js
✓ frontend/routes/analysis/+page.svelte
✓ frontend/lib/components/TradingIdeaCard.svelte
✓ Schema: trading_ideas table
```

---

### Phase 9: Production Hardening (Weeks 9-10)

**Deliverables:**
- [ ] Rate limiting on API endpoints
- [ ] Error monitoring (Sentry or similar)
- [ ] Database backups & recovery plan
- [ ] SSL/TLS certificates (self-signed for private use)
- [ ] Performance profiling & optimization
- [ ] Security audit (input validation, SQL injection prevention)
- [ ] Load testing (expected user count: you + ~5 friends)

**Key Checklist:**
```
✓ All API endpoints have rate limiting
✓ Sensitive data encrypted (passwords, API keys in .env)
✓ CSRF protection on POST/DELETE routes
✓ Database connection pooling configured
✓ Cache TTLs optimized
✓ Docker containers health checks configured
✓ Logs aggregated and monitored
✓ Database backups automated (daily)
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

### Backend Caching Strategy
```javascript
// In-memory cache with TTL
const Cache = new Map();

function getCached(key, ttl = 300) {
  const entry = Cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data;
  }
  Cache.delete(key);
  return null;
}

function setCached(key, data, ttl = 300) {
  Cache.set(key, {
    data,
    expires: Date.now() + (ttl * 1000)
  });
}

// Usage
const quote = getCached(`quote:${ticker}`, 60) 
  || await yahooFinance.getQuote(ticker);
setCached(`quote:${ticker}`, quote, 60);
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

## 10. FUTURE ENHANCEMENTS (Post-Launch)

- **Machine Learning:** Predictive models for stock trends
- **Options Chain:** Implied volatility, Greeks visualization
- **Backtesting Engine:** Test trading strategies historically
- **Portfolio Analytics:** Individual user portfolio tracking
- **Alerts System:** Price targets, earnings dates, news triggers
- **Dark Mode:** Theme toggle (retro light/dark newspaper)
- **Mobile App:** React Native companion app
- **Community Features:** Private chat, shared watchlists
- **API for Friends:** RESTful API so friends can build tools on top

---

## 11. TIME ESTIMATE & RESOURCE PLANNING

| Phase | Duration | Priority | Effort |
|-------|----------|----------|--------|
| 1. Infrastructure | 2 weeks | P0 | High |
| 2. Real-time Quotes | 1 week | P0 | Medium |
| 3. Historical Charts | 1 week | P0 | Medium |
| 4. Financials | 1 week | P0 | Low |
| 5. News & Data | 1 week | P1 | Low |
| 6. Political Trading | 1 week | P1 | Medium |
| 7. Newsletter | 1 week | P1 | Medium |
| 8. User Dashboard | 1 week | P2 | Low |
| 9. Hardening | 1 week | P0 | High |
| **Total** | **~10 weeks** | — | — |

**Realistic Timeline:** 3-4 months solo with Claude (accounting for testing, refinement, bug fixes)

---

## 12. GETTING STARTED

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

## 13. RESOURCES & DOCUMENTATION

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
