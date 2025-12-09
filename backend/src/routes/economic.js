import { Router } from 'express';
import economicData from '../services/economicData.js';
import fmp from '../services/financialModelPrep.js';

const router = Router();

/**
 * GET /api/economic/indicators
 * Get all key economic indicators (Treasury, GDP, CPI, Unemployment)
 */
router.get('/indicators', async (req, res, next) => {
  try {
    const indicators = await economicData.getAllEconomicIndicators();
    res.json({ success: true, data: indicators });
  } catch (err) {
    console.error('Economic indicators error:', err.message);
    res.json({ success: true, data: null, error: { message: err.message } });
  }
});

/**
 * GET /api/economic/treasury
 * Get current treasury rates
 */
router.get('/treasury', async (req, res, next) => {
  try {
    const rates = await economicData.getTreasuryRates();
    res.json({ success: true, data: rates });
  } catch (err) {
    console.error('Treasury rates error:', err.message);
    res.json({ success: true, data: null, error: { message: err.message } });
  }
});

/**
 * GET /api/economic/calendar
 * Get economic calendar events
 */
router.get('/calendar', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    // Default to next 30 days if not specified
    const fromDate = from || new Date().toISOString().split('T')[0];
    const toDate = to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const calendar = await economicData.getEconomicCalendar(fromDate, toDate);
    res.json({ success: true, data: calendar });
  } catch (err) {
    console.error('Economic calendar error:', err.message);
    res.json({ success: true, data: [], error: { message: err.message } });
  }
});

/**
 * GET /api/economic/dashboard
 * Get dashboard summary - transforms FMP data to expected format
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const data = await economicData.getAllEconomicIndicators();

    // Transform FMP data to dashboard format expected by frontend
    const treasury = data.treasury;
    const dashboard = {
      fedFundsRate: null, // FMP doesn't provide this directly
      treasury10Y: treasury ? { latest: { date: treasury.date, value: treasury.year10 } } : null,
      treasury2Y: treasury ? { latest: { date: treasury.date, value: treasury.year2 } } : null,
      yieldSpread: treasury && treasury.year10 && treasury.year2
        ? { latest: { date: treasury.date, value: treasury.year10 - treasury.year2 } }
        : null,
      unemployment: data.unemployment
        ? { latest: { date: data.unemployment.date, value: data.unemployment.value } }
        : null,
      cpi: data.cpi
        ? { latest: { date: data.cpi.date, value: data.cpi.value } }
        : null,
      vix: null, // FMP doesn't provide VIX in economic indicators
      oilPrice: null, // FMP doesn't provide oil price in economic indicators
      mortgageRate: null, // FMP doesn't provide mortgage rate
      gdp: data.gdp
        ? { latest: { date: data.gdp.date, value: data.gdp.value } }
        : null
    };

    res.json({ success: true, data: dashboard });
  } catch (err) {
    console.error('Economic dashboard error:', err.message);
    res.json({ success: true, data: null, error: { message: err.message } });
  }
});

/**
 * GET /api/economic/indicator/:name
 * Get specific economic indicator (GDP, CPI, unemploymentRate)
 */
router.get('/indicator/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const validNames = ['GDP', 'CPI', 'unemploymentRate', 'federalFundsRate', 'retailSales'];

    if (!validNames.includes(name)) {
      return res.status(400).json({
        success: false,
        error: { message: `Invalid indicator. Valid options: ${validNames.join(', ')}` }
      });
    }

    const data = await economicData.getEconomicIndicator(name);
    res.json({ success: true, data });
  } catch (err) {
    console.error(`Economic indicator (${req.params.name}) error:`, err.message);
    res.json({ success: true, data: null, error: { message: err.message } });
  }
});

/**
 * GET /api/economic/ipo-calendar
 * Get upcoming IPOs
 */
router.get('/ipo-calendar', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    // Default to next 30 days
    const fromDate = from || new Date().toISOString().split('T')[0];
    const toDate = to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const ipos = await fmp.getIPOCalendar(fromDate, toDate);
    res.json({ success: true, data: ipos });
  } catch (err) {
    console.error('IPO calendar error:', err.message);
    res.json({ success: true, data: [], error: { message: err.message } });
  }
});

/**
 * GET /api/economic/dividend-calendar
 * Get upcoming dividend dates
 */
router.get('/dividend-calendar', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    // Default to next 30 days
    const fromDate = from || new Date().toISOString().split('T')[0];
    const toDate = to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dividends = await fmp.getDividendCalendar(fromDate, toDate);
    res.json({ success: true, data: dividends });
  } catch (err) {
    console.error('Dividend calendar error:', err.message);
    res.json({ success: true, data: [], error: { message: err.message } });
  }
});

/**
 * GET /api/economic/split-calendar
 * Get upcoming stock splits
 */
router.get('/split-calendar', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    // Default to next 30 days
    const fromDate = from || new Date().toISOString().split('T')[0];
    const toDate = to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const splits = await fmp.getStockSplitCalendar(fromDate, toDate);
    res.json({ success: true, data: splits });
  } catch (err) {
    console.error('Stock split calendar error:', err.message);
    res.json({ success: true, data: [], error: { message: err.message } });
  }
});

/**
 * GET /api/economic/earnings-calendar
 * Get upcoming earnings (convenience redirect to same data)
 */
router.get('/earnings-calendar', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    // Default to next 7 days
    const fromDate = from || new Date().toISOString().split('T')[0];
    const toDate = to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const earnings = await fmp.getEarningsCalendar(fromDate, toDate);
    res.json({ success: true, data: earnings });
  } catch (err) {
    console.error('Earnings calendar error:', err.message);
    res.json({ success: true, data: [], error: { message: err.message } });
  }
});

export default router;
