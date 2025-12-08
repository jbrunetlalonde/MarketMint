<h1 align="center">FMP API Full Migration Plan</h1>

<p align="center">Migrate MarketMint to use Financial Modeling Prep (FMP) as the exclusive data source</p>

---

## Overview

This plan outlines the complete migration of MarketMint from a multi-source data architecture (Yahoo Finance, Finnhub, Alpha Vantage) to using FMP exclusively for all financial data. The migration includes real-time quotes, historical price data, congress/insider trades, news, and economic indicators.

**API Key:** `7p0h9TVs9mgSRGfY0JfxMam6ygKVJcwn` (Starter Pack)

**Tier Limits:**
- 300 API calls/minute
- 20GB bandwidth/month
- ~100 major securities coverage
- 5 years historical data
- US markets only

---

## Implementation Phases

### Phase 1: Backend Service Consolidation

Remove Yahoo Finance and Finnhub dependencies, consolidate all API calls through the existing `financialModelPrep.js` service.

#### 1.1 Update Environment Configuration

**File:** `backend/src/config/env.js`

```javascript
// Remove these deprecated keys
// yahooApiKey: process.env.YAHOO_API_KEY || '',
// alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
// finnhubApiKey: process.env.FINNHUB_API_KEY || '',

// Keep only FMP
fmpApiKey: process.env.FMP_API_KEY || '',
```

#### 1.2 Enhance FMP Service with Missing Endpoints

**File:** `backend/src/services/financialModelPrep.js`

Add these new methods:

```javascript
// Real-time quote (to replace Yahoo Finance)
async getQuote(ticker) {
  const url = `${BASE_URL}/stable/quote?symbol=${ticker}&apikey=${API_KEY}`;
  // Returns: price, change, changePercentage, volume, marketCap, yearHigh, yearLow
}

// Batch quotes (multiple tickers)
async getBatchQuotes(tickers) {
  const symbols = tickers.join(',');
  const url = `${BASE_URL}/stable/quote?symbol=${symbols}&apikey=${API_KEY}`;
}

// Historical daily OHLCV (for candlestick charts)
async getHistoricalDaily(ticker, from, to) {
  const url = `${BASE_URL}/api/v3/historical-price-full/${ticker}?from=${from}&to=${to}&apikey=${API_KEY}`;
  // Returns: { historical: [{ date, open, high, low, close, volume, adjClose }] }
}

// Intraday data (1min, 5min, 15min, 30min, 1hour, 4hour)
async getIntradayPrices(ticker, interval, from, to) {
  const url = `${BASE_URL}/api/v3/historical-chart/${interval}/${ticker}?from=${from}&to=${to}&apikey=${API_KEY}`;
}

// Senate trades (latest)
async getSenateTradesLatest(page = 0, limit = 100) {
  const url = `${BASE_URL}/stable/senate-latest?page=${page}&limit=${limit}&apikey=${API_KEY}`;
}

// Senate trades by symbol
async getSenateTradesBySymbol(ticker) {
  const url = `${BASE_URL}/stable/senate-trades?symbol=${ticker}&apikey=${API_KEY}`;
}

// House trades (latest)
async getHouseTradesLatest(page = 0, limit = 100) {
  const url = `${BASE_URL}/stable/house-latest?page=${page}&limit=${limit}&apikey=${API_KEY}`;
}

// House trades by symbol
async getHouseTradesBySymbol(ticker) {
  const url = `${BASE_URL}/stable/house-trades?symbol=${ticker}&apikey=${API_KEY}`;
}

// Insider trading (latest)
async getInsiderTradesLatest(page = 0, limit = 100) {
  const url = `${BASE_URL}/stable/insider-trading/latest?page=${page}&limit=${limit}&apikey=${API_KEY}`;
}

// Insider trading by symbol
async getInsiderTradesBySymbol(ticker, page = 0) {
  const url = `${BASE_URL}/api/v4/insider-trading?symbol=${ticker}&page=${page}&apikey=${API_KEY}`;
}

// Stock news
async getStockNews(tickers, limit = 50) {
  const symbols = Array.isArray(tickers) ? tickers.join(',') : tickers;
  const url = `${BASE_URL}/api/v3/stock_news?tickers=${symbols}&limit=${limit}&apikey=${API_KEY}`;
}

// Press releases
async getPressReleases(page = 0, limit = 20) {
  const url = `${BASE_URL}/stable/news/press-releases-latest?page=${page}&limit=${limit}&apikey=${API_KEY}`;
}

// Earnings calendar
async getEarningsCalendar(from, to) {
  const url = `${BASE_URL}/stable/earnings-calendar?from=${from}&to=${to}&apikey=${API_KEY}`;
}

// Economic indicators
async getEconomicIndicator(name, from, to) {
  const url = `${BASE_URL}/stable/economic-indicators?name=${name}&from=${from}&to=${to}&apikey=${API_KEY}`;
}

// Stock screener
async screenStocks(filters) {
  const params = new URLSearchParams(filters);
  params.append('apikey', API_KEY);
  const url = `${BASE_URL}/stable/company-screener?${params.toString()}`;
}

// Technical indicators
async getTechnicalIndicator(ticker, timeframe, type, period) {
  const url = `${BASE_URL}/api/v3/technical_indicator/${timeframe}/${ticker}?type=${type}&period=${period}&apikey=${API_KEY}`;
}

// Symbol search
async searchSymbol(query) {
  const url = `${BASE_URL}/api/v3/search?query=${encodeURIComponent(query)}&limit=20&apikey=${API_KEY}`;
}
```

