import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { validateTicker } from '../models/index.js';
import fmp from '../services/financialModelPrep.js';
import logger from '../config/logger.js';

const router = Router();

/**
 * GET /api/quotes/movers
 * Get market movers: top gainers, losers, and most active stocks
 * IMPORTANT: This route must be before /:ticker to avoid matching "movers" as a ticker
 */
router.get('/movers', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 10, 20);

    // Popular stocks to track for movers (30 stocks from various sectors)
    const MOVER_TICKERS = [
      // Tech
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'AMD', 'TSLA', 'NFLX', 'ADBE',
      // Financial
      'JPM', 'BAC', 'WFC', 'GS', 'V', 'MA', 'BLK', 'C',
      // Consumer
      'WMT', 'HD', 'MCD', 'NKE', 'DIS', 'KO',
      // Healthcare
      'JNJ', 'UNH', 'PFE', 'MRK', 'ABBV', 'LLY'
    ];

    // First try batch quotes
    let quotes = await fmp.getBatchQuotes(MOVER_TICKERS);

    // If batch fails, fall back to individual fetching
    if (!quotes || quotes.length === 0) {
      logger.info('Batch quotes failed, fetching individual quotes for movers');
      const quotePromises = MOVER_TICKERS.map(ticker =>
        fmp.getQuote(ticker).catch(() => null)
      );
      quotes = (await Promise.all(quotePromises)).filter(Boolean);
    }

    if (!quotes || quotes.length === 0) {
      return res.json({
        success: true,
        data: { gainers: [], losers: [], mostActive: [], timestamp: new Date().toISOString() }
      });
    }

    // Filter for valid quotes with change data
    const validQuotes = quotes.filter(q =>
      q && q.ticker && q.price !== null && q.changePercent !== null
    );

    // Calculate gainers (sorted by highest positive change)
    const gainers = [...validQuotes]
      .filter(q => q.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, maxLimit);

    // Calculate losers (sorted by lowest negative change)
    const losers = [...validQuotes]
      .filter(q => q.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, maxLimit);

    // Calculate most active (sorted by volume)
    const mostActive = [...validQuotes]
      .filter(q => q.volume > 0)
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, maxLimit);

    res.json({
      success: true,
      data: {
        gainers,
        losers,
        mostActive,
        timestamp: new Date().toISOString()
      }
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

    const quotes = await fmp.getBatchQuotes(tickerList);

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

    const history = await fmp.getHistoricalPrices(validation.ticker, period);

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

/**
 * GET /api/quotes/:ticker/ohlcv
 * Get OHLCV data for candlestick charts
 */
router.get('/:ticker/ohlcv', async (req, res, next) => {
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

    const ohlcv = await fmp.getOHLCV(validation.ticker, period);

    res.json({
      success: true,
      data: {
        ticker: validation.ticker,
        period,
        ohlcv
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/quotes/:ticker
 * Get quote for single ticker
 * IMPORTANT: This must be last because /:ticker matches anything
 */
router.get('/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const quote = await fmp.getQuote(validation.ticker);

    res.json({
      success: true,
      data: quote
    });
  } catch (err) {
    next(err);
  }
});

export default router;
