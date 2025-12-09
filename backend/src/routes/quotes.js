import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { validateTicker } from '../models/index.js';
import fmp from '../services/financialModelPrep.js';
import logger from '../config/logger.js';

const router = Router();

/**
 * GET /api/quotes/sector-performance
 * Get sector performance data from FMP
 * IMPORTANT: This route must be before /:ticker to avoid matching "sector-performance" as a ticker
 */
router.get('/sector-performance', async (req, res, next) => {
  try {
    const data = await fmp.getSectorPerformance();
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Sector performance fetch failed', { error: err.message });
    res.json({
      success: true,
      data: [],
      error: { code: 'FMP_ERROR', message: err.message }
    });
  }
});

/**
 * GET /api/quotes/movers
 * Get market movers: top gainers, losers, and most active stocks from FMP
 * IMPORTANT: This route must be before /:ticker to avoid matching "movers" as a ticker
 */
router.get('/movers', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 10, 20);

    // Use FMP's dedicated market movers API
    const movers = await fmp.getMarketMovers(maxLimit);

    res.json({
      success: true,
      data: {
        gainers: movers.gainers || [],
        losers: movers.losers || [],
        mostActive: movers.mostActive || [],
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    logger.error('Market movers fetch failed', { error: err.message });
    // Return empty data on error
    res.json({
      success: true,
      data: { gainers: [], losers: [], mostActive: [], timestamp: new Date().toISOString() },
      error: { code: 'FMP_ERROR', message: err.message }
    });
  }
});

/**
 * GET /api/quotes/market-status
 * Check if the market is currently open
 */
router.get('/market-status', async (req, res, next) => {
  try {
    const isOpen = await fmp.isMarketOpen();
    res.json({
      success: true,
      data: {
        isOpen,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    logger.error('Market status check failed', { error: err.message });
    res.json({
      success: true,
      data: { isOpen: null },
      error: { code: 'FMP_ERROR', message: err.message }
    });
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