#### 1.3 Remove Yahoo Finance Service

**Action:** Delete or deprecate `backend/src/services/yahooFinance.js`

**Migration Steps:**
1. Create new `backend/src/services/quotes.js` that wraps FMP quote methods
2. Update all routes that import `yahooFinance.js`
3. Maintain same response contract for frontend compatibility

**New File:** `backend/src/services/quotes.js`

```javascript
import fmp from './financialModelPrep.js';

// Transform FMP quote to match existing frontend contract
function transformQuote(fmpQuote) {
  return {
    symbol: fmpQuote.symbol,
    shortName: fmpQuote.name,
    longName: fmpQuote.name,
    regularMarketPrice: fmpQuote.price,
    regularMarketChange: fmpQuote.change,
    regularMarketChangePercent: fmpQuote.changePercentage,
    regularMarketVolume: fmpQuote.volume,
    regularMarketDayHigh: fmpQuote.dayHigh,
    regularMarketDayLow: fmpQuote.dayLow,
    regularMarketOpen: fmpQuote.open,
    regularMarketPreviousClose: fmpQuote.previousClose,
    fiftyTwoWeekHigh: fmpQuote.yearHigh,
    fiftyTwoWeekLow: fmpQuote.yearLow,
    marketCap: fmpQuote.marketCap,
    priceAvg50: fmpQuote.priceAvg50,
    priceAvg200: fmpQuote.priceAvg200,
    exchange: fmpQuote.exchange,
    timestamp: fmpQuote.timestamp * 1000 // Convert to milliseconds
  };
}

export async function getQuote(ticker) {
  const quote = await fmp.getQuote(ticker);
  return transformQuote(quote);
}

export async function getBulkQuotes(tickers) {
  const quotes = await fmp.getBatchQuotes(tickers);
  return quotes.map(transformQuote);
}
```

#### 1.4 Update Political Tracker Service

**File:** `backend/src/services/politicalTracker.js`

Replace Finnhub congressional trading calls with FMP:

```javascript
import fmp from './financialModelPrep.js';

// Transform FMP senate trade to match existing schema
function transformCongressTrade(trade, chamber) {
  return {
    id: `${chamber}-${trade.symbol}-${trade.transactionDate}-${trade.lastName}`,
    officialName: `${trade.firstName} ${trade.lastName}`,
    ticker: trade.symbol,
    assetDescription: trade.assetDescription,
    transactionType: trade.type === 'Purchase' ? 'BUY' : 'SELL',
    transactionDate: trade.transactionDate,
    reportedDate: trade.disclosureDate,
    amountDisplay: trade.amount,
    party: null, // FMP may not provide party - need to enrich from database
    title: chamber === 'senate' ? 'Senator' : 'Representative',
    state: trade.district,
    chamber: chamber,
    link: trade.link
  };
}

export async function getCongressTrades({ chamber, limit = 100 }) {
  let trades = [];

  if (chamber === 'senate' || !chamber) {
    const senateTrades = await fmp.getSenateTradesLatest(0, limit);
    trades = trades.concat(senateTrades.map(t => transformCongressTrade(t, 'senate')));
  }

  if (chamber === 'house' || !chamber) {
    const houseTrades = await fmp.getHouseTradesLatest(0, limit);
    trades = trades.concat(houseTrades.map(t => transformCongressTrade(t, 'house')));
  }

  // Sort by transaction date descending
  trades.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

  return trades.slice(0, limit);
}

export async function getCongressTradesBySymbol(ticker) {
  const [senateTrades, houseTrades] = await Promise.all([
    fmp.getSenateTradesBySymbol(ticker),
    fmp.getHouseTradesBySymbol(ticker)
  ]);

  const all = [
    ...senateTrades.map(t => transformCongressTrade(t, 'senate')),
    ...houseTrades.map(t => transformCongressTrade(t, 'house'))
  ];

  return all.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
}
```

#### 1.5 Update Insider Tracker Service

**File:** `backend/src/services/insiderTracker.js`

```javascript
import fmp from './financialModelPrep.js';

function transformInsiderTrade(trade) {
  return {
    id: `insider-${trade.symbol}-${trade.transactionDate}-${trade.reportingCik}`,
    ticker: trade.symbol,
    filingDate: trade.filingDate,
    transactionDate: trade.transactionDate,
    reportingName: trade.reportingName,
    typeOfOwner: trade.typeOfOwner,
    transactionType: trade.acquistionOrDisposition === 'A' ? 'BUY' : 'SELL',
    securitiesTransacted: trade.securitiesTransacted,
    securitiesOwned: trade.securitiesOwned,
    price: trade.price,
    securityName: trade.securityName,
    link: trade.link
  };
}

export async function getLatestInsiderTrades(limit = 100) {
  const trades = await fmp.getInsiderTradesLatest(0, limit);
  return trades.map(transformInsiderTrade);
}

export async function getInsiderTradesBySymbol(ticker) {
  const trades = await fmp.getInsiderTradesBySymbol(ticker);
  return trades.map(transformInsiderTrade);
}
```

---

### Phase 2: Route Updates

#### 2.1 Update Quotes Route

**File:** `backend/src/routes/quotes.js`

```javascript
import express from 'express';
import { getQuote, getBulkQuotes } from '../services/quotes.js';
import fmp from '../services/financialModelPrep.js';

const router = express.Router();

// Single quote
router.get('/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const quote = await getQuote(ticker.toUpperCase());
    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
});

// Bulk quotes
router.get('/', async (req, res, next) => {
  try {
    const { tickers } = req.query;
    if (!tickers) {
      return res.status(400).json({ success: false, error: 'tickers query param required' });
    }
    const tickerList = tickers.split(',').slice(0, 50); // Max 50 tickers
    const quotes = await getBulkQuotes(tickerList);
    res.json({ success: true, data: quotes });
  } catch (error) {
    next(error);
  }
});

// Historical prices (for charts)
router.get('/:ticker/history', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { period = '1y', interval = 'daily' } = req.query;

    // Calculate date range based on period
    const to = new Date().toISOString().split('T')[0];
    const from = calculateFromDate(period);

    let data;
    if (interval === 'daily' || period === '1y' || period === '5y') {
      data = await fmp.getHistoricalDaily(ticker.toUpperCase(), from, to);
    } else {
      // Map period to intraday interval
      const intradayInterval = mapPeriodToInterval(period);
      data = await fmp.getIntradayPrices(ticker.toUpperCase(), intradayInterval, from, to);
    }

    res.json({ success: true, data: transformHistoricalData(data) });
  } catch (error) {
    next(error);
  }
});

function calculateFromDate(period) {
  const now = new Date();
  switch (period) {
    case '1d': return new Date(now - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case '5d': return new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case '1m': return new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
    case '3m': return new Date(now.setMonth(now.getMonth() - 3)).toISOString().split('T')[0];
    case '6m': return new Date(now.setMonth(now.getMonth() - 6)).toISOString().split('T')[0];
    case '1y': return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
    case '5y': return new Date(now.setFullYear(now.getFullYear() - 5)).toISOString().split('T')[0];
    default: return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
  }
}

function mapPeriodToInterval(period) {
  switch (period) {
    case '1d': return '5min';
    case '5d': return '15min';
    case '1m': return '1hour';
    default: return '1hour';
  }
}

export default router;
```

