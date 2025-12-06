import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validateTicker } from '../models/index.js';
import { query } from '../config/database.js';
import fmp from '../services/financialModelPrep.js';
import priceHistory from '../services/priceHistory.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req, res, next) => {
  try {
    const fmpStats = fmp.getCacheStats();

    // Get database cache stats
    const dbStats = await query(`
      SELECT
        (SELECT COUNT(*) FROM company_profiles WHERE cache_expires_at > NOW()) as profiles_cached,
        (SELECT COUNT(*) FROM fmp_income_cache WHERE cache_expires_at > NOW()) as income_cached,
        (SELECT COUNT(*) FROM fmp_balance_cache WHERE cache_expires_at > NOW()) as balance_cached,
        (SELECT COUNT(*) FROM fmp_cashflow_cache WHERE cache_expires_at > NOW()) as cashflow_cached,
        (SELECT COUNT(*) FROM fmp_metrics_cache WHERE cache_expires_at > NOW()) as metrics_cached,
        (SELECT COUNT(*) FROM fmp_ratios_cache WHERE cache_expires_at > NOW()) as ratios_cached,
        (SELECT COUNT(*) FROM fmp_rating_cache WHERE cache_expires_at > NOW()) as ratings_cached,
        (SELECT COUNT(*) FROM fmp_dcf_cache WHERE cache_expires_at > NOW()) as dcf_cached,
        (SELECT COUNT(*) FROM fmp_price_target_cache WHERE cache_expires_at > NOW()) as price_targets_cached,
        (SELECT COUNT(*) FROM fmp_peers_cache WHERE cache_expires_at > NOW()) as peers_cached,
        (SELECT COUNT(*) FROM fmp_executives_cache WHERE cache_expires_at > NOW()) as executives_cached,
        (SELECT COUNT(DISTINCT ticker) FROM price_history) as price_history_tickers,
        (SELECT COUNT(*) FROM price_history) as price_history_records
    `);

    res.json({
      success: true,
      data: {
        memory: fmpStats,
        database: dbStats.rows[0]
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/refresh/profiles
 * Bulk refresh company profiles
 */
router.post('/refresh/profiles', async (req, res, next) => {
  try {
    const { tickers } = req.body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      throw new ApiError(400, 'Tickers array is required');
    }

    if (tickers.length > 50) {
      throw new ApiError(400, 'Maximum 50 tickers per request');
    }

    // Validate tickers
    const validTickers = tickers
      .map(t => validateTicker(t))
      .filter(v => v.valid)
      .map(v => v.ticker);

    // Log the refresh job
    const logResult = await query(
      `INSERT INTO fmp_refresh_log (data_type, status) VALUES ('profile', 'running') RETURNING id`
    );
    const jobId = logResult.rows[0].id;

    // Run refresh in background
    fmp.bulkRefreshProfiles(validTickers)
      .then(async (results) => {
        await query(
          `UPDATE fmp_refresh_log
           SET status = 'completed', tickers_processed = $1, tickers_failed = $2,
               completed_at = NOW(), error_message = $3
           WHERE id = $4`,
          [results.success, results.failed, JSON.stringify(results.errors), jobId]
        );
      })
      .catch(async (err) => {
        await query(
          `UPDATE fmp_refresh_log SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
          [err.message, jobId]
        );
      });

    res.json({
      success: true,
      message: `Refreshing ${validTickers.length} profiles in background`,
      jobId,
      tickers: validTickers
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/refresh/financials
 * Bulk refresh financial data (income, balance, cashflow, metrics, ratios)
 */
router.post('/refresh/financials', async (req, res, next) => {
  try {
    const { tickers } = req.body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      throw new ApiError(400, 'Tickers array is required');
    }

    if (tickers.length > 20) {
      throw new ApiError(400, 'Maximum 20 tickers per request (5 API calls each)');
    }

    const validTickers = tickers
      .map(t => validateTicker(t))
      .filter(v => v.valid)
      .map(v => v.ticker);

    const logResult = await query(
      `INSERT INTO fmp_refresh_log (data_type, status) VALUES ('financials', 'running') RETURNING id`
    );
    const jobId = logResult.rows[0].id;

    fmp.bulkRefreshFinancials(validTickers)
      .then(async (results) => {
        await query(
          `UPDATE fmp_refresh_log
           SET status = 'completed', tickers_processed = $1, tickers_failed = $2,
               completed_at = NOW(), error_message = $3
           WHERE id = $4`,
          [results.success, results.failed, JSON.stringify(results.errors), jobId]
        );
      })
      .catch(async (err) => {
        await query(
          `UPDATE fmp_refresh_log SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
          [err.message, jobId]
        );
      });

    res.json({
      success: true,
      message: `Refreshing financials for ${validTickers.length} tickers in background`,
      jobId,
      tickers: validTickers
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/refresh/ohlc
 * Bulk refresh OHLC price history
 */
router.post('/refresh/ohlc', async (req, res, next) => {
  try {
    const { tickers, period = '5y' } = req.body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      throw new ApiError(400, 'Tickers array is required');
    }

    if (tickers.length > 50) {
      throw new ApiError(400, 'Maximum 50 tickers per request');
    }

    const validTickers = tickers
      .map(t => validateTicker(t))
      .filter(v => v.valid)
      .map(v => v.ticker);

    // Start preload in background
    priceHistory.preloadHistoricalData(validTickers, period).catch(console.error);

    res.json({
      success: true,
      message: `Refreshing OHLC data for ${validTickers.length} tickers in background`,
      tickers: validTickers,
      period
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/refresh/status/:jobId
 * Check status of a refresh job
 */
router.get('/refresh/status/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const result = await query(
      `SELECT * FROM fmp_refresh_log WHERE id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Job not found');
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/refresh/history
 * Get recent refresh job history
 */
router.get('/refresh/history', async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const result = await query(
      `SELECT * FROM fmp_refresh_log ORDER BY started_at DESC LIMIT $1`,
      [Math.min(parseInt(limit) || 20, 100)]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/cache/clear
 * Clear all caches or specific ticker cache
 */
router.delete('/cache/clear', async (req, res, next) => {
  try {
    const { ticker } = req.query;

    // Clear memory cache
    fmp.clearCache(ticker || null);

    if (ticker) {
      // Clear specific ticker from database
      await Promise.all([
        query('UPDATE company_profiles SET cache_expires_at = NOW() WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_income_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_balance_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_cashflow_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_metrics_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_ratios_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_rating_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_dcf_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_price_target_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_peers_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_executives_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_dividends_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_splits_cache WHERE ticker = $1', [ticker])
      ]);

      res.json({
        success: true,
        message: `Cache cleared for ${ticker}`
      });
    } else {
      // Clear all database caches
      await query(`SELECT cleanup_fmp_cache()`);

      res.json({
        success: true,
        message: 'All caches cleared'
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/watchlist/tickers
 * Get all unique tickers from user watchlists (for bulk refresh)
 */
router.get('/watchlist/tickers', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT ticker FROM watchlists ORDER BY ticker`
    );

    const tickers = result.rows.map(r => r.ticker);

    res.json({
      success: true,
      data: {
        count: tickers.length,
        tickers
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
