<h1 align="center">Financial Modeling Prep API Research</h1>

<p align="center">Comprehensive guide to FMP API endpoints, rate limits, and best practices for 2025</p>

---

## Overview

This document provides a complete reference for the Financial Modeling Prep (FMP) API, focusing on the **Starter Pack tier** capabilities, endpoints, rate limits, and caching strategies for the MarketMint platform.

**Research Date:** December 7, 2025
**API Documentation:** https://site.financialmodelingprep.com/developer/docs
**Pricing:** https://site.financialmodelingprep.com/pricing-plans

---

## Pricing Tiers Comparison

### Starter Tier ($22/month)

| Feature | Limitation |
|---------|-----------|
| **Rate Limit** | 300 API calls per minute |
| **Bandwidth** | 20GB trailing 30-day limit |
| **Historical Data** | Up to 5 years |
| **Geographic Coverage** | US markets only |
| **Symbol Coverage** | ~100 major securities (AAPL, TSLA, AMZN, etc.) |
| **Real-time Data** | Limited to sample securities |

### Premium Tier ($50/month)

| Feature | Capability |
|---------|-----------|
| **Bandwidth** | 50GB trailing 30-day limit |
| **Historical Data** | Up to 30+ years |
| **Geographic Coverage** | Global (46 countries) |
| **Securities** | 70,000+ securities |

### Free Tier

| Feature | Limitation |
|---------|-----------|
| **Daily Requests** | 250 API calls per day |
| **Bandwidth** | 500MB trailing 30-day limit |
| **Historical Data** | Up to 5 years (annual statements only) |

---

## Rate Limits & Best Practices

### Rate Limit Structure

```typescript
// Starter Tier Rate Limits
const RATE_LIMITS = {
  callsPerMinute: 300,
  bandwidthLimit: '20GB', // trailing 30 days
  historicalYears: 5
};
```

### Error Handling

When you exceed rate limits:
- API key stops working until usage is back within limits
- HTTP 429 (Too Many Requests) response
- Wait for limit reset or upgrade plan

### Recommended Caching Strategy

Based on data volatility and API limits:

```typescript
const CACHE_TTL = {
  // Real-time data
  quotes: 60,                    // 60 seconds
  aftermarketQuotes: 60,         // 60 seconds

  // Intraday data
  priceHistory1min: 300,         // 5 minutes
  priceHistory15min: 900,        // 15 minutes
  priceHistory1hour: 3600,       // 1 hour

  // Daily data
  dailyPrices: 3600,             // 1 hour
  technicalIndicators: 3600,     // 1 hour

  // Fundamental data
  financialStatements: 86400,    // 24 hours
  incomeStatement: 86400,        // 24 hours
  balanceSheet: 86400,           // 24 hours
  cashFlow: 86400,               // 24 hours

  // Reference data
  companyProfile: 604800,        // 7 days
  institutionalHolders: 604800,  // 7 days
  sectorPerformance: 3600,       // 1 hour

  // Political/Regulatory
  congressTrades: 3600,          // 1 hour
  senateTrades: 3600,            // 1 hour
  insiderTrades: 3600,           // 1 hour
  secFilings: 86400,             // 24 hours

  // News & Events
  news: 1800,                    // 30 minutes
  pressReleases: 3600,           // 1 hour
  earningsCalendar: 21600,       // 6 hours

  // Economic data
  economicIndicators: 86400      // 24 hours
};
```

### Request Batching

```typescript
// Good: Batch multiple symbols in one request
GET /stable/quote?symbol=AAPL,MSFT,GOOGL

// Avoid: Multiple individual requests
GET /stable/quote?symbol=AAPL
GET /stable/quote?symbol=MSFT
GET /stable/quote?symbol=GOOGL
```

### Exponential Backoff

```typescript
async function fetchWithBackoff(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
}
```

---

## API Endpoints by Category

### 1. Stock Quotes & Real-Time Data

#### Get Stock Quote

