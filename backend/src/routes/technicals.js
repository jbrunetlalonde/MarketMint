import express from 'express';
import { config } from '../config/env.js';

const router = express.Router();
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

async function fetchFMP(endpoint) {
  if (!config.fmpApiKey) {
    throw new Error('FMP_API_KEY not configured');
  }

  const url = `${FMP_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${config.fmpApiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function validateTicker(ticker) {
  if (!ticker || typeof ticker !== 'string') {
    return { valid: false, error: 'Ticker symbol required' };
  }
  const normalized = ticker.toUpperCase().trim();
  if (!/^[A-Z]{1,5}$/.test(normalized)) {
    return { valid: false, error: 'Invalid ticker format' };
  }
  return { valid: true, ticker: normalized };
}

/**
 * GET /api/technicals/:ticker/sma
 * Get Simple Moving Average
 */
router.get('/:ticker/sma', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { period = 20, timeframe = '1day' } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const data = await fetchFMP(
      `/technical-indicators/sma?symbol=${validation.ticker}&periodLength=${period}&timeframe=${timeframe}`
    );

    res.json({
      success: true,
      data: data.slice(0, 100).map(d => ({
        date: d.date,
        close: d.close,
        sma: d.sma
      }))
    });
  } catch (err) {
    console.error('SMA error:', err.message);
    res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
  }
});

/**
 * GET /api/technicals/:ticker/ema
 * Get Exponential Moving Average
 */
router.get('/:ticker/ema', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { period = 20, timeframe = '1day' } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const data = await fetchFMP(
      `/technical-indicators/ema?symbol=${validation.ticker}&periodLength=${period}&timeframe=${timeframe}`
    );

    res.json({
      success: true,
      data: data.slice(0, 100).map(d => ({
        date: d.date,
        close: d.close,
        ema: d.ema
      }))
    });
  } catch (err) {
    console.error('EMA error:', err.message);
    res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
  }
});

/**
 * GET /api/technicals/:ticker/rsi
 * Get Relative Strength Index
 */
router.get('/:ticker/rsi', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { period = 14, timeframe = '1day' } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const data = await fetchFMP(
      `/technical-indicators/rsi?symbol=${validation.ticker}&periodLength=${period}&timeframe=${timeframe}`
    );

    res.json({
      success: true,
      data: data.slice(0, 100).map(d => ({
        date: d.date,
        close: d.close,
        rsi: d.rsi
      }))
    });
  } catch (err) {
    console.error('RSI error:', err.message);
    res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
  }
});

/**
 * GET /api/technicals/:ticker/all
 * Get all technical indicators at once
 */
router.get('/:ticker/all', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { timeframe = '1day' } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const [sma20, sma50, ema12, ema26, rsi14] = await Promise.all([
      fetchFMP(`/technical-indicators/sma?symbol=${validation.ticker}&periodLength=20&timeframe=${timeframe}`).catch(() => []),
      fetchFMP(`/technical-indicators/sma?symbol=${validation.ticker}&periodLength=50&timeframe=${timeframe}`).catch(() => []),
      fetchFMP(`/technical-indicators/ema?symbol=${validation.ticker}&periodLength=12&timeframe=${timeframe}`).catch(() => []),
      fetchFMP(`/technical-indicators/ema?symbol=${validation.ticker}&periodLength=26&timeframe=${timeframe}`).catch(() => []),
      fetchFMP(`/technical-indicators/rsi?symbol=${validation.ticker}&periodLength=14&timeframe=${timeframe}`).catch(() => [])
    ]);

    // Get latest values
    const latest = {
      sma20: sma20[0]?.sma || null,
      sma50: sma50[0]?.sma || null,
      ema12: ema12[0]?.ema || null,
      ema26: ema26[0]?.ema || null,
      rsi: rsi14[0]?.rsi || null,
      price: sma20[0]?.close || null,
      date: sma20[0]?.date || null
    };

    res.json({
      success: true,
      data: {
        latest,
        sma20: sma20.slice(0, 50),
        sma50: sma50.slice(0, 50),
        ema12: ema12.slice(0, 50),
        ema26: ema26.slice(0, 50),
        rsi: rsi14.slice(0, 50)
      }
    });
  } catch (err) {
    console.error('All technicals error:', err.message);
    res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
  }
});

export default router;