#### 2.2 Update Political Route

**File:** `backend/src/routes/political.js`

```javascript
import express from 'express';
import { getCongressTrades, getCongressTradesBySymbol } from '../services/politicalTracker.js';
import { getLatestInsiderTrades, getInsiderTradesBySymbol } from '../services/insiderTracker.js';

const router = express.Router();

// Congress trades
router.get('/trades', async (req, res, next) => {
  try {
    const { chamber, limit = 100 } = req.query;
    const trades = await getCongressTrades({
      chamber: chamber || null,
      limit: parseInt(limit, 10)
    });
    res.json({ success: true, data: trades });
  } catch (error) {
    next(error);
  }
});

// Congress trades by ticker
router.get('/trades/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const trades = await getCongressTradesBySymbol(ticker.toUpperCase());
    res.json({ success: true, data: trades });
  } catch (error) {
    next(error);
  }
});

// Insider trades (latest)
router.get('/insider', async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    const trades = await getLatestInsiderTrades(parseInt(limit, 10));
    res.json({ success: true, data: trades });
  } catch (error) {
    next(error);
  }
});

// Insider trades by ticker
router.get('/insider/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const trades = await getInsiderTradesBySymbol(ticker.toUpperCase());
    res.json({ success: true, data: trades });
  } catch (error) {
    next(error);
  }
});

export default router;
```

#### 2.3 Add News Route (if not exists)

**File:** `backend/src/routes/news.js`

```javascript
import express from 'express';
import fmp from '../services/financialModelPrep.js';

const router = express.Router();

// Stock news by ticker(s)
router.get('/', async (req, res, next) => {
  try {
    const { tickers, limit = 20 } = req.query;
    if (!tickers) {
      return res.status(400).json({ success: false, error: 'tickers query param required' });
    }
    const news = await fmp.getStockNews(tickers, parseInt(limit, 10));
    res.json({ success: true, data: news });
  } catch (error) {
    next(error);
  }
});

// Press releases
router.get('/press-releases', async (req, res, next) => {
  try {
    const { page = 0, limit = 20 } = req.query;
    const releases = await fmp.getPressReleases(parseInt(page, 10), parseInt(limit, 10));
    res.json({ success: true, data: releases });
  } catch (error) {
    next(error);
  }
});

export default router;
```

---

### Phase 3: Frontend API Client Updates

#### 3.1 Update API Client

**File:** `src/lib/utils/api/quotes.ts`

No changes needed if backend maintains same response contract.

#### 3.2 Update Political API Client

**File:** `src/lib/utils/api/political.ts` (create if not exists)

```typescript
import { request } from './request';

export interface PoliticalTrade {
  id: string;
  officialName: string;
  ticker: string;
  assetDescription?: string | null;
  transactionType: 'BUY' | 'SELL';
  transactionDate: string;
  reportedDate: string;
  amountDisplay: string;
  party?: string | null;
  title?: string | null;
  state?: string | null;
  chamber?: string | null;
  link?: string | null;
}

export async function getPoliticalTrades(params?: {
  chamber?: 'senate' | 'house';
  limit?: number;
}): Promise<{ success: boolean; data: PoliticalTrade[] }> {
  const queryParams = new URLSearchParams();
  if (params?.chamber) queryParams.set('chamber', params.chamber);
  if (params?.limit) queryParams.set('limit', String(params.limit));

  return request(`/api/political/trades?${queryParams.toString()}`);
}

export async function getPoliticalTradesByTicker(ticker: string): Promise<{ success: boolean; data: PoliticalTrade[] }> {
  return request(`/api/political/trades/${ticker}`);
}
```

---

### Phase 4: New Features Enabled by FMP

#### 4.1 Stock Screener Page

**New Route:** `src/routes/screener/+page.svelte`