```http
GET https://financialmodelingprep.com/stable/quote?symbol={symbol}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "price": 232.8,
  "changePercentage": 2.1008,
  "change": 4.79,
  "volume": 44489128,
  "dayLow": 226.65,
  "dayHigh": 233.13,
  "yearHigh": 260.1,
  "yearLow": 164.08,
  "marketCap": 3500823120000,
  "priceAvg50": 240.2278,
  "priceAvg200": 219.98755,
  "exchange": "NASDAQ",
  "open": 227.2,
  "previousClose": 228.01,
  "timestamp": 1738702801
}
```

**Cache TTL:** 60 seconds

#### Batch Quote (Multiple Symbols)

```http
GET https://financialmodelingprep.com/stable/batch-exchange-quote?exchange=NASDAQ&short=true
```

**Cache TTL:** 60 seconds

#### Aftermarket Data

```http
GET /api/aftermarket/trade
GET /api/aftermarket/quote
```

**Cache TTL:** 60 seconds

---

### 2. Historical Price Data

#### Daily Historical Prices

```http
GET https://financialmodelingprep.com/api/v3/historical-price-full/{symbol}?from={YYYY-MM-DD}&to={YYYY-MM-DD}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "historical": [
    {
      "date": "2023-10-26",
      "open": 166.89,
      "high": 169.05,
      "low": 165.72,
      "close": 166.89,
      "adjClose": 166.89,
      "volume": 50000000,
      "unadjustedVolume": 50000000,
      "change": -3.45,
      "changePercent": -0.0203,
      "vwap": 167.45
    }
  ]
}
```

**Cache TTL:** 1 hour
**Starter Limit:** 5 years of historical data

#### Intraday Historical Prices

```http
GET https://financialmodelingprep.com/api/v3/historical-chart/{interval}/{symbol}?from={YYYY-MM-DD}&to={YYYY-MM-DD}&extended=true
```

**Intervals:** 1min, 5min, 15min, 30min, 1hour, 4hour

**Note:** For 15-minute intervals, maximum ~2 months per request. Requires multiple calls for longer periods.

**Cache TTL:**
- 1min: 5 minutes
- 15min: 15 minutes
- 1hour: 1 hour

---

### 3. Financial Statements

#### Income Statement

```http
GET https://financialmodelingprep.com/api/v3/income-statement/{symbol}?period=annual&limit=5
```

**Parameters:**
- `period`: `annual` | `quarter`
- `limit`: Number of periods to return

**Response:**
```json
[
  {
    "date": "2023-12-31",
    "symbol": "AAPL",
    "reportedCurrency": "USD",
    "cik": "0000320193",
    "fillingDate": "2024-02-01",
    "calendarYear": "2023",
    "period": "FY",
    "revenue": 383286000000,
    "costOfRevenue": 214143000000,
    "grossProfit": 169143000000,
    "operatingIncome": 114342000000,
    "interestExpense": 3886000000,
    "depreciationAndAmortization": 23170000000,
    "ebitda": 138073000000,
    "netIncome": 95131000000
  }
]
```

**Cache TTL:** 24 hours

#### Balance Sheet

```http
GET https://financialmodelingprep.com/api/v3/balance-sheet-statement/{symbol}?period=annual&limit=5
```

**Cache TTL:** 24 hours

#### Cash Flow Statement

```http
GET https://financialmodelingprep.com/api/v3/cash-flow-statement/{symbol}?period=annual&limit=5
```

**Response includes:**
- Operating cash flow
- Investing cash flow
- Financing cash flow
- Free cash flow
- Capital expenditure

**Cache TTL:** 24 hours

#### Full Financial Statements (Combined)

```http
GET https://financialmodelingprep.com/api/v3/financial-statements/{symbol}?period=annual
```

Returns all three statements in one response.

**Cache TTL:** 24 hours

---

### 4. Company Information

#### Company Profile

