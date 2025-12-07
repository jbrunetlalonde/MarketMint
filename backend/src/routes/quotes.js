import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { validateTicker } from '../models/index.js';
import yahooFinance from '../services/yahooFinance.js';
import logger from '../config/logger.js';

const router = Router();

// Fallback mock data when Yahoo Finance fails
const MOCK_QUOTES = {
  AAPL: { ticker: 'AAPL', price: 178.50, change: 2.35, changePercent: 1.33, volume: 52340000, marketCap: 2780000000000, name: 'Apple Inc.' },
  MSFT: { ticker: 'MSFT', price: 378.92, change: -1.20, changePercent: -0.32, volume: 21450000, marketCap: 2810000000000, name: 'Microsoft Corporation' },
  GOOGL: { ticker: 'GOOGL', price: 141.80, change: 0.95, changePercent: 0.67, volume: 18920000, marketCap: 1780000000000, name: 'Alphabet Inc.' },
  AMZN: { ticker: 'AMZN', price: 178.25, change: 3.42, changePercent: 1.96, volume: 45670000, marketCap: 1850000000000, name: 'Amazon.com Inc.' },
  TSLA: { ticker: 'TSLA', price: 248.50, change: -5.30, changePercent: -2.09, volume: 98760000, marketCap: 790000000000, name: 'Tesla Inc.' },
  META: { ticker: 'META', price: 505.75, change: 8.25, changePercent: 1.66, volume: 12340000, marketCap: 1290000000000, name: 'Meta Platforms Inc.' },
  NVDA: { ticker: 'NVDA', price: 495.22, change: 12.50, changePercent: 2.59, volume: 42180000, marketCap: 1220000000000, name: 'NVIDIA Corporation' },
  JPM: { ticker: 'JPM', price: 198.45, change: 1.85, changePercent: 0.94, volume: 8540000, marketCap: 570000000000, name: 'JPMorgan Chase & Co.' },
  SPY: { ticker: 'SPY', price: 478.25, change: 2.15, changePercent: 0.45, volume: 78450000, marketCap: null, name: 'SPDR S&P 500 ETF' },
  QQQ: { ticker: 'QQQ', price: 405.80, change: 3.25, changePercent: 0.81, volume: 45670000, marketCap: null, name: 'Invesco QQQ Trust' }
};

function getMockQuote(ticker) {
  if (MOCK_QUOTES[ticker]) {
    return { ...MOCK_QUOTES[ticker], isMock: true };
  }
  const basePrice = Math.random() * 200 + 20;
  const change = (Math.random() - 0.5) * 10;
  return {
    ticker,
    price: parseFloat(basePrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(((change / basePrice) * 100).toFixed(2)),
    volume: Math.floor(Math.random() * 50000000),
    marketCap: Math.floor(Math.random() * 500000000000),
    name: `${ticker} Inc.`,
    isMock: true
  };
}

/**
 * GET /api/quotes/:ticker
 * Get quote for single ticker
 */
router.get('/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    let quote;
    try {
      quote = await yahooFinance.getQuote(validation.ticker);
    } catch (err) {
      logger.warn('Yahoo Finance failed, using mock data', { ticker: validation.ticker });
      quote = getMockQuote(validation.ticker);
    }

    res.json({
      success: true,
      data: quote
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/quotes/bulk or /api/quotes?tickers=X,Y,Z
 * Get quotes for multiple tickers
 */
router.get('/', async (req, res, next) => {
  try {
    const { tickers } = req.query;

    if (!tickers) {
      throw new ApiError(400, 'Tickers query parameter is required');
    }

    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase());

    if (tickerList.length > 50) {
      throw new ApiError(400, 'Maximum 50 tickers allowed');
    }

    const invalidTickers = tickerList.filter(t => !validateTicker(t).valid);
    if (invalidTickers.length > 0) {
      throw new ApiError(400, `Invalid tickers: ${invalidTickers.join(', ')}`);
    }

    let quotes;
    try {
      quotes = await yahooFinance.getBulkQuotes(tickerList);

      // Fill in any missing tickers with mock data
      const fetchedTickers = new Set(quotes.map(q => q.ticker));
      for (const ticker of tickerList) {
        if (!fetchedTickers.has(ticker)) {
          quotes.push(getMockQuote(ticker));
        }
      }
    } catch (err) {
      logger.warn('Yahoo Finance bulk failed, using mock data');
      quotes = tickerList.map(getMockQuote);
    }

    res.json({
      success: true,
      data: quotes
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/quotes/:ticker/history
 * Get historical price data
 */
router.get('/:ticker/history', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { period = '1y' } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const validPeriods = ['1d', '5d', '1m', '3m', '6m', '1y', '5y'];
    if (!validPeriods.includes(period)) {
      throw new ApiError(400, `Invalid period. Use: ${validPeriods.join(', ')}`);
    }

    let history;
    try {
      history = await yahooFinance.getHistorical(validation.ticker, period);
    } catch (err) {
      throw new ApiError(503, `Historical data unavailable for ${validation.ticker}`);
    }

    res.json({
      success: true,
      data: {
        ticker: validation.ticker,
        period,
        history
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