```svelte
<script lang="ts">
  import api from '$lib/utils/api';

  let filters = $state({
    marketCapMoreThan: 10000000000,
    sector: 'Technology',
    isActivelyTrading: true,
    limit: 50
  });

  let results = $state<any[]>([]);
  let loading = $state(false);

  async function runScreener() {
    loading = true;
    try {
      const response = await api.screenStocks(filters);
      if (response.success) {
        results = response.data;
      }
    } finally {
      loading = false;
    }
  }
</script>

<div class="newspaper-grid">
  <section class="col-span-full">
    <h1 class="headline headline-xl">Stock Screener</h1>
  </section>

  <!-- Filter Controls -->
  <section class="col-span-4">
    <div class="card">
      <h2 class="headline headline-md mb-4">Filters</h2>

      <div class="space-y-4">
        <div>
          <label class="byline block mb-1">Min Market Cap</label>
          <select bind:value={filters.marketCapMoreThan} class="input w-full">
            <option value={1000000000}>$1B+</option>
            <option value={10000000000}>$10B+</option>
            <option value={100000000000}>$100B+</option>
          </select>
        </div>

        <div>
          <label class="byline block mb-1">Sector</label>
          <select bind:value={filters.sector} class="input w-full">
            <option value="">All Sectors</option>
            <option value="Technology">Technology</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Financial Services">Financial Services</option>
            <option value="Consumer Cyclical">Consumer Cyclical</option>
            <option value="Communication Services">Communication Services</option>
            <option value="Industrials">Industrials</option>
            <option value="Consumer Defensive">Consumer Defensive</option>
            <option value="Energy">Energy</option>
            <option value="Utilities">Utilities</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Basic Materials">Basic Materials</option>
          </select>
        </div>

        <button onclick={runScreener} class="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Screening...' : 'Run Screener'}
        </button>
      </div>
    </div>
  </section>

  <!-- Results -->
  <section class="col-span-8">
    {#if results.length > 0}
      <div class="card overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Company</th>
              <th>Price</th>
              <th>Market Cap</th>
              <th>Sector</th>
            </tr>
          </thead>
          <tbody>
            {#each results as stock (stock.symbol)}
              <tr>
                <td>
                  <a href="/ticker/{stock.symbol}" class="ticker-symbol">{stock.symbol}</a>
                </td>
                <td>{stock.companyName}</td>
                <td>${stock.price?.toFixed(2)}</td>
                <td>${(stock.marketCap / 1e9).toFixed(1)}B</td>
                <td>{stock.sector}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="card text-center py-8">
        <p class="text-ink-muted">Run the screener to see results</p>
      </div>
    {/if}
  </section>
</div>
```

#### 4.2 Enhanced Economic Indicators Dashboard

**Update:** `src/routes/economic/+page.svelte`

Add FMP economic indicators alongside FRED data:

```svelte
<!-- Economic indicators from FMP -->
{#each economicIndicators as indicator}
  <div class="card">
    <h3 class="headline headline-sm">{indicator.name}</h3>
    <p class="text-2xl font-bold">{indicator.value}</p>
    <p class="text-xs text-ink-muted">{formatDate(indicator.date)}</p>
  </div>
{/each}
```

#### 4.3 SEC Filings Component

**New Component:** `src/lib/components/SECFilings.svelte`

```svelte
<script lang="ts">
  import { formatDate } from '$lib/utils/formatters';
  import api from '$lib/utils/api';

  let { ticker }: { ticker: string } = $props();
  let filings = $state<any[]>([]);
  let loading = $state(true);

  $effect(() => {
    loadFilings();
  });

  async function loadFilings() {
    loading = true;
    try {
      const response = await api.getSecFilings(ticker);
      if (response.success) {
        filings = response.data.slice(0, 10);
      }
    } finally {
      loading = false;
    }
  }
</script>

<div class="card">
  <h2 class="headline headline-md mb-4">SEC Filings</h2>

  {#if loading}
    <p class="text-ink-muted">Loading filings...</p>
  {:else if filings.length === 0}
    <p class="text-ink-muted">No recent filings</p>
  {:else}
    <div class="space-y-2">
      {#each filings as filing}
        <a
          href={filing.link}
          target="_blank"
          rel="noopener noreferrer"
          class="block p-3 border border-ink-light hover:bg-newsprint-dark transition-colors"
        >
          <div class="flex justify-between items-start">
            <div>
              <span class="badge">{filing.formType}</span>
              <p class="text-sm mt-1">{filing.description || filing.formType}</p>
            </div>
            <span class="text-xs text-ink-muted">{formatDate(filing.filingDate)}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
```