```http
GET https://financialmodelingprep.com/api/v3/profile/{symbol}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "companyName": "Apple Inc.",
  "currency": "USD",
  "cik": "0000320193",
  "isin": "US0378331005",
  "exchange": "NASDAQ",
  "industry": "Consumer Electronics",
  "sector": "Technology",
  "country": "US",
  "ceo": "Timothy D. Cook",
  "website": "https://www.apple.com",
  "description": "Apple Inc. designs, manufactures...",
  "ipoDate": "1980-12-12",
  "fullTimeEmployees": 161000,
  "address": "One Apple Park Way",
  "city": "Cupertino",
  "state": "CA",
  "zip": "95014",
  "phone": "14089961010"
}
```

**Cache TTL:** 7 days

#### Executive Information

```http
GET https://financialmodelingprep.com/api/v3/key-executives/{symbol}
```

**Cache TTL:** 7 days

---

### 5. Congress & Senate Trading

#### Latest Senate Financial Disclosures

```http
GET https://financialmodelingprep.com/stable/senate-latest?page=0&limit=100
```

**Response:**
```json
[
  {
    "symbol": "LRN",
    "disclosureDate": "2025-01-31",
    "transactionDate": "2025-01-02",
    "firstName": "Markwayne",
    "lastName": "Mullin",
    "office": "Markwayne Mullin",
    "district": "OK",
    "owner": "Self",
    "assetDescription": "Stride Inc",
    "assetType": "Stock",
    "type": "Purchase",
    "amount": "$15,001 - $50,000",
    "comment": "",
    "link": "https://efdsearch.senate.gov/search/view/ptr/..."
  }
]
```

**Pagination:** Max 250 records per request
**Cache TTL:** 1 hour

#### Senate Trading Activity (By Symbol)

```http
GET https://financialmodelingprep.com/stable/senate-trades?symbol=AAPL
```

**Response includes:**
- Senator name and office
- Transaction date and disclosure date
- Transaction type (Purchase/Sale)
- Amount range
- Capital gains indicator

**Cache TTL:** 1 hour

#### Latest House Financial Disclosures

```http
GET https://financialmodelingprep.com/stable/house-latest?page=0&limit=100
```

**Cache TTL:** 1 hour

#### House Trading Activity (By Symbol)

```http
GET https://financialmodelingprep.com/stable/house-trades?symbol=AAPL
```

**Cache TTL:** 1 hour

---

### 6. Insider Trading

#### Latest Insider Trading

```http
GET https://financialmodelingprep.com/stable/insider-trading/latest?page=0&limit=100
```

**Cache TTL:** 1 hour

#### Search Insider Trades

```http
GET https://financialmodelingprep.com/api/v4/insider-trading?symbol=AAPL&page=0
```

**Response:**
```json
[
  {
    "symbol": "AAPL",
    "filingDate": "2022-10-04 22:05:07",
    "transactionDate": "2022-10-03",
    "reportingCik": "0001767094",
    "transactionType": "S-Sale",
    "securitiesOwned": 270196,
    "securitiesTransacted": 42393,
    "companyCik": "0000320193",
    "reportingName": "O'BRIEN DEIRDRE",
    "typeOfOwner": "officer: Senior Vice President",
    "link": "https://www.sec.gov/Archives/edgar/data/...",
    "securityName": "Common Stock",
    "price": 141.09,
    "formType": "4",
    "acquistionOrDisposition": "D"
  }
]
```

**Cache TTL:** 1 hour

---

### 7. Institutional Ownership & ETF Holdings

#### Institutional Holders

```http
GET https://financialmodelingprep.com/api/v3/institutional-holder/{symbol}
```

**Response:**
```json
[
  {
    "holder": "Vanguard Group Inc",
    "shares": 13944000,
    "dateReported": "2022-12-31",
    "change": 2286000
  }
]
```

**Cache TTL:** 7 days

#### ETF Holdings (Historical)

```http
GET https://financialmodelingprep.com/stable/etf/holdings?date=2023-10-27&symbol=SPY
```

**Cache TTL:** 7 days

#### ETF Holdings Bulk

```http
GET https://financialmodelingprep.com/stable/etf-holder-bulk
```

**Cache TTL:** 7 days

---

### 8. SEC Filings

#### Latest SEC Filings

