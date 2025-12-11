<h1 align="center">MarketMint vs StockTaper Gap Analysis</h1>

<p align="center">Feature comparison and FMP API utilization plan</p>

---

## Executive Summary

StockTaper provides a comprehensive stock analysis platform with fundamentals-first approach. MarketMint already implements many core features but is missing several high-value data points that are available through the FMP Starter API.

---

## Feature Comparison

### Currently Implemented in MarketMint

| Feature | Status | Notes |
|---------|--------|-------|
| Real-time quotes | Yes | WebSocket + REST |
| Candlestick charts | Yes | With SMA, EMA, BB, RSI, MACD |
| Key statistics | Yes | P/E, EPS, Volume, Market Cap, 52W range |
| Company profile | Yes | Description, sector, industry, CEO |
| Executive team | Partial | Names/titles only, missing compensation |
| Income statement | Yes | Annual and quarterly |
| Balance sheet | Yes | Annual and quarterly |
| Cash flow statement | Yes | Annual and quarterly |
| Analyst ratings | Partial | Score only, missing individual analysts |
| Price targets | Yes | High, low, consensus, median |
| Institutional holders | Partial | Top holders, missing total % |
| Stock splits | Yes | Historical splits |
| Sector peers | Yes | Related stocks |
| Congress trades | Yes | Senate and House |
| Watchlist | Yes | User-specific |
| Stock screener | Yes | Basic filters |

### Missing Features (Available in FMP Starter)

| Feature | FMP Endpoint | Priority | Effort |
|---------|-------------|----------|--------|
| Revenue by product segment | `/revenue-product-segmentation` | High | Medium |
| Individual analyst ratings | `/price-target`, `/analyst-stock-recommendations` | High | Medium |
| Financial quality scores | `/rating` (detailed), `/key-metrics` | High | Low |
| Dividend history/calendar | `/historical-dividends`, `/stock-dividend-calendar` | Medium | Low |
| Earnings history/surprises | `/earnings-surprises` | High | Medium |
| SEC filings (on ticker page) | `/sec_filings` (implemented, not displayed) | Medium | Low |
| Insider trading (on ticker page) | `/insider-trading` (implemented, not displayed) | High | Low |
| Stock news on ticker page | `/stock-news` (implemented, not displayed) | High | Low |
| Total institutional ownership % | Calculate from existing data | Medium | Low |
| More time periods (YTD, 10Y) | Adjust date calculation | Low | Low |
| Sector performance | `/sector-performance` | Medium | Medium |
| Market movers | `/market-biggest-gainers`, `/market-biggest-losers` | Medium | Medium |
| Economic calendar | `/economic-calendar` | Low | Medium |

---

## Detailed Gap Analysis

### 1. Revenue by Product Segment (HIGH PRIORITY)

**StockTaper shows:** Revenue breakdown by iPad, iPhone, Mac, Services, Wearables with quarterly trends

**FMP Endpoint:** `/revenue-product-segmentation?symbol={ticker}`

**Current state:** Backend has `getRevenueSegments()` function implemented but not exposed or displayed

**Action:** Create RevenueSegments.svelte component, add API route, integrate into ticker page

---

### 2. Individual Analyst Ratings (HIGH PRIORITY)

**StockTaper shows:** Individual analyst firms with logos, rating categories (Strong Buy, Buy, etc.), grade trends

**FMP Endpoints:**
- `/price-target?symbol={ticker}` - Returns analyst firm, price target, date
- `/analyst-stock-recommendations?symbol={ticker}` - Buy/Sell/Hold counts
- `/grade?symbol={ticker}` - Historical grades by firm

**Current state:** Only showing aggregate rating score

**Action:**
- Add `getAnalystGrades()` and `getAnalystRecommendations()` to FMP service
- Create AnalystRatings.svelte component with firm breakdown
- Replace simple RatingsRadar with detailed view

---

### 3. Financial Quality Scores (HIGH PRIORITY)

**StockTaper shows:** DCF score, ROE/ROA scores, debt-to-equity, P/E score, P/B score

**FMP Endpoints:**
- `/rating?symbol={ticker}` - Comprehensive ratings breakdown
- `/key-metrics-ttm?symbol={ticker}` - TTM financial metrics

**Current state:** Have DCF, missing score breakdown

**Action:** Create FinancialScorecard.svelte showing multiple quality metrics

---

### 4. Earnings History & Surprises (HIGH PRIORITY)

**StockTaper shows:** EPS estimates vs actuals, earnings calendar

**FMP Endpoints:**
- `/earnings-surprises?symbol={ticker}` - Historical EPS vs estimates
- `/earning_calendar?from={date}&to={date}` - Already implemented

**Current state:** EarningsCalendar exists for market page, not on ticker page

**Action:**
- Add `getEarningsSurprises()` to FMP service
- Create EarningsHistory.svelte component
- Add to ticker page showing last 4-8 quarters

---

### 5. Insider Trading on Ticker Page (HIGH PRIORITY)

**FMP Endpoint:** Already implemented - `getInsiderTradesBySymbol()`

**Current state:** Backend implemented, not displayed on ticker page

**Action:** Create InsiderTrades.svelte component, add to ticker page

---

