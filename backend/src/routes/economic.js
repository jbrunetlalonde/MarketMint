import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import fred from '../services/fredApi.js';

const router = Router();

/**
 * GET /api/economic/indicators
 * Get all key economic indicators
 */
router.get('/indicators', async (req, res, next) => {
  try {
    const indicators = await fred.getAllIndicators();
    res.json({ success: true, data: indicators });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/economic/dashboard
 * Get summary data for frontend dashboard
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const indicators = await fred.getAllIndicators();

    const dashboard = {
      fedFundsRate: indicators.FEDFUNDS || null,
      treasury10Y: indicators.DGS10 || null,
      treasury2Y: indicators.DGS2 || null,
      yieldSpread: indicators.T10Y2Y || null,
      unemployment: indicators.UNRATE || null,
      cpi: indicators.CPIAUCSL || null,
      vix: indicators.VIXCLS || null,
      oilPrice: indicators.DCOILWTICO || null,
      mortgageRate: indicators.MORTGAGE30US || null,
      gdp: indicators.GDP || null
    };

    res.json({ success: true, data: dashboard });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/economic/series/:seriesId
 * Get data for a specific FRED series
 */
router.get('/series/:seriesId', async (req, res, next) => {
  try {
    const { seriesId } = req.params;
    const { limit = 30 } = req.query;

    const validSeriesId = seriesId.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!validSeriesId || validSeriesId.length > 20) {
      throw new ApiError(400, 'Invalid series ID');
    }

    const data = await fred.getSeriesData(validSeriesId, {
      limit: Math.min(parseInt(limit) || 30, 100)
    });

    if (!data) {
      throw new ApiError(404, `Series ${validSeriesId} not found or unavailable`);
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/economic/series/:seriesId/info
 * Get metadata about a FRED series
 */
router.get('/series/:seriesId/info', async (req, res, next) => {
  try {
    const { seriesId } = req.params;
    const validSeriesId = seriesId.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const info = await fred.getSeriesInfo(validSeriesId);

    if (!info) {
      throw new ApiError(404, `Series ${validSeriesId} not found`);
    }

    res.json({ success: true, data: info });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/economic/available
 * Get list of available economic series
 */
router.get('/available', (req, res) => {
  const series = Object.entries(fred.ECONOMIC_SERIES).map(([id, meta]) => ({
    seriesId: id,
    ...meta
  }));

  res.json({ success: true, data: series });
});

export default router;