```http
GET https://financialmodelingprep.com/stable/sec-filings-financials?from=2024-01-01&to=2024-03-01&page=0&limit=100
```

**Parameters:**
- Max 90-day date range
- Max 1000 records per request
- Page maxed at 100

**Response:**
```json
[
  {
    "symbol": "MTZ",
    "cik": "0000015615",
    "filingDate": "2024-03-01 00:00:00",
    "acceptedDate": "2024-02-29 21:24:32",
    "formType": "8-K",
    "hasFinancials": true,
    "link": "https://www.sec.gov/Archives/edgar/data/...",
    "finalLink": "https://www.sec.gov/Archives/edgar/data/..."
  }
]
```

**Cache TTL:** 24 hours

#### Search SEC Filings by Symbol

```http
GET https://financialmodelingprep.com/stable/sec-filings-search/symbol?symbol=AAPL&from=2024-01-01&to=2024-12-31&page=0&limit=100
```

**Cache TTL:** 24 hours

#### Search SEC Filings by Company Name

```http
GET https://financialmodelingprep.com/stable/sec-filings-company-search/name?company=Berkshire
```

**Cache TTL:** 24 hours

---

### 9. Earnings & News

#### Earnings Calendar

```http
GET https://financialmodelingprep.com/stable/earnings-calendar?from=2023-11-01&to=2023-11-07
```

**Parameters:**
- Max 90-day date range
- Max 4000 records per request

**Response:**
```json
[
  {
    "symbol": "KEC.NS",
    "date": "2024-11-04",
    "epsActual": 3.32,
    "epsEstimated": 4.97,
    "revenueActual": 51133100000,
    "revenueEstimated": 44687400000,
    "lastUpdated": "2024-12-08"
  }
]
```

**Cache TTL:** 6 hours

#### Press Releases

```http
GET https://financialmodelingprep.com/stable/news/press-releases-latest?page=0&limit=20
```

**Response:**
```json
[
  {
    "symbol": "AAPL",
    "cik": "0000320193",
    "title": "Apple Announces Third Quarter Results",
    "pressReleaseDate": "2023-07-27",
    "url": "https://example.com/press-release"
  }
]
```

**Cache TTL:** 1 hour

#### Stock News

```http
GET https://financialmodelingprep.com/api/v3/stock_news?tickers=AAPL,MSFT&limit=50
```

**Cache TTL:** 30 minutes

---

### 10. Economic Indicators

#### Get Economic Indicator

```http
GET https://financialmodelingprep.com/stable/economic-indicators?name=GDP&from=2024-10-20&to=2025-10-20
```

**Available Indicators:**
- GDP
- unemploymentRate
- CPI (Consumer Price Index)
- inflation
- federalFundsRate
- treasuryYield
- retailSales
- industrialProduction
- housingStarts
- PCE (Personal Consumption Expenditures)
- consumerSentiment
- consumerConfidence

**Response:**
```json
[
  {
    "name": "GDP",
    "date": "2024-01-01",
    "value": 28624.069
  }
]
```

**Parameters:**
- Max 90-day date range

**Cache TTL:** 24 hours

#### Economic Calendar

```http
GET https://financialmodelingprep.com/api/v3/economic_calendar?from=2023-08-10&to=2023-10-10
```

**Response:**
```json
[
  {
    "date": "2023-10-11 03:35:00",
    "country": "JP",
    "event": "5-Year JGB Auction",
    "currency": "JPY",
    "previous": 0.291,
    "estimate": null,
    "actual": 0.33,
    "change": 0.039,
    "impact": "Low",
    "changePercentage": 13.402,
    "unit": "%"
  }
]
```

**Cache TTL:** 24 hours

**Note:** Economic calendar requires Premium or Ultimate plan

---

### 11. Stock Screener

#### Company Screener

```http
GET https://financialmodelingprep.com/stable/company-screener?marketCapMoreThan=10000000000&sector=Technology&isActivelyTrading=true&limit=100
```

