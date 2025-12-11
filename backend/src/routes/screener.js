import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import fmp from '../services/financialModelPrep.js';

const router = Router();

const VALID_SECTORS = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Communication Services', 'Industrials', 'Consumer Defensive', 'Energy',
  'Basic Materials', 'Real Estate', 'Utilities'
];

const VALID_EXCHANGES = ['NYSE', 'NASDAQ', 'AMEX'];

/**
 * GET /api/screener
 * Screen stocks with filters
 * Query params: sector, industry, exchange, marketCapMin, marketCapMax,
 *               priceMin, priceMax, volumeMin, dividendMin, limit
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      sector,
      industry,
      exchange,
      marketCapMin,
      marketCapMax,
      priceMin,
      priceMax,
      volumeMin,
      dividendMin,
      betaMin,
      betaMax,
      isEtf,
      limit = 50
    } = req.query;

    const filters = {
      country: 'US',
      isActivelyTrading: true,
      limit: Math.min(parseInt(limit, 10) || 50, 100)
    };

    if (sector && VALID_SECTORS.includes(sector)) {
      filters.sector = sector;
    }
    if (industry) {
      filters.industry = industry;
    }
    if (exchange && VALID_EXCHANGES.includes(exchange)) {
      filters.exchange = exchange;
    }
    if (marketCapMin) {
      filters.marketCapMoreThan = parseInt(marketCapMin, 10);
    }
    if (marketCapMax) {
      filters.marketCapLowerThan = parseInt(marketCapMax, 10);
    }
    if (priceMin) {
      filters.priceMoreThan = parseFloat(priceMin);
    }
    if (priceMax) {
      filters.priceLowerThan = parseFloat(priceMax);
    }
    if (volumeMin) {
      filters.volumeMoreThan = parseInt(volumeMin, 10);
    }
    if (dividendMin) {
      filters.dividendMoreThan = parseFloat(dividendMin);
    }
    if (betaMin) {
      filters.betaMoreThan = parseFloat(betaMin);
    }
    if (betaMax) {
      filters.betaLowerThan = parseFloat(betaMax);
    }
    if (isEtf === 'true') {
      filters.isEtf = true;
    } else if (isEtf === 'false') {
      filters.isEtf = false;
    }

    const stocks = await fmp.screenStocks(filters);

    res.json({
      success: true,
      data: stocks,
      meta: {
        count: stocks.length,
        filters: Object.keys(filters).filter(k => k !== 'limit' && k !== 'country' && k !== 'isActivelyTrading')
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/screener/sectors
 * Get available sectors
 */
router.get('/sectors', (req, res) => {
  res.json({
    success: true,
    data: VALID_SECTORS
  });
});

/**
 * GET /api/screener/exchanges
 * Get available exchanges
 */
router.get('/exchanges', (req, res) => {
  res.json({
    success: true,
    data: VALID_EXCHANGES
  });
});

export default router;
