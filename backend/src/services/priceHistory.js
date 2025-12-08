import fmp from './financialModelPrep.js';
import { query } from '../config/database.js';

// Memory cache for recent requests
const memoryCache = new Map();
const MEMORY_TTL = 5 * 60 * 1000; // 5 minutes for historical data

function getCacheKey(ticker, startDate, endDate) {
  return `history:${ticker}:${startDate}:${endDate}`;
}

function getFromMemoryCache(key) {
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  memoryCache.delete(key);
  return null;
}

function setMemoryCache(key, data) {
  memoryCache.set(key, {
    data,
    expires: Date.now() + MEMORY_TTL
  });
}

/**
 * Get historical OHLC data from database
 */
async function getFromDatabase(ticker, startDate, endDate) {
  const result = await query(
    `SELECT date, open, high, low, close, volume, adjusted_close
     FROM price_history
     WHERE ticker = $1 AND date >= $2 AND date <= $3
     ORDER BY date ASC`,
    [ticker, startDate, endDate]
  );
  return result.rows;
}

/**
 * Store historical OHLC data to database (batch upsert)
 */
async function storeToDatabase(ticker, data) {
  if (!data || data.length === 0) return;

  // Batch upsert using unnest
  const dates = data.map(d => d.date);
  const opens = data.map(d => d.open);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  const adjustedCloses = data.map(d => d.adjustedClose || d.close);

  await query(
    `INSERT INTO price_history (ticker, date, open, high, low, close, volume, adjusted_close)
     SELECT $1, d.date, d.open, d.high, d.low, d.close, d.volume, d.adjusted_close
     FROM unnest($2::date[], $3::numeric[], $4::numeric[], $5::numeric[], $6::numeric[], $7::bigint[], $8::numeric[])
     AS d(date, open, high, low, close, volume, adjusted_close)
     ON CONFLICT (ticker, date) DO UPDATE SET
       open = EXCLUDED.open,
       high = EXCLUDED.high,
       low = EXCLUDED.low,
       close = EXCLUDED.close,
       volume = EXCLUDED.volume,
       adjusted_close = EXCLUDED.adjusted_close`,
    [ticker, dates, opens, highs, lows, closes, volumes, adjustedCloses]
  );
}

/**
 * Check what date ranges are missing in database
 */
async function findMissingRanges(ticker, startDate, endDate, existingDates) {
  const existingSet = new Set(existingDates.map(d => d.toISOString().split('T')[0]));
  const missing = [];

  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = current.toISOString().split('T')[0];
      if (!existingSet.has(dateStr)) {
        missing.push(new Date(current));
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return missing;
}

/**
 * Fetch historical data from FMP
 */
async function fetchFromFMP(ticker, startDate, endDate) {
  try {
    const fromDate = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const toDate = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];

    const data = await fmp.getHistoricalPrices(ticker, fromDate, toDate);

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.map(q => ({
      date: new Date(q.date),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
      adjustedClose: q.adjClose || q.close
    })).filter(q => q.open != null && q.close != null);
  } catch (err) {
    console.error(`FMP historical error for ${ticker}:`, err.message);
    return [];
  }
}

/**
 * Get historical OHLC data with DB-first caching strategy
 * This is the main function - checks DB first, only fetches from API if missing
 */
export async function getHistoricalOHLC(ticker, period = '1y') {
  const endDate = new Date();
  const startDate = new Date();
  let interval = '1d';

  // Calculate date range based on period
  switch (period) {
    case '1d':
      startDate.setDate(startDate.getDate() - 1);
      interval = '5m';
      break;
    case '5d':
      startDate.setDate(startDate.getDate() - 7); // Extra days for weekends
      interval = '15m';
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
    case 'ytd':
      startDate.setMonth(0);
      startDate.setDate(1);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case '5y':
      startDate.setFullYear(startDate.getFullYear() - 5);
      break;
    case '10y':
      startDate.setFullYear(startDate.getFullYear() - 10);
      break;
    case 'max':
      startDate.setFullYear(startDate.getFullYear() - 20);
      break;
    default:
      startDate.setFullYear(startDate.getFullYear() - 1);
  }

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  const cacheKey = getCacheKey(ticker, startStr, endStr);

  // Check memory cache first
  const cached = getFromMemoryCache(cacheKey);
  if (cached) {
    return cached;
  }

  // For intraday data, use FMP intraday endpoint
  if (interval !== '1d') {
    const data = await fmp.getOHLCV(ticker, period);
    const formatted = formatOHLCData(data || []);
    setMemoryCache(cacheKey, formatted);
    return formatted;
  }

  // For daily data, use DB-first strategy
  // 1. Check database for existing data
  const dbData = await getFromDatabase(ticker, startStr, endStr);

  // 2. Determine if we need to fetch more data
  const today = new Date();
  const lastDbDate = dbData.length > 0 ? new Date(dbData[dbData.length - 1].date) : null;
  const firstDbDate = dbData.length > 0 ? new Date(dbData[0].date) : null;

  // Calculate expected number of trading days (rough estimate)
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const expectedTradingDays = Math.floor(daysDiff * 5 / 7); // Exclude weekends roughly

  // If we have most of the data (>80%), use what we have and fill gaps
  const coverageRatio = dbData.length / Math.max(expectedTradingDays, 1);

  let finalData = dbData;

  // If coverage is low or data is stale, fetch from API
  if (coverageRatio < 0.8 || (lastDbDate && isDataStale(lastDbDate))) {
    // Fetch fresh data from FMP
    const fmpData = await fetchFromFMP(ticker, startDate, endDate);

    if (fmpData.length > 0) {
      // Store to database for future use
      await storeToDatabase(ticker, fmpData);
      finalData = fmpData;
    }
  }

  const formatted = formatOHLCData(finalData);
  setMemoryCache(cacheKey, formatted);
  return formatted;
}