**Available Filters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketCapMoreThan` | number | Min market cap |
| `marketCapLowerThan` | number | Max market cap |
| `priceMoreThan` | number | Min stock price |
| `priceLowerThan` | number | Max stock price |
| `betaMoreThan` | number | Min beta |
| `betaLowerThan` | number | Max beta |
| `volumeMoreThan` | number | Min trading volume |
| `volumeLowerThan` | number | Max trading volume |
| `dividendMoreThan` | number | Min dividend yield |
| `dividendLowerThan` | number | Max dividend yield |
| `sector` | string | Filter by sector |
| `industry` | string | Filter by industry |
| `exchange` | string | Filter by exchange |
| `country` | string | Filter by country |
| `isEtf` | boolean | Include/exclude ETFs |
| `isFund` | boolean | Include/exclude funds |
| `isActivelyTrading` | boolean | Only actively trading |
| `limit` | number | Max results |

**Response:**
```json
[
  {
    "symbol": "AAPL",
    "companyName": "Apple Inc.",
    "marketCap": 3435062313000,
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "beta": 1.24,
    "price": 225.93,
    "lastAnnualDividend": 1,
    "volume": 43010091,
    "exchange": "NASDAQ Global Select",
    "exchangeShortName": "NASDAQ",
    "country": "US",
    "isEtf": false,
    "isFund": false,
    "isActivelyTrading": true
  }
]
```

**Cache TTL:** 1 hour

---

### 12. Technical Indicators

**Available Indicators:**
- Simple Moving Average (SMA)
- Exponential Moving Average (EMA)
- Weighted Moving Average (WMA)
- Double Exponential Moving Average (DEMA)
- Triple Exponential Moving Average (TEMA)
- Relative Strength Index (RSI)
- Standard Deviation
- Williams %R
- Average Directional Index (ADX)

**Endpoint Pattern:**
```http
GET https://financialmodelingprep.com/api/v3/technical_indicator/{timeframe}/{symbol}?type={indicator}&period={period}
```

**Cache TTL:** 1 hour

---

### 13. WebSocket API (Real-Time)

```javascript
const ws = new WebSocket('wss://websockets.financialmodelingprep.com');

// Login
ws.send(JSON.stringify({
  event: 'login',
  data: { apiKey: 'YOUR_API_KEY' }
}));

// Subscribe to ticker
ws.send(JSON.stringify({
  event: 'subscribe',
  data: { ticker: 'aapl' }
}));

// Subscribe to multiple tickers
ws.send(JSON.stringify({
  event: 'subscribe',
  data: { ticker: ['aapl', 'msft'] }
}));

