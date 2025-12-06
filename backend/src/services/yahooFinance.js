import yahooFinance from 'yahoo-finance2';
import { config } from '../config/env.js';
import { quotes as quotesModel } from '../models/index.js';

// Suppress yahoo-finance2 validation warnings in production
yahooFinance.setGlobalConfig({
  validation: {
    logErrors: config.nodeEnv === 'development'
  }
});

// In-memory cache for rate limiting protection
const memoryCache = new Map();

function getCacheKey(type, ticker) {
  return `${type}:${ticker}`;
}

function getFromMemoryCache(key, ttlSeconds) {
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  memoryCache.delete(key);
  return null;
}

function setMemoryCache(key, data, ttlSeconds) {
  memoryCache.set(key, {
    data,
    expires: Date.now() + ttlSeconds * 1000
  });
}

/**
 * Get real-time quote for a single ticker
 */
export async function getQuote(ticker) {
  const cacheKey = getCacheKey('quote', ticker);
  const ttl = config.cacheTTL.quote;

  // Check memory cache first
  const cached = getFromMemoryCache(cacheKey, ttl);
  if (cached) {
    return cached;
  }

  // Check database cache
  const dbCached = await quotesModel.getCached(ticker);
  if (dbCached) {
    const quote = formatQuoteFromDb(dbCached);
    setMemoryCache(cacheKey, quote, ttl);
    return quote;
  }

  // Fetch from Yahoo Finance
  try {
    const result = await yahooFinance.quote(ticker);
    const quote = formatQuote(ticker, result);

    // Cache in database
    await quotesModel.upsertCache(ticker, {
      price: quote.price,
      previousClose: quote.previousClose,
      change: quote.change,
      changePercent: quote.changePercent,
      dayHigh: quote.dayHigh,
      dayLow: quote.dayLow,
      volume: quote.volume,
      marketCap: quote.marketCap,
      peRatio: quote.peRatio
    }, ttl);

    // Cache in memory
    setMemoryCache(cacheKey, quote, ttl);

    return quote;
  } catch (err) {
    console.error(`Yahoo Finance error for ${ticker}:`, err.message);
    throw new Error(`Failed to fetch quote for ${ticker}`);
  }
}

/**
 * Get quotes for multiple tickers
 */
export async function getBulkQuotes(tickers) {
  const results = [];
  const tickersToFetch = [];

  // Check caches first
  for (const ticker of tickers) {
    const cacheKey = getCacheKey('quote', ticker);
    const cached = getFromMemoryCache(cacheKey, config.cacheTTL.quote);
    if (cached) {
      results.push(cached);
    } else {
      tickersToFetch.push(ticker);
    }
  }

  if (tickersToFetch.length === 0) {
    return results;
  }

  // Check database cache for remaining tickers
  const dbCached = await quotesModel.getBulkCached(tickersToFetch);
  const dbCachedMap = new Map(dbCached.map(q => [q.ticker, q]));

  const stillToFetch = [];
  for (const ticker of tickersToFetch) {
    if (dbCachedMap.has(ticker)) {
      const quote = formatQuoteFromDb(dbCachedMap.get(ticker));
      setMemoryCache(getCacheKey('quote', ticker), quote, config.cacheTTL.quote);
      results.push(quote);
    } else {
      stillToFetch.push(ticker);
    }
  }

  // Fetch remaining from Yahoo Finance
  if (stillToFetch.length > 0) {
    try {
      const yahooResults = await yahooFinance.quote(stillToFetch);
      const quotesArray = Array.isArray(yahooResults) ? yahooResults : [yahooResults];

      for (const result of quotesArray) {
        if (result && result.symbol) {
          const quote = formatQuote(result.symbol, result);

          // Cache in database
          await quotesModel.upsertCache(result.symbol, {
            price: quote.price,
            previousClose: quote.previousClose,
            change: quote.change,
            changePercent: quote.changePercent,
            dayHigh: quote.dayHigh,
            dayLow: quote.dayLow,
            volume: quote.volume,
            marketCap: quote.marketCap,
            peRatio: quote.peRatio
          }, config.cacheTTL.quote);

          // Cache in memory
          setMemoryCache(getCacheKey('quote', result.symbol), quote, config.cacheTTL.quote);
          results.push(quote);
        }
      }
    } catch (err) {
      console.error('Yahoo Finance bulk error:', err.message);
    }
  }

  return results;
}

/**
 * Get historical price data
 */
export async function getHistorical(ticker, period = '1y') {
  const cacheKey = getCacheKey(`history:${period}`, ticker);
  const ttl = config.cacheTTL.priceHistory;

  const cached = getFromMemoryCache(cacheKey, ttl);
  if (cached) {
    return cached;
  }

  try {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '5d':
        startDate.setDate(startDate.getDate() - 5);
        break;
      case '1m':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '5y':
        startDate.setFullYear(startDate.getFullYear() - 5);
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const result = await yahooFinance.chart(ticker, {
      period1: startDate,
      period2: endDate,
      interval: period === '1d' ? '5m' : period === '5d' ? '15m' : '1d'
    });

    const history = result.quotes.map(q => ({
      date: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume
    }));

    setMemoryCache(cacheKey, history, ttl);
    return history;
  } catch (err) {
    console.error(`Yahoo Finance historical error for ${ticker}:`, err.message);
    throw new Error(`Failed to fetch historical data for ${ticker}`);
  }
}

/**
 * Format quote from Yahoo Finance response
 */
function formatQuote(ticker, data) {
  return {
    ticker: ticker,
    price: data.regularMarketPrice ?? null,
    previousClose: data.regularMarketPreviousClose ?? null,
    change: data.regularMarketChange ?? null,
    changePercent: data.regularMarketChangePercent ?? null,
    dayHigh: data.regularMarketDayHigh ?? null,
    dayLow: data.regularMarketDayLow ?? null,
    open: data.regularMarketOpen ?? null,
    volume: data.regularMarketVolume ?? null,
    avgVolume: data.averageDailyVolume3Month ?? null,
    marketCap: data.marketCap ?? null,
    peRatio: data.trailingPE ?? null,
    eps: data.epsTrailingTwelveMonths ?? null,
    dividendYield: data.dividendYield ?? null,
    fiftyTwoWeekHigh: data.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: data.fiftyTwoWeekLow ?? null,
    name: data.shortName ?? data.longName ?? ticker,
    exchange: data.exchange ?? null,
    currency: data.currency ?? 'USD'
  };
}

/**
 * Format quote from database cache
 */
function formatQuoteFromDb(data) {
  return {
    ticker: data.ticker,
    price: parseFloat(data.price) || null,
    previousClose: parseFloat(data.previous_close) || null,
    change: parseFloat(data.change_amount) || null,
    changePercent: parseFloat(data.change_percent) || null,
    dayHigh: parseFloat(data.day_high) || null,
    dayLow: parseFloat(data.day_low) || null,
    volume: parseInt(data.volume) || null,
    marketCap: parseInt(data.market_cap) || null,
    peRatio: parseFloat(data.pe_ratio) || null,
    lastUpdated: data.last_updated
  };
}

/**
 * Clear memory cache (for testing or manual refresh)
 */
export function clearCache(ticker = null) {
  if (ticker) {
    memoryCache.delete(getCacheKey('quote', ticker));
  } else {
    memoryCache.clear();
  }
}

export default {
  getQuote,
  getBulkQuotes,
  getHistorical,
  clearCache
};