---

### Phase 5: Navigation & UI Updates

#### 5.1 Add Screener to Navigation

**File:** `src/routes/+layout.svelte`

Update `navLinks`:

```javascript
const navLinks = [
  { href: '/markets', label: 'Markets' },
  { href: '/screener', label: 'Screener' },  // NEW
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/political', label: 'Congress Trades' }
];
```

#### 5.2 Update Ticker Page with New Data

**File:** `src/routes/ticker/[symbol]/+page.svelte`

Add SEC Filings component:

```svelte
<script>
  import SECFilings from '$lib/components/SECFilings.svelte';
</script>

<!-- In the page layout -->
<section class="col-span-4">
  <SECFilings ticker={symbol} />
</section>
```

---

### Phase 6: Cleanup & Removal

#### 6.1 Files to Delete

```
backend/src/services/yahooFinance.js       # Replace with FMP-based quotes.js
backend/src/services/alphaVantage.js       # If exists, remove
```

#### 6.2 Files to Update (Remove Yahoo/Finnhub References)

```
backend/src/services/priceHistory.js       # Use FMP historical endpoints
backend/src/services/newsAggregator.js     # Use FMP news
backend/src/services/scheduler.js          # Update scheduled jobs
backend/src/routes/quotes.js               # Already updated in Phase 2
backend/src/routes/political.js            # Already updated in Phase 2
backend/src/config/env.js                  # Remove deprecated API keys
```

#### 6.3 Database Cache Cleanup

Run migration to clear old cache data:

```sql
-- Clear Yahoo Finance cache entries
DELETE FROM quote_cache WHERE source = 'yahoo';

-- Clear Finnhub political trades cache
DELETE FROM political_trades WHERE source = 'finnhub';

-- Update schema to remove source column if no longer needed
-- ALTER TABLE quote_cache DROP COLUMN source;
```

---

### Phase 7: Rate Limiting & Caching Strategy

#### 7.1 Implement Request Queue

**File:** `backend/src/services/fmpRequestQueue.js`

```javascript
import PQueue from 'p-queue';

// 300 requests per minute = 5 requests per second
const queue = new PQueue({
  concurrency: 5,
  interval: 1000,
  intervalCap: 5
});

export async function queuedFetch(url, options = {}) {
  return queue.add(async () => {
    const response = await fetch(url, options);

    if (response.status === 429) {
      // Rate limited - wait and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetch(url, options);
    }

    return response;
  });
}

export function getQueueStats() {
  return {
    pending: queue.pending,
    size: queue.size
  };
}
```

#### 7.2 Update FMP Service to Use Queue

