import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { validateTicker } from '../models/index.js';
import priceHistory from '../services/priceHistory.js';
import logger from '../config/logger.js';

const router = Router();

/**
 * GET /api/charts/:ticker/ohlc
 * Get OHLC candlestick data for a ticker
 * Query params:
 *   - period: 1d, 5d, 1m, 3m, 6m, 1y, 5y, max (default: 1y)
 */
router.get('/:ticker/ohlc', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { period = '1y' } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const validPeriods = ['1d', '5d', '1m', '3m', '6m', 'ytd', '1y', '5y', '10y', 'max'];
    if (!validPeriods.includes(period)) {
      throw new ApiError(400, `Invalid period. Use: ${validPeriods.join(', ')}`);
    }

    const data = await priceHistory.getHistoricalOHLC(validation.ticker, period);

    res.json({
      success: true,
      data: {
        ticker: validation.ticker,
        period,
        count: data.length,
        ohlc: data
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/charts/:ticker/indicators
 * Get technical indicators for a ticker
 * Query params:
 *   - period: 1m, 3m, 6m, 1y, 5y (default: 1y)
 *   - sma: comma-separated periods (default: 20,50,200)
 *   - ema: comma-separated periods (default: 12,26)
 *   - rsi: boolean (default: true)
 *   - macd: boolean (default: true)
 *   - bollinger: boolean (default: true)
 */
router.get('/:ticker/indicators', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const {
      period = '1y',
      sma = '20,50,200',
      ema = '12,26',
      rsi = 'true',
      macd = 'true',
      bollinger = 'true'
    } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    // Get OHLC data first
    const ohlcData = await priceHistory.getHistoricalOHLC(validation.ticker, period);

    if (ohlcData.length === 0) {
      throw new ApiError(404, `No historical data available for ${validation.ticker}`);
    }

    // Parse indicator options
    const smaPeriods = sma.split(',').map(Number).filter(n => n > 0 && n < 500);
    const emaPeriods = ema.split(',').map(Number).filter(n => n > 0 && n < 500);

    // Calculate indicators
    const indicators = priceHistory.calculateIndicators(ohlcData, {
      sma: smaPeriods,
      ema: emaPeriods,
      includeRSI: rsi === 'true',
      includeMACD: macd === 'true',
      includeBollinger: bollinger === 'true'
    });

    // Combine OHLC with indicators
    const combined = ohlcData.map((candle, i) => {
      const point = { ...candle };

      // Add SMAs
      for (const period of smaPeriods) {
        point[`sma${period}`] = indicators.sma[period]?.[i] ?? null;
      }

      // Add EMAs
      for (const period of emaPeriods) {
        point[`ema${period}`] = indicators.ema[period]?.[i] ?? null;
      }

      // Add RSI
      if (indicators.rsi) {
        point.rsi = indicators.rsi[i] ?? null;
      }

      // Add MACD
      if (indicators.macd) {
        point.macd = indicators.macd.macdLine[i] ?? null;
        point.macdSignal = indicators.macd.signalLine[i] ?? null;
        point.macdHistogram = indicators.macd.histogram[i] ?? null;
      }

      // Add Bollinger Bands
      if (indicators.bollinger) {
        point.bollingerUpper = indicators.bollinger.upper[i] ?? null;
        point.bollingerMiddle = indicators.bollinger.middle[i] ?? null;
        point.bollingerLower = indicators.bollinger.lower[i] ?? null;
      }

      return point;
    });

    res.json({
      success: true,
      data: {
        ticker: validation.ticker,
        period,
        count: combined.length,
        indicators: combined
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/charts/:ticker/freshness
 * Check data freshness for a ticker
 */
router.get('/:ticker/freshness', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const freshness = await priceHistory.getDataFreshness(validation.ticker);

    res.json({
      success: true,
      data: {
        ticker: validation.ticker,
        earliestDate: freshness.earliest_date,
        latestDate: freshness.latest_date,
        recordCount: parseInt(freshness.record_count) || 0
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/charts/preload
 * Preload historical data for multiple tickers (admin only)
 */
router.post('/preload', async (req, res, next) => {
  try {
    const { tickers, period = '5y' } = req.body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      throw new ApiError(400, 'Tickers array is required');
    }

    if (tickers.length > 50) {
      throw new ApiError(400, 'Maximum 50 tickers allowed per request');
    }

    // Validate all tickers
    const validTickers = [];
    for (const ticker of tickers) {
      const validation = validateTicker(ticker);
      if (validation.valid) {
        validTickers.push(validation.ticker);
      }
    }

    // Start preload in background
    priceHistory.preloadHistoricalData(validTickers, period).catch(err => logger.error('Preload historical data failed', { error: err.message }));

    res.json({
      success: true,
      message: `Preloading ${validTickers.length} tickers in background`,
      tickers: validTickers
    });
  } catch (err) {
    next(err);
  }
});

export default router;