### 6. Stock News on Ticker Page (HIGH PRIORITY)

**FMP Endpoint:** Already implemented - `getStockNews(ticker)`

**Current state:** Backend implemented, not displayed on ticker page

**Action:** Create TickerNews.svelte component, add to ticker page

---

### 7. Dividend Information (MEDIUM PRIORITY)

**StockTaper shows:** Dividend yield prominently, dividend history

**FMP Endpoint:** Already implemented - `getDividends(ticker)`

**Current state:** Backend implemented, not displayed

**Action:** Create DividendHistory.svelte component, add dividend yield to key stats

---

### 8. SEC Filings on Ticker Page (MEDIUM PRIORITY)

**FMP Endpoint:** Already implemented - `getSecFilings(ticker)`

**Current state:** Backend implemented, not displayed

**Action:** Create SecFilings.svelte component, add to ticker page

---

### 9. Total Institutional Ownership (MEDIUM PRIORITY)

**StockTaper shows:** Total ownership percentage (e.g., 47.27%), total holder count (7,215)

**FMP Endpoint:** `/institutional-holder/{ticker}` returns individual holders

**Current state:** Showing top holders, not totals

**Action:**
- Add summary calculation to InstitutionalOwners component
- Fetch additional data from FMP for totals

---

### 10. Sector Performance (MEDIUM PRIORITY)

**FMP Endpoint:** `/sector-performance`

**Current state:** Not implemented

**Action:** Add to markets page showing sector heatmap or performance bars

---

### 11. Market Movers (MEDIUM PRIORITY)

**FMP Endpoints:**
- `/market-biggest-gainers`
- `/market-biggest-losers`
- `/actives`

**Current state:** Not implemented

**Action:** Add to markets page in dedicated sections

---

## Implementation Priority

### Phase 1 - Quick Wins (Data Already Available)

These features have backend implementation but need frontend components:

1. **Stock News** - Add TickerNews.svelte to ticker page
2. **Insider Trading** - Add InsiderTrades.svelte to ticker page
3. **SEC Filings** - Add SecFilings.svelte to ticker page
4. **Dividend History** - Add DividendHistory.svelte to ticker page
5. **More Time Periods** - Add YTD, 10Y to period selector

### Phase 2 - New Components (Minor Backend Work)

1. **Revenue Segments** - Expose existing function, create component
2. **Earnings Surprises** - Add FMP function, create component
3. **Analyst Grades** - Add FMP functions, enhance ratings display
4. **Financial Scorecard** - Add detailed rating endpoint, create component
5. **Institutional Summary** - Calculate totals, enhance component

### Phase 3 - New Pages/Sections

1. **Sector Performance** - Add to markets page
2. **Market Movers** - Add gainers/losers to markets page
3. **Economic Calendar** - New section on markets page

---

## FMP Starter Plan Limits

**Daily API calls:** 250/day (free tier) or 750/day (starter)

**Recommendations:**
- Aggressive caching (24hr for financials, 1hr for quotes)
- Batch endpoints where possible
- Prioritize user-requested data over background refreshes

---

## Files to Create

| Component | Location | Purpose |
|-----------|----------|---------|
| TickerNews.svelte | src/lib/components/ | Stock-specific news feed |
| InsiderTrades.svelte | src/lib/components/ | Insider trading table |
| SecFilings.svelte | src/lib/components/ | SEC filings list |
| DividendHistory.svelte | src/lib/components/ | Dividend payments and yield |
| RevenueSegments.svelte | src/lib/components/ | Revenue by product breakdown |
| EarningsHistory.svelte | src/lib/components/ | EPS history with surprises |
| AnalystBreakdown.svelte | src/lib/components/ | Individual analyst ratings |
| FinancialScorecard.svelte | src/lib/components/ | Quality metric scores |
| SectorHeatmap.svelte | src/lib/components/ | Sector performance visual |
| MarketMovers.svelte | src/lib/components/ | Gainers/losers tables |

---

## API Routes to Add

| Route | Method | Description |
|-------|--------|-------------|
| /api/financials/:ticker/segments | GET | Revenue by product |
| /api/financials/:ticker/earnings-history | GET | Earnings surprises |
| /api/financials/:ticker/analyst-grades | GET | Analyst ratings breakdown |
| /api/financials/:ticker/rating-details | GET | Detailed financial scores |
| /api/market/sector-performance | GET | Sector performance data |
| /api/market/movers | GET | Gainers, losers, actives |

---

## Checklist

### Phase 1 - Quick Wins
- [ ] Add TickerNews.svelte component
- [ ] Add InsiderTrades.svelte component
- [ ] Add SecFilings.svelte component
- [ ] Add DividendHistory.svelte component
- [ ] Add YTD, 10Y time periods to chart

### Phase 2 - New Components
- [ ] Add RevenueSegments.svelte component
- [ ] Add EarningsHistory.svelte component
- [ ] Create AnalystBreakdown.svelte with firm details
- [ ] Create FinancialScorecard.svelte
- [ ] Enhance InstitutionalOwners with totals

### Phase 3 - Market Enhancements
- [ ] Add SectorHeatmap to markets page
- [ ] Add MarketMovers (gainers/losers) to markets page
- [ ] Add economic calendar section
