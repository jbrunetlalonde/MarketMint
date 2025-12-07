import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import insiderTracker from '../services/insiderTracker.js';
import { validatePagination, validateTicker, sanitizeString } from '../utils/validation.js';

const router = Router();

/**
 * GET /api/insider/trades
 * Get recent insider trades
 * Query params: ticker, transactionType, limit, page
 */
router.get('/trades', async (req, res, next) => {
  try {
    const { ticker, transactionType, limit, page } = req.query;
    const { page: safePage, limit: safeLimit } = validatePagination(page, limit);
    const safeTicker = ticker ? sanitizeString(ticker, 5)?.toUpperCase() : undefined;
    const safeType = sanitizeString(transactionType);

    let trades = await insiderTracker.getInsiderTrades({
      ticker: safeTicker,
      page: safePage,
      limit: safeLimit
    });

    if (safeType) {
      const type = safeType.toUpperCase();
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
    const { limit } = req.query;
    const safeTicker = validateTicker(ticker);
    const { limit: safeLimit } = validatePagination(0, limit);

    const trades = await insiderTracker.getInsiderTradesByTicker(safeTicker);

    res.json({
      success: true,
      data: trades.slice(0, safeLimit)
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
    const { limit } = req.query;
    const { limit: safeLimit } = validatePagination(0, limit);

    const trades = await insiderTracker.getLatestInsiderTrades(safeLimit);

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
