import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { validateTicker } from '../models/index.js';
import fmp from '../services/financialModelPrep.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Load CEO data for portrait lookup
let ceoData = [];
try {
  const ceoPath = path.join(__dirname, '../../data/fortune500-ceos.json');
  const raw = fs.readFileSync(ceoPath, 'utf-8');
  ceoData = JSON.parse(raw).ceos || [];
} catch (err) {
  console.warn('Could not load CEO data:', err.message);
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

// Fallback mock data when FMP fails
const MOCK_FINANCIALS = {
  AAPL: {
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    marketCap: 2780000000000,
    peRatio: 28.5,
    eps: 6.26,
    dividend: 0.96,
    dividendYield: 0.54,
    revenue: 383285000000,
    netIncome: 96995000000,
    profitMargin: 25.31,
    roe: 160.58,
    debtToEquity: 199.42,
    isMock: true
  },
  MSFT: {
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    sector: 'Technology',
    industry: 'Software - Infrastructure',
    marketCap: 2810000000000,
    peRatio: 35.2,
    eps: 10.76,
    dividend: 3.00,
    dividendYield: 0.79,
    revenue: 211915000000,
    netIncome: 72361000000,
    profitMargin: 34.15,
    roe: 38.60,
    debtToEquity: 42.15,
    isMock: true
  }
};

function getMockFinancials(ticker) {
  if (MOCK_FINANCIALS[ticker]) {
    return MOCK_FINANCIALS[ticker];
  }
  return {
    ticker,
    companyName: `${ticker} Inc.`,
    sector: 'Unknown',
    industry: 'Unknown',
    isMock: true
  };
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
      console.warn(`FMP failed for ${validation.ticker}, using mock data:`, err.message);
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
      console.warn(`FMP profile failed for ${validation.ticker}:`, err.message);
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

    const validPeriods = ['1d', '5d', '1m', '3m', '6m', '1y', '5y'];
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
      res.json({ success: true, data: [] });
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
      res.json({ success: true, data: null });
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
      res.json({ success: true, data: null });
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
      res.json({ success: true, data: [] });
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
      res.json({ success: true, data: null });
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
      res.json({ success: true, data: [] });
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
      res.json({ success: true, data: [] });
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
      res.json({ success: true, data: [] });
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
      res.json({ success: true, data: null });
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
      res.json({ success: true, data: [] });
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
      res.json({ success: true, data: [] });
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
      res.json({ success: true, data: [] });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/financials/earnings/calendar
 * Get upcoming earnings calendar
 */
router.get('/earnings/calendar', async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const numDays = Math.min(Math.max(parseInt(days) || 7, 1), 30);

    const today = new Date();
    const from = today.toISOString().split('T')[0];
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + numDays);
    const to = toDate.toISOString().split('T')[0];

    try {
      const data = await fmp.getEarningsCalendar(from, to);
      res.json({ success: true, data });
    } catch (err) {
      console.warn('Earnings calendar fetch failed:', err.message);
      res.json({ success: true, data: [] });
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

export default router;
