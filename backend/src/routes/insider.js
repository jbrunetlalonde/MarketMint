import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import insiderTracker from '../services/insiderTracker.js';

const router = Router();

/**
 * GET /api/insider/trades
 * Get recent insider trades
 * Query params: ticker, transactionType, limit, page
 */
router.get('/trades', async (req, res, next) => {
  try {
    const { ticker, transactionType, limit = 50, page = 0 } = req.query;

    let trades = await insiderTracker.getInsiderTrades({
      ticker,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    if (transactionType) {
      const type = transactionType.toUpperCase();
      trades = trades.filter(t =>
        t.transactionType === type ||
        (type === 'BUY' && t.transactionType === 'PURCHASE') ||
        (type === 'SELL' && t.transactionType === 'SALE')
      );
    }

    res.json({
      success: true,
      data: trades
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/insider/trades/:ticker
 * Get insider trades for a specific stock
 */
router.get('/trades/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 50 } = req.query;

    if (!ticker || !/^[A-Z]{1,5}$/.test(ticker.toUpperCase())) {
      throw new ApiError(400, 'Invalid ticker symbol');
    }

    const trades = await insiderTracker.getInsiderTradesByTicker(ticker.toUpperCase());

    res.json({
      success: true,
      data: trades.slice(0, parseInt(limit))
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/insider/latest
 * Get latest insider trades across all stocks
 */
router.get('/latest', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const trades = await insiderTracker.getLatestInsiderTrades(parseInt(limit));

    res.json({
      success: true,
      data: trades
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/insider/stats
 * Get insider trading statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const trades = await insiderTracker.getLatestInsiderTrades(100);
    const stats = insiderTracker.getInsiderStats(trades);

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/insider/cache-stats
 * Get cache statistics
 */
router.get('/cache-stats', (req, res) => {
  res.json({
    success: true,
    data: insiderTracker.getCacheStats()
  });
});

export default router;