/**
 * Check if data is stale (more than 1 trading day old)
 */
function isDataStale(lastDate) {
  const now = new Date();
  const last = new Date(lastDate);

  // Get market close time (4 PM ET)
  const marketClose = new Date(now);
  marketClose.setHours(16, 0, 0, 0);

  // If it's a weekday after market close, data should be from today
  const dayOfWeek = now.getDay();
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && now > marketClose) {
    const todayStr = now.toISOString().split('T')[0];
    const lastStr = last.toISOString().split('T')[0];
    return todayStr !== lastStr;
  }

  // If it's weekend or before market close, allow 1 day grace
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  return last < oneDayAgo;
}

/**
 * Format OHLC data for frontend consumption
 */
function formatOHLCData(data) {
  return data.map(d => ({
    time: typeof d.date === 'string' ? d.date.split('T')[0] :
          d.date instanceof Date ? d.date.toISOString().split('T')[0] :
          new Date(d.date).toISOString().split('T')[0],
    open: parseFloat(d.open) || 0,
    high: parseFloat(d.high) || 0,
    low: parseFloat(d.low) || 0,
    close: parseFloat(d.close) || 0,
    volume: parseInt(d.volume) || 0
  })).filter(d => d.open > 0 && d.close > 0);
}

/**
 * Calculate technical indicators
 */
export function calculateIndicators(data, options = {}) {
  const {
    sma = [20, 50, 200],
    ema = [12, 26],
    includeRSI = true,
    includeMACD = true,
    includeBollinger = true
  } = options;

  const result = {
    sma: {},
    ema: {},
    rsi: null,
    macd: null,
    bollinger: null
  };

  const closes = data.map(d => d.close);

  // Calculate SMAs
  for (const period of sma) {
    result.sma[period] = calculateSMA(closes, period);
  }

  // Calculate EMAs
  for (const period of ema) {
    result.ema[period] = calculateEMA(closes, period);
  }

  // Calculate RSI (14 period default)
  if (includeRSI) {
    result.rsi = calculateRSI(closes, 14);
  }

  // Calculate MACD
  if (includeMACD) {
    result.macd = calculateMACD(closes);
  }

  // Calculate Bollinger Bands
  if (includeBollinger) {
    result.bollinger = calculateBollingerBands(closes, 20, 2);
  }

  return result;
}

/**
 * Simple Moving Average
 */
function calculateSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * Exponential Moving Average
 */
function calculateEMA(data, period) {
  const result = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }
  return result;
}

/**
 * Relative Strength Index
 */
function calculateRSI(data, period = 14) {
  const result = [];
  const gains = [];
  const losses = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }
  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);

  const macdLine = emaFast.map((fast, i) => {
    if (fast === null || emaSlow[i] === null) return null;
    return fast - emaSlow[i];
  });

  const validMacd = macdLine.filter(v => v !== null);
  const signalLine = calculateEMA(validMacd, signalPeriod);

  // Pad signal line to match macdLine length
  const paddedSignal = new Array(macdLine.length - signalLine.length).fill(null).concat(signalLine);

  const histogram = macdLine.map((macd, i) => {
    if (macd === null || paddedSignal[i] === null) return null;
    return macd - paddedSignal[i];
  });

  return {
    macdLine,
    signalLine: paddedSignal,
    histogram
  };
}

/**
 * Bollinger Bands
 */
function calculateBollingerBands(data, period = 20, stdDev = 2) {
  const sma = calculateSMA(data, period);
  const upper = [];
  const lower = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }

  return {
    upper,
    middle: sma,
    lower
  };
}

/**
 * Pre-load historical data for common tickers (background job)
 */
export async function preloadHistoricalData(tickers, period = '5y') {
  console.log(`Preloading historical data for ${tickers.length} tickers...`);

  for (const ticker of tickers) {
    try {
      await getHistoricalOHLC(ticker, period);
      console.log(`Preloaded: ${ticker}`);
    } catch (err) {
      console.error(`Failed to preload ${ticker}:`, err.message);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('Preload complete');
}

/**
 * Get data freshness info for a ticker
 */
export async function getDataFreshness(ticker) {
  const result = await query(
    `SELECT
       MIN(date) as earliest_date,
       MAX(date) as latest_date,
       COUNT(*) as record_count
     FROM price_history
     WHERE ticker = $1`,
    [ticker]
  );

  return result.rows[0] || { earliest_date: null, latest_date: null, record_count: 0 };
}

export default {
  getHistoricalOHLC,
  calculateIndicators,
  preloadHistoricalData,
  getDataFreshness
};