// Unsubscribe
ws.send(JSON.stringify({
  event: 'unsubscribe',
  data: { ticker: ['aapl', 'msft'] }
}));
```

**Message Types:**

**Quote Update (Q):**
```json
{
  "s": "aapl",
  "t": 1645216790788174600,
  "type": "Q",
  "ap": 152.46,
  "as": 200,
  "bp": 152.31,
  "bs": 100,
  "lp": 152.17,
  "ls": 100
}
```

**Trade Update (T):**
```json
{
  "s": "aapl",
  "t": 1645216790788174600,
  "type": "T",
  "lp": 152.17,
  "ls": 100
}
```

**Trade Break (B):**
```json
{
  "s": "aapl",
  "t": 1645216790788174600,
  "type": "B",
  "lp": 152.17,
  "ls": 100
}
```

---

## Data Freshness & Update Frequency

| Data Type | Update Frequency | Recommended Cache |
|-----------|------------------|-------------------|
| Real-time quotes | Sub-second | 60s |
| Intraday prices | 1-minute | 5-15 minutes |
| Daily prices | End of day | 1 hour |
| Financial statements | Quarterly | 24 hours |
| Company profiles | Rarely changes | 7 days |
| Insider trades | Daily | 1 hour |
| Congress trades | Daily | 1 hour |
| SEC filings | As filed | 24 hours |
| Economic indicators | Monthly/quarterly | 24 hours |
| News | Real-time | 30 minutes |
| Earnings calendar | Daily updates | 6 hours |

---

## Error Codes & Handling

### Common Error Responses

**429 Too Many Requests:**
```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded your rate limit of 300 requests per minute"
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid API key",
  "message": "The API key provided is invalid"
}
```

**403 Forbidden:**
```json
{
  "error": "Insufficient permissions",
  "message": "This endpoint requires a Premium subscription"
}
```

**404 Not Found:**
```json
{
  "error": "Symbol not found",
  "message": "The symbol INVALID does not exist"
}
```

### Error Handling Strategy

```typescript
async function fetchFMP(endpoint: string) {
  try {
    const response = await fetch(`https://financialmodelingprep.com${endpoint}`);

    if (response.status === 429) {
      // Rate limited - implement exponential backoff
      throw new RateLimitError('Rate limit exceeded');
    }

    if (response.status === 403) {
      // Endpoint not available on current plan
      throw new PermissionError('Upgrade required for this endpoint');
    }

    if (response.status === 404) {
      // Symbol or resource not found
      throw new NotFoundError('Resource not found');
    }

    if (!response.ok) {
      throw new APIError(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // Log error and implement fallback strategy
    console.error('FMP API Error:', error);
    throw error;
  }
}
```

---

## Implementation Recommendations

### 1. Caching Layer Architecture

```typescript
// Redis cache configuration
const cacheConfig = {
  host: process.env.REDIS_HOST,
  port: 6379,
  ttl: {
    quotes: 60,
    financials: 86400,
    profile: 604800
  }
};

async function getCachedOrFetch(key: string, fetcher: () => Promise<any>, ttl: number) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

### 2. Request Queuing

```typescript
import PQueue from 'p-queue';

const queue = new PQueue({
  concurrency: 5,
  interval: 60000, // 1 minute
  intervalCap: 300 // 300 requests per minute
});

async function queuedFetch(url: string) {
  return queue.add(() => fetch(url));
}
```

### 3. Fallback Strategy

```typescript
async function fetchWithFallback(symbol: string) {
  try {
    // Try FMP first
    return await fetchFMP(`/stable/quote?symbol=${symbol}`);
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Fall back to cached data
      return await getCachedData(`quote:${symbol}`);
    }
    throw error;
  }
}
```

### 4. Batch Processing

```typescript
async function fetchMultipleQuotes(symbols: string[]) {
  // Batch symbols into groups of 100
  const batches = [];
  for (let i = 0; i < symbols.length; i += 100) {
    batches.push(symbols.slice(i, i + 100));
  }

  // Fetch all batches
  const results = await Promise.all(
    batches.map(batch =>
      fetchFMP(`/stable/quote?symbol=${batch.join(',')}`)
    )
  );

  return results.flat();
}
```

---

## Starter Tier Limitations

### Symbol Restrictions

The Starter tier limits access to approximately 100 major securities:

**Confirmed Available:**
- AAPL (Apple)
- TSLA (Tesla)
- AMZN (Amazon)
- MSFT (Microsoft)
- GOOGL (Google)
- META (Meta)
- NVDA (Nvidia)
- ~93 other major stocks

**Workaround:** For broader market coverage, upgrade to Premium ($50/month) for 70,000+ securities.

### Geographic Restrictions

**Starter Tier:** US markets only

**Premium Tier:** Global coverage (46 countries)

### Historical Data Limits

**Starter Tier:** 5 years maximum

**Premium Tier:** 30+ years

For MarketMint's use case focusing on US equities, the Starter tier should be sufficient initially.

---

## Cost Optimization Strategies

### 1. Aggressive Caching

Cache everything possible, especially:
- Company profiles (7 days TTL)
- Financial statements (24 hours TTL)
- Historical prices (1 hour TTL for daily data)

### 2. Smart Polling

Instead of polling all watchlist stocks every minute:
```typescript
// Poll top 10 most viewed stocks every 60 seconds
// Poll rest of watchlist every 5 minutes
```

### 3. WebSocket for Real-Time

Use WebSocket for actively traded stocks instead of polling:
```typescript
// Connect via WebSocket for stocks being viewed
// Disconnect when user navigates away
```

### 4. Lazy Loading

Don't fetch data until user requests it:
```typescript
// Fetch company profile only when user clicks on stock
// Fetch financials only when user opens financials tab
```

---

## API Response Time Benchmarks

Based on FMP documentation and community reports:

| Endpoint Type | Typical Response Time |
|---------------|----------------------|
| Real-time quote | 100-300ms |
| Historical daily | 200-500ms |
| Financial statements | 300-800ms |
| Company profile | 100-200ms |
| News/press releases | 200-400ms |
| SEC filings | 400-1000ms |
| Screener (large result) | 1000-3000ms |

**Optimization Tips:**
- Use `short=true` parameter for quote endpoints when possible
- Limit result sets with `limit` parameter
- Request only needed date ranges with `from` and `to` parameters

---

## Resources & Documentation

### Official Documentation
- [FMP API Docs](https://site.financialmodelingprep.com/developer/docs)
- [FMP Pricing Plans](https://site.financialmodelingprep.com/pricing-plans)
- [FMP FAQ](https://site.financialmodelingprep.com/faqs)

### Community Resources
- [FMP GitHub Examples](https://github.com/FinancialModelingPrepAPI/Financial-Modeling-Prep-API)
- [FMP Python Library](https://github.com/thinh-vu/financialmodelingprep)
- [FMP Data (Python with caching)](https://mehdizare.github.io/fmp-data/)

### Best Practices Articles
- [10 Best Practices for API Rate Limiting in 2025](https://zuplo.com/learning-center/10-best-practices-for-api-rate-limiting-in-2025)
- [API Rate Limiting Strategies](https://api7.ai/learning-center/api-101/api-rate-limiting)
- [Mastering API Rate Limits](https://apipark.com/techblog/en/mastering-how-to-circumvent-api-rate-limiting-effectively/)

---

## MarketMint Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Implement Redis caching layer with TTL strategy
- [ ] Set up rate limiting middleware (300 req/min)
- [ ] Create request queue with p-queue
- [ ] Implement exponential backoff retry logic
- [ ] Add error handling for all FMP error codes

### Phase 2: Stock Data Endpoints
- [ ] Real-time quotes endpoint
- [ ] Historical daily prices
- [ ] Company profiles
- [ ] Financial statements (income, balance, cash flow)
- [ ] Intraday prices (15min, 1hour)

### Phase 3: Political Trading
- [ ] Senate trading disclosures
- [ ] House trading disclosures
- [ ] Insider trading data
- [ ] SEC filings search

### Phase 4: Market Data
- [ ] Earnings calendar
- [ ] News and press releases
- [ ] Economic indicators
- [ ] Stock screener

### Phase 5: Real-Time Features
- [ ] WebSocket connection manager
- [ ] Real-time quote updates
- [ ] Auto-reconnection logic
- [ ] Subscription management

### Phase 6: Optimization
- [ ] Implement batch fetching for multiple symbols
- [ ] Add lazy loading for heavy endpoints
- [ ] Optimize cache hit rates
- [ ] Monitor bandwidth usage (20GB limit)

---

## Conclusion

The FMP Starter tier ($22/month) provides excellent value for MarketMint's initial launch:

**Strengths:**
- 300 requests/minute is sufficient for moderate traffic
- 20GB bandwidth supports ~100K requests/month
- Congress/Senate trading data included
- Real-time quotes via WebSocket
- 5 years historical data adequate for charts

**Limitations:**
- ~100 symbol restriction (upgrade to Premium for full market)
- US markets only (acceptable for MarketMint scope)
- 5-year historical limit (vs 30+ years on Premium)

**Recommendation:** Start with Starter tier, implement aggressive caching, and upgrade to Premium ($50/month) when:
1. User base grows beyond 100 actively tracked symbols
2. Need international market data
3. Require longer historical data (>5 years)

**Cost Projection:**
- Starter: $22/month + infrastructure costs
- Premium: $50/month (upgrade when needed)
- Enterprise: Custom pricing (for scaled production)

---

**Document Version:** 1.0
**Last Updated:** December 7, 2025
**Next Review:** March 2025
