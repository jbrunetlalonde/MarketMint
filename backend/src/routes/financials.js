import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { validateTicker } from '../models/index.js';
import fmp from '../services/financialModelPrep.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';
import { getMockFinancials } from '../fixtures/financial-mocks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Load CEO data for portrait lookup
let ceoData = [];
try {
  const ceoPath = path.join(__dirname, '../../data/fortune500-ceos.json');
  const raw = fs.readFileSync(ceoPath, 'utf-8');
  ceoData = JSON.parse(raw).ceos || [];
} catch (err) {
  logger.warn('Could not load CEO data', { error: err.message });
}

// Build ticker -> CEO portrait URL map
const ceoPortraitMap = new Map();
for (const ceo of ceoData) {
  if (ceo.ticker && ceo.name) {
    const filename = `ceo-${ceo.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    ceoPortraitMap.set(ceo.ticker.toUpperCase(), {
      name: ceo.name,
      portraitUrl: `/portraits/${filename}`
    });
  }
}

function getCeoPortrait(ticker) {
  return ceoPortraitMap.get(ticker.toUpperCase()) || null;
}

/**
 * GET /api/financials/:ticker
 * Get financial summary for ticker
 */
router.get('/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      // Fetch from FMP
      const [profile, metrics] = await Promise.all([
        fmp.getProfile(validation.ticker),
        fmp.getKeyMetrics(validation.ticker, 1)
      ]);

      const latestMetrics = metrics[0] || {};

      const ceoPortrait = getCeoPortrait(validation.ticker);

      res.json({
        success: true,
        data: {
          ticker: validation.ticker,
          companyName: profile.name,
          sector: profile.sector,
          industry: profile.industry,
          description: profile.description,
          ceo: profile.ceo,
          ceoPortrait: ceoPortrait,
          employees: profile.employees,
          headquarters: profile.headquarters,
          website: profile.website,
          logo: profile.image,
          peRatio: latestMetrics.peRatio,
          pbRatio: latestMetrics.pbRatio,
          debtToEquity: latestMetrics.debtToEquity,
          currentRatio: latestMetrics.currentRatio,
          roe: latestMetrics.roe,
          roa: latestMetrics.roa,
          dividendYield: latestMetrics.dividendYield
        }
      });
    } catch (err) {
      logger.warn('FMP failed, using mock data', { ticker: validation.ticker, error: err.message });
      res.json({
        success: true,
        data: getMockFinancials(validation.ticker)
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/profile
 * Get company profile
 */
router.get('/:ticker/profile', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const profile = await fmp.getProfile(validation.ticker);
      res.json({ success: true, data: profile });
    } catch (err) {
      logger.warn('FMP profile failed', { ticker: validation.ticker, error: err.message });
      res.json({
        success: true,
        data: {
          ticker: validation.ticker,
          name: `${validation.ticker} Inc.`,
          isMock: true
        }
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/income
 * Get income statements
 */
router.get('/:ticker/income', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { period = 'annual', limit = 5 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getIncomeStatement(validation.ticker, period, parseInt(limit));
      res.json({ success: true, data });
    } catch (err) {
      throw new ApiError(503, `Income statement unavailable for ${validation.ticker}`);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/balance
 * Get balance sheet
 */
router.get('/:ticker/balance', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { period = 'annual', limit = 5 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getBalanceSheet(validation.ticker, period, parseInt(limit));
      res.json({ success: true, data });
    } catch (err) {
      throw new ApiError(503, `Balance sheet unavailable for ${validation.ticker}`);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/cashflow
 * Get cash flow statement
 */
router.get('/:ticker/cashflow', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { period = 'annual', limit = 5 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getCashFlow(validation.ticker, period, parseInt(limit));
      res.json({ success: true, data });
    } catch (err) {
      throw new ApiError(503, `Cash flow unavailable for ${validation.ticker}`);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/history
 * Get historical price data from FMP
 */
router.get('/:ticker/history', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { period = '1y' } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const validPeriods = ['1d', '5d', '1m', '3m', '6m', 'ytd', '1y', '5y', '10y'];
    if (!validPeriods.includes(period)) {
      throw new ApiError(400, `Invalid period. Use: ${validPeriods.join(', ')}`);
    }

    try {
      const data = await fmp.getHistoricalPrices(validation.ticker, period);
      res.json({
        success: true,
        data: {
          ticker: validation.ticker,
          period,
          history: data
        }
      });
    } catch (err) {
      throw new ApiError(503, `Historical data unavailable for ${validation.ticker}`);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/executives
 * Get key executives with compensation
 */
router.get('/:ticker/executives', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getKeyExecutives(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Executives fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/rating
 * Get analyst rating
 */
router.get('/:ticker/rating', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getRating(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Rating fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/dcf
 * Get DCF intrinsic value
 */
router.get('/:ticker/dcf', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getDCF(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('DCF fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/ratios
 * Get financial ratios
 */
router.get('/:ticker/ratios', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 5 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getFinancialRatios(validation.ticker, parseInt(limit));
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Ratios fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/enterprise-value
 * Get enterprise value
 */
router.get('/:ticker/enterprise-value', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getEnterpriseValue(validation.ticker, 1);
      res.json({ success: true, data: data[0] || null });
    } catch (err) {
      logger.warn('Enterprise value fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/news
 * Get stock-specific news
 */
router.get('/:ticker/news', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 10 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getStockNews(validation.ticker, parseInt(limit));
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Stock news fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/dividends
 * Get dividend history
 */
router.get('/:ticker/dividends', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getDividends(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Dividends fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/dividend-info
 * Get dividend analytics (growth rate, consecutive years, payout ratio)
 */
router.get('/:ticker/dividend-info', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const [dividends, ratios] = await Promise.all([
        fmp.getDividends(validation.ticker),
        fmp.getFinancialRatios(validation.ticker, 1).catch(() => [])
      ]);

      if (!dividends || dividends.length === 0) {
        return res.json({
          success: true,
          data: {
            paysDividend: false,
            annualDividend: null,
            dividendYield: null,
            dividendGrowthRate: null,
            payoutRatio: null,
            consecutiveYears: 0,
            frequency: null
          }
        });
      }

      // Calculate annual dividends by year
      const dividendsByYear = {};
      for (const d of dividends) {
        const year = new Date(d.date).getFullYear();
        if (!dividendsByYear[year]) dividendsByYear[year] = 0;
        dividendsByYear[year] += d.dividend;
      }

      const years = Object.keys(dividendsByYear).map(Number).sort((a, b) => b - a);
      const currentYear = new Date().getFullYear();
      const lastFullYear = years.find(y => y < currentYear) || years[0];

      // Calculate TTM dividend
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const ttmDividends = dividends.filter(d => new Date(d.date) >= oneYearAgo);
      const annualDividend = ttmDividends.reduce((sum, d) => sum + d.dividend, 0);

      // Calculate growth rate (compare last two full years)
      let dividendGrowthRate = null;
      if (years.length >= 2) {
        const latestYear = dividendsByYear[years[0]];
        const previousYear = dividendsByYear[years[1]];
        if (previousYear > 0) {
          dividendGrowthRate = ((latestYear - previousYear) / previousYear) * 100;
        }
      }

      // Calculate consecutive years of dividend payments
      let consecutiveYears = 0;
      for (let i = 0; i < years.length; i++) {
        if (i === 0 || years[i] === years[i - 1] - 1) {
          consecutiveYears++;
        } else {
          break;
        }
      }

      // Get payout ratio from financial ratios if available
      const latestRatios = ratios[0] || {};
      const payoutRatio = latestRatios.payoutRatio || latestRatios.dividendPayoutRatio || null;
      const dividendYield = latestRatios.dividendYield || null;

      // Determine frequency
      let frequency = null;
      if (ttmDividends.length >= 4) frequency = 'Quarterly';
      else if (ttmDividends.length >= 2) frequency = 'Semi-Annual';
      else if (ttmDividends.length >= 1) frequency = 'Annual';

      res.json({
        success: true,
        data: {
          paysDividend: true,
          annualDividend,
          dividendYield: dividendYield ? dividendYield * 100 : null,
          dividendGrowthRate,
          payoutRatio: payoutRatio ? payoutRatio * 100 : null,
          consecutiveYears,
          frequency,
          lastDividendDate: dividends[0]?.date || null,
          lastDividendAmount: dividends[0]?.dividend || null
        }
      });
    } catch (err) {
      logger.warn('Dividend info fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/splits
 * Get stock split history
 */
router.get('/:ticker/splits', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getStockSplits(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Stock splits fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/price-target
 * Get price target consensus
 */
router.get('/:ticker/price-target', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getPriceTarget(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Price target fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/peers
 * Get competitor stocks
 */
router.get('/:ticker/peers', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getStockPeers(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Stock peers fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/segments
 * Get revenue by segment/product
 */
router.get('/:ticker/segments', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { period = 'annual' } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getRevenueSegments(validation.ticker, period);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Revenue segments fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/institutional
 * Get institutional holders
 */
router.get('/:ticker/institutional', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getInstitutionalHolders(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Institutional holders fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/earnings/calendar
 * Get upcoming earnings calendar
 * Supports: ?days=7 OR ?from=2025-01-01&to=2025-01-31
 */
router.get('/earnings/calendar', async (req, res, next) => {
  try {
    let from, to;

    // Support both date range params and days param
    if (req.query.from && req.query.to) {
      from = req.query.from;
      to = req.query.to;
    } else {
      const days = req.query.days || 7;
      const numDays = Math.min(Math.max(parseInt(days) || 7, 1), 90);
      const today = new Date();
      from = today.toISOString().split('T')[0];
      const toDate = new Date(today);
      toDate.setDate(toDate.getDate() + numDays);
      to = toDate.toISOString().split('T')[0];
    }

    try {
      const data = await fmp.getEarningsCalendar(from, to);
      res.json({ success: true, data, meta: { from, to, count: data?.length || 0 } });
    } catch (err) {
      logger.warn('Earnings calendar fetch failed', { from, to, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/earnings-history
 * Get earnings surprises history
 */
router.get('/:ticker/earnings-history', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 8 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getEarningsSurprises(validation.ticker, parseInt(limit));
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Earnings surprises fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/sec-filings
 * Get SEC filings
 */
router.get('/:ticker/sec-filings', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 20 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getSecFilings(validation.ticker, parseInt(limit));
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('SEC filings fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/analyst-grades
 * Get analyst upgrade/downgrade history
 */
router.get('/:ticker/analyst-grades', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 20 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getAnalystGrades(validation.ticker, parseInt(limit));
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Analyst grades fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/insider-trades
 * Get insider trades for a stock
 */
router.get('/:ticker/insider-trades', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 20 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getInsiderTradesBySymbol(validation.ticker);
      res.json({ success: true, data: data.slice(0, parseInt(limit)) });
    } catch (err) {
      logger.warn('Insider trades fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/key-metrics
 * Get key financial metrics for scorecard
 */
router.get('/:ticker/key-metrics', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const [metrics, ratios, growth] = await Promise.all([
        fmp.getKeyMetrics(validation.ticker, 1),
        fmp.getFinancialRatios(validation.ticker, 1),
        fmp.getFinancialGrowth(validation.ticker, 1).catch(() => [])
      ]);

      const m = metrics[0] || {};
      const r = ratios[0] || {};
      const g = growth[0] || {};

      res.json({
        success: true,
        data: {
          // Valuation (from ratios)
          peRatio: r.peRatio,
          pbRatio: r.pbRatio,
          evToEbitda: m.evToEBITDA,
          pegRatio: r.pegRatio,
          // Profitability (from ratios)
          grossProfitMargin: r.grossProfitMargin,
          operatingProfitMargin: r.operatingProfitMargin,
          netProfitMargin: r.netProfitMargin,
          roe: r.returnOnEquity || m.returnOnEquity,
          roa: r.returnOnAssets || m.returnOnAssets,
          // Growth (from growth)
          revenueGrowth: g.revenueGrowth,
          epsGrowth: g.epsGrowth,
          // Financial Health
          debtToEquity: r.debtToEquityRatio || m.debtToEquity,
          currentRatio: r.currentRatio || m.currentRatio,
          freeCashFlow: r.freeCashFlowPerShare,
          // Dividends
          dividendYield: r.dividendYield
        }
      });
    } catch (err) {
      logger.warn('Key metrics fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/revenue-segments
 * Get revenue by product and geographic segments
 */
router.get('/:ticker/revenue-segments', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const [productData, geoData] = await Promise.all([
        fmp.getProductRevenue(validation.ticker),
        fmp.getGeographicRevenue(validation.ticker)
      ]);

      // Transform the data into flat arrays
      const productSegments = [];
      const geographicSegments = [];

      // Process product revenue
      if (Array.isArray(productData) && productData.length > 0) {
        const latestYear = productData[0];
        const year = new Date(latestYear.date || latestYear.fiscalYear || '').getFullYear() || new Date().getFullYear();
        for (const [key, value] of Object.entries(latestYear)) {
          if (key !== 'date' && key !== 'symbol' && key !== 'fiscalYear' && typeof value === 'number' && value > 0) {
            const segment = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, s => s.toUpperCase())
              .replace('Revenue', '')
              .trim();
            productSegments.push({ segment, revenue: value, year });
          }
        }
      }

      // Process geographic revenue
      if (Array.isArray(geoData) && geoData.length > 0) {
        const latestYear = geoData[0];
        const year = new Date(latestYear.date || latestYear.fiscalYear || '').getFullYear() || new Date().getFullYear();
        for (const [key, value] of Object.entries(latestYear)) {
          if (key !== 'date' && key !== 'symbol' && key !== 'fiscalYear' && typeof value === 'number' && value > 0) {
            const segment = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, s => s.toUpperCase())
              .replace('Revenue', '')
              .trim();
            geographicSegments.push({ segment, revenue: value, year });
          }
        }
      }

      res.json({
        success: true,
        data: {
          productSegments: productSegments.sort((a, b) => b.revenue - a.revenue),
          geographicSegments: geographicSegments.sort((a, b) => b.revenue - a.revenue)
        }
      });
    } catch (err) {
      logger.warn('Revenue segments fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({
        success: true,
        data: { productSegments: [], geographicSegments: [] },
        error: { code: 'FMP_ERROR', message: err.message }
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/full
 * Get all financial data in one call (for initial page load)
 */
router.get('/:ticker/full', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const results = await Promise.allSettled([
      fmp.getProfile(validation.ticker),
      fmp.getKeyExecutives(validation.ticker),
      fmp.getKeyMetrics(validation.ticker, 1),
      fmp.getRating(validation.ticker),
      fmp.getDCF(validation.ticker),
      fmp.getPriceTarget(validation.ticker),
      fmp.getStockPeers(validation.ticker)
    ]);

    const [profile, executives, metrics, rating, dcf, priceTarget, peers] = results;

    const ceoPortrait = getCeoPortrait(validation.ticker);

    res.json({
      success: true,
      data: {
        profile: profile.status === 'fulfilled' ? profile.value : null,
        executives: executives.status === 'fulfilled' ? executives.value : [],
        metrics: metrics.status === 'fulfilled' ? metrics.value[0] : null,
        rating: rating.status === 'fulfilled' ? rating.value : null,
        dcf: dcf.status === 'fulfilled' ? dcf.value : null,
        priceTarget: priceTarget.status === 'fulfilled' ? priceTarget.value : null,
        peers: peers.status === 'fulfilled' ? peers.value : [],
        ceoPortrait: ceoPortrait
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/estimates
 * Get analyst estimates (EPS and revenue forecasts)
 */
router.get('/:ticker/estimates', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { period = 'quarter', limit = 8 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const estimates = await fmp.getAnalystEstimates(validation.ticker, period, parseInt(limit));
      res.json({
        success: true,
        data: estimates
      });
    } catch (err) {
      logger.warn('Analyst estimates fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/detailed-grades
 * Get detailed analyst grades with individual recommendations
 */
router.get('/:ticker/detailed-grades', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 100 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const grades = await fmp.getDetailedGrades(validation.ticker, parseInt(limit));
      res.json({
        success: true,
        data: grades
      });
    } catch (err) {
      logger.warn('Detailed grades fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/price-target-summary
 * Get aggregated price target statistics
 */
router.get('/:ticker/price-target-summary', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const summary = await fmp.getPriceTargetSummary(validation.ticker);
      res.json({
        success: true,
        data: summary
      });
    } catch (err) {
      logger.warn('Price target summary fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/holders
 * Get institutional and mutual fund holders
 */
router.get('/:ticker/holders', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 20 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const [institutional, mutualFunds] = await Promise.all([
        fmp.getInstitutionalHolders(validation.ticker).catch(() => []),
        fmp.getMutualFundHolders(validation.ticker, parseInt(limit)).catch(() => [])
      ]);

      res.json({
        success: true,
        data: {
          institutional: institutional.slice(0, parseInt(limit)),
          mutualFunds
        }
      });
    } catch (err) {
      logger.warn('Holders fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({
        success: true,
        data: { institutional: [], mutualFunds: [] },
        error: { code: 'FMP_ERROR', message: err.message }
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/etf-holdings
 * Get ETF holdings (for ETF tickers only)
 */
router.get('/:ticker/etf-holdings', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 50 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const holdings = await fmp.getETFHoldings(validation.ticker, parseInt(limit));
      res.json({
        success: true,
        data: holdings
      });
    } catch (err) {
      logger.warn('ETF holdings fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/press-releases
 * Get company press releases
 */
router.get('/:ticker/press-releases', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 20 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const releases = await fmp.getPressReleases(validation.ticker, parseInt(limit));
      res.json({
        success: true,
        data: releases
      });
    } catch (err) {
      logger.warn('Press releases fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: [], error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// FMP STARTER PACK EXPANSION - New Endpoints
// ============================================================================

/**
 * GET /api/financials/:ticker/score
 * Get financial health scores (Piotroski F-Score & Altman Z-Score)
 */
router.get('/:ticker/score', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getFinancialScore(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Financial score fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/float
 * Get shares float data
 */
router.get('/:ticker/float', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getSharesFloat(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Shares float fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/insider-stats
 * Get aggregated insider trading statistics
 */
router.get('/:ticker/insider-stats', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getInsiderTradeStats(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Insider stats fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/aftermarket
 * Get pre/post market quotes
 */
router.get('/:ticker/aftermarket', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getAftermarketQuote(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('Aftermarket quote fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/income-ttm
 * Get trailing twelve months income statement
 */
router.get('/:ticker/income-ttm', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getIncomeStatementTTM(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('TTM income statement fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/balance-ttm
 * Get trailing twelve months balance sheet
 */
router.get('/:ticker/balance-ttm', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getBalanceSheetTTM(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('TTM balance sheet fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/:ticker/cashflow-ttm
 * Get trailing twelve months cash flow statement
 */
router.get('/:ticker/cashflow-ttm', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    try {
      const data = await fmp.getCashFlowTTM(validation.ticker);
      res.json({ success: true, data });
    } catch (err) {
      logger.warn('TTM cash flow fetch failed', { ticker: validation.ticker, error: err.message });
      res.json({ success: true, data: null, error: { code: 'FMP_ERROR', message: err.message } });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