```javascript
import { queuedFetch } from './fmpRequestQueue.js';

async function fetchFMP(endpoint) {
  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${API_KEY}`;

  const response = await queuedFetch(url);

  if (!response.ok) {
    throw new ApiError(`FMP API error: ${response.status}`, response.status);
  }

  return response.json();
}
```

#### 7.3 Cache TTL Configuration

**File:** `backend/src/config/env.js`

```javascript
cacheTTL: {
  quote: 60,              // 1 minute - real-time data
  priceHistory: 3600,     // 1 hour - daily charts
  intradayHistory: 300,   // 5 minutes - intraday charts
  financials: 604800,     // 7 days - quarterly statements
  news: 1800,             // 30 minutes
  profile: 2592000,       // 30 days
  executives: 2592000,    // 30 days
  congressTrades: 3600,   // 1 hour
  insiderTrades: 3600,    // 1 hour
  secFilings: 86400,      // 24 hours
  earningsCalendar: 21600,// 6 hours
  economic: 86400,        // 24 hours
  screener: 3600          // 1 hour
}
```

---

## Technical Considerations

### Rate Limit Management

| Scenario | Mitigation |
|----------|------------|
| 300 calls/min exceeded | Request queue with backoff |
| Bulk operations | Batch tickers in single request |
| Real-time updates | WebSocket instead of polling |
| Multiple users | Shared cache layer |

### Data Gaps & Workarounds

| Missing Data | Workaround |
|--------------|------------|
| EPS in quote | Fetch from profile or key-metrics endpoint |
| Dividend yield | Fetch from profile endpoint |
| Party affiliation | Maintain local database of officials |
| News images | Use placeholder if not provided |

### Error Handling

```javascript
// Standard error handling pattern
async function safeFmpCall(fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    if (error.status === 429) {
      console.warn('FMP rate limited, returning cached data');
      return fallback;
    }
    if (error.status === 403) {
      console.error('FMP endpoint requires higher tier');
      return fallback;
    }
    throw error;
  }
}
```

---

## Files Affected Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `backend/src/config/env.js` | Modify | Remove deprecated API keys |
| `backend/src/services/financialModelPrep.js` | Modify | Add new FMP endpoints |
| `backend/src/services/quotes.js` | Create | New quote service wrapping FMP |
| `backend/src/services/politicalTracker.js` | Modify | Replace Finnhub with FMP |
| `backend/src/services/insiderTracker.js` | Modify | Update to use FMP endpoints |
| `backend/src/services/fmpRequestQueue.js` | Create | Rate limiting queue |
| `backend/src/services/yahooFinance.js` | Delete | No longer needed |
| `backend/src/routes/quotes.js` | Modify | Use new quotes service |
| `backend/src/routes/political.js` | Modify | Use updated political tracker |
| `backend/src/routes/news.js` | Create | New news endpoint |
| `src/routes/screener/+page.svelte` | Create | New stock screener page |
| `src/routes/+layout.svelte` | Modify | Add screener to navigation |
| `src/lib/components/SECFilings.svelte` | Create | SEC filings component |
| `src/lib/utils/api/political.ts` | Create/Modify | Political trades API client |
| `src/lib/utils/api/index.ts` | Modify | Export new API methods |

---

## Implementation Checklist

### Phase 1: Backend Service Consolidation
- [ ] Update `env.js` to remove deprecated API key references
- [ ] Add new FMP endpoints to `financialModelPrep.js`
- [ ] Create `quotes.js` service wrapper
- [ ] Update `politicalTracker.js` to use FMP
- [ ] Update `insiderTracker.js` to use FMP
- [ ] Create `fmpRequestQueue.js` for rate limiting

### Phase 2: Route Updates
- [ ] Update `quotes.js` route
- [ ] Update `political.js` route
- [ ] Create `news.js` route

### Phase 3: Frontend Updates
- [ ] Verify API client compatibility
- [ ] Update TypeScript types if needed
- [ ] Test quote display components

### Phase 4: New Features
- [ ] Create stock screener page
- [ ] Create SEC filings component
- [ ] Enhance economic dashboard

### Phase 5: Navigation & UI
- [ ] Add screener to navigation
- [ ] Integrate SEC filings on ticker page
- [ ] Test all new UI components

### Phase 6: Cleanup
- [ ] Delete deprecated service files
- [ ] Remove old API references
- [ ] Run database cache cleanup

### Phase 7: Testing & Validation
- [ ] Test all quote endpoints
- [ ] Test congress/insider trades
- [ ] Test news functionality
- [ ] Test stock screener
- [ ] Verify rate limiting works
- [ ] Load test with multiple users

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Rate limit exhaustion | High | Critical | Request queue, aggressive caching |
| Missing data fields | Medium | Medium | Fallback values, hide missing fields |
| API downtime | Low | High | Cache fallback, error states |
| Data format changes | Low | Medium | Schema validation, transformers |

---

## Success Metrics

- [ ] All quotes load from FMP within 200ms (cached) / 500ms (uncached)
- [ ] Congress trades display correctly with all fields populated
- [ ] No Yahoo Finance or Finnhub references remain in codebase
- [ ] Rate limit stays below 80% of 300 calls/min under normal load
- [ ] Cache hit rate > 80% for repeat requests

---

**Document Version:** 1.0
**Created:** December 7, 2025
**Last Updated:** December 7, 2025
