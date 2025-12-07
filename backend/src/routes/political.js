import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.js';
import politicalTracker from '../services/politicalTracker.js';
import { validatePagination, validateTicker, sanitizeString } from '../utils/validation.js';

const router = Router();

// Helper to generate portrait URL
function getPortraitUrl(name, chamber) {
  const filename = name.toLowerCase().replace(/\s+/g, '-');
  return `/portraits/${chamber}-${filename}.png`;
}

// Fallback mock data when API is not configured
const MOCK_TRADES = [
  {
    id: 1,
    officialName: 'Tommy Tuberville',
    party: 'Republican',
    title: 'Senator',
    state: 'AL',
    ticker: 'NVDA',
    assetDescription: 'NVIDIA Corporation - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-12-01',
    reportedDate: '2024-12-04',
    amountDisplay: '$500K - $1M',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Tommy Tuberville', 'senate')
  },
  {
    id: 2,
    officialName: 'Mark Kelly',
    party: 'Democrat',
    title: 'Senator',
    state: 'AZ',
    ticker: 'MSFT',
    assetDescription: 'Microsoft Corporation - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-28',
    reportedDate: '2024-12-02',
    amountDisplay: '$100K - $250K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Mark Kelly', 'senate')
  },
  {
    id: 3,
    officialName: 'Marco Rubio',
    party: 'Republican',
    title: 'Senator',
    state: 'FL',
    ticker: 'AAPL',
    assetDescription: 'Apple Inc - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-25',
    reportedDate: '2024-11-30',
    amountDisplay: '$50K - $100K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Marco Rubio', 'senate')
  },
  {
    id: 4,
    officialName: 'Elizabeth Warren',
    party: 'Democrat',
    title: 'Senator',
    state: 'MA',
    ticker: 'TSLA',
    assetDescription: 'Tesla Inc - Common Stock',
    transactionType: 'SELL',
    transactionDate: '2024-11-22',
    reportedDate: '2024-11-28',
    amountDisplay: '$250K - $500K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Elizabeth Warren', 'senate')
  },
  {
    id: 5,
    officialName: 'Chuck Schumer',
    party: 'Democrat',
    title: 'Senator',
    state: 'NY',
    ticker: 'GOOGL',
    assetDescription: 'Alphabet Inc Class A - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-20',
    reportedDate: '2024-11-26',
    amountDisplay: '$15K - $50K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Chuck Schumer', 'senate')
  },
  {
    id: 6,
    officialName: 'Mitch McConnell',
    party: 'Republican',
    title: 'Senator',
    state: 'KY',
    ticker: 'BA',
    assetDescription: 'Boeing Company - Common Stock',
    transactionType: 'SELL',
    transactionDate: '2024-11-18',
    reportedDate: '2024-11-24',
    amountDisplay: '$100K - $250K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Mitch McConnell', 'senate')
  },
  {
    id: 7,
    officialName: 'Nancy Mace',
    party: 'Republican',
    title: 'Representative',
    state: 'SC',
    ticker: 'META',
    assetDescription: 'Meta Platforms Inc - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-15',
    reportedDate: '2024-11-22',
    amountDisplay: '$50K - $100K',
    chamber: 'house',
    portraitUrl: getPortraitUrl('Nancy Mace', 'house')
  },
  {
    id: 8,
    officialName: 'Josh Gottheimer',
    party: 'Democrat',
    title: 'Representative',
    state: 'NJ',
    ticker: 'AMZN',
    assetDescription: 'Amazon.com Inc - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-12',
    reportedDate: '2024-11-19',
    amountDisplay: '$250K - $500K',
    chamber: 'house',
    portraitUrl: getPortraitUrl('Josh Gottheimer', 'house')
  },
  {
    id: 9,
    officialName: 'Tim Scott',
    party: 'Republican',
    title: 'Senator',
    state: 'SC',
    ticker: 'JPM',
    assetDescription: 'JPMorgan Chase & Co - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-10',
    reportedDate: '2024-11-17',
    amountDisplay: '$15K - $50K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Tim Scott', 'senate')
  },
  {
    id: 10,
    officialName: 'Rand Paul',
    party: 'Republican',
    title: 'Senator',
    state: 'KY',
    ticker: 'NVDA',
    assetDescription: 'NVIDIA Corporation - Common Stock',
    transactionType: 'SELL',
    transactionDate: '2024-11-08',
    reportedDate: '2024-11-15',
    amountDisplay: '$1M - $5M',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Rand Paul', 'senate')
  },
  {
    id: 11,
    officialName: 'Amy Klobuchar',
    party: 'Democrat',
    title: 'Senator',
    state: 'MN',
    ticker: 'AAPL',
    assetDescription: 'Apple Inc - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-05',
    reportedDate: '2024-11-12',
    amountDisplay: '$50K - $100K',
    chamber: 'senate',
    portraitUrl: getPortraitUrl('Amy Klobuchar', 'senate')
  },
  {
    id: 12,
    officialName: 'Dan Crenshaw',
    party: 'Republican',
    title: 'Representative',
    state: 'TX',
    ticker: 'XOM',
    assetDescription: 'Exxon Mobil Corporation - Common Stock',
    transactionType: 'BUY',
    transactionDate: '2024-11-02',
    reportedDate: '2024-11-10',
    amountDisplay: '$100K - $250K',
    chamber: 'house',
    portraitUrl: getPortraitUrl('Dan Crenshaw', 'house')
  }
];

function getMockTrades(options = {}) {
  const { party, ticker, chamber, transactionType, limit = 50 } = options;

  let trades = [...MOCK_TRADES];

  if (party) {
    trades = trades.filter(t => t.party.toLowerCase().includes(party.toLowerCase()));
  }

  if (ticker) {
    trades = trades.filter(t => t.ticker.toUpperCase() === ticker.toUpperCase());
  }

  if (chamber) {
    trades = trades.filter(t => t.chamber === chamber.toLowerCase());
  }

  if (transactionType) {
    trades = trades.filter(t => t.transactionType === transactionType.toUpperCase());
  }

  return trades.slice(0, Number(limit)).map(t => ({ ...t, isMock: true }));
}

/**
 * GET /api/political/trades
 * Get recent political trades
 * Query params: party, ticker, chamber, transactionType, limit
 */
router.get('/trades', async (req, res, next) => {
  try {
    const { party, ticker, chamber, transactionType, limit } = req.query;
    const { limit: safeLimit } = validatePagination(0, limit);
    const safeParty = sanitizeString(party);
    const safeTicker = ticker ? sanitizeString(ticker, 5)?.toUpperCase() : undefined;
    const safeChamber = sanitizeString(chamber);
    const safeType = sanitizeString(transactionType);

    try {
      const trades = await politicalTracker.getRecentTrades({
        party: safeParty,
        ticker: safeTicker,
        chamber: safeChamber,
        transactionType: safeType,
        limit: safeLimit
      });

      // If no trades found, use mock data
      if (!trades || trades.length === 0) {
        res.json({
          success: true,
          data: getMockTrades({ party, ticker, chamber, transactionType, limit })
        });
        return;
      }

      res.json({
        success: true,
        data: trades
      });
    } catch (err) {
      console.warn('Finnhub political trades failed, using mock data:', err.message);
      res.json({
        success: true,
        data: getMockTrades({ party, ticker, chamber, transactionType, limit })
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/political/trades/:ticker
 * Get political trades for a specific stock
 */
router.get('/trades/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit } = req.query;
    const safeTicker = validateTicker(ticker);
    const { limit: safeLimit } = validatePagination(0, limit);

    try {
      const trades = await politicalTracker.getCongressionalTrades(safeTicker);

      res.json({
        success: true,
        data: trades.slice(0, safeLimit)
      });
    } catch (err) {
      console.warn(`Finnhub trades for ${ticker} failed:`, err.message);
      res.json({
        success: true,
        data: getMockTrades({ ticker: ticker.toUpperCase(), limit })
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/political/officials
 * Get list of political officials with portraits
 * Query params: party, chamber, limit
 */
router.get('/officials', async (req, res, next) => {
  try {
    const { party, chamber, limit } = req.query;
    const { limit: safeLimit } = validatePagination(0, limit, { defaultLimit: 100, maxLimit: 600 });
    const safeParty = sanitizeString(party);
    const safeChamber = sanitizeString(chamber);

    const officials = await politicalTracker.getOfficials({
      party: safeParty,
      chamber: safeChamber,
      limit: safeLimit
    });

    res.json({
      success: true,
      data: officials
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/political/officials/:name
 * Get single official by name with all their trades
 */
router.get('/officials/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { limit } = req.query;
    const decodedName = decodeURIComponent(name);
    const { limit: safeLimit } = validatePagination(0, limit, { defaultLimit: 100, maxLimit: 500 });

    // Use direct database query instead of fetching all trades and filtering in memory
    const [official, officialTrades] = await Promise.all([
      politicalTracker.getOfficialByName(decodedName),
      politicalTracker.getTradesByOfficial(decodedName, { limit: safeLimit })
    ]);

    // If no official found but we have trades, construct from trade data
    if (!official && officialTrades.length > 0) {
      const first = officialTrades[0];
      res.json({
        success: true,
        data: {
          id: '',
          name: first.officialName,
          title: first.title,
          party: first.party,
          state: first.state,
          district: null,
          portraitUrl: null,
          chamber: first.chamber || 'house',
          recentTrades: officialTrades
        }
      });
      return;
    }

    if (!official) {
      throw new ApiError(404, 'Official not found');
    }

    res.json({
      success: true,
      data: {
        ...official,
        recentTrades: officialTrades
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/political/watchlist-trades
 * Get trades for stocks in user's watchlist (requires auth)
 */
router.get('/watchlist-trades', authenticate, async (req, res, next) => {
  try {
    const trades = await politicalTracker.getWatchlistTrades(req.user.id);

    res.json({
      success: true,
      data: trades
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/political/refresh
 * Refresh political trades for common tickers (admin only)
 */
router.post('/refresh', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const results = await politicalTracker.refreshCommonTickers();

    res.json({
      success: true,
      data: results
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/political/senate/stats
 * Get Senate trading statistics (SQL aggregation)
 */
router.get('/senate/stats', async (req, res, next) => {
  try {
    const stats = await politicalTracker.getChamberStats('senate');

    if (stats.totalTrades === 0) {
      const mockTrades = getMockTrades({ chamber: 'senate', limit: 100 });
      return res.json({
        success: true,
        data: computeStats(mockTrades)
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/political/house/stats
 * Get House trading statistics (SQL aggregation)
 */
router.get('/house/stats', async (req, res, next) => {
  try {
    const stats = await politicalTracker.getChamberStats('house');

    if (stats.totalTrades === 0) {
      const mockTrades = getMockTrades({ chamber: 'house', limit: 100 });
      return res.json({
        success: true,
        data: computeStats(mockTrades)
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/political/officials/:name/stats
 * Get statistics for a specific official (SQL aggregation)
 */
router.get('/officials/:name/stats', async (req, res, next) => {
  try {
    const { name } = req.params;
    const decodedName = decodeURIComponent(name);

    const stats = await politicalTracker.getOfficialStats(decodedName);

    if (!stats) {
      throw new ApiError(404, 'No trades found for this official');
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
});

// Helper function to compute stats from trades
function computeStats(trades) {
  const buyCount = trades.filter(t => t.transactionType === 'BUY').length;
  const sellCount = trades.filter(t => t.transactionType === 'SELL').length;

  const traderCounts = {};
  const tickerCounts = {};

  trades.forEach(t => {
    traderCounts[t.officialName] = (traderCounts[t.officialName] || 0) + 1;
    tickerCounts[t.ticker] = (tickerCounts[t.ticker] || 0) + 1;
  });

  const topTraders = Object.entries(traderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topStocks = Object.entries(tickerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ticker, count]) => ({ ticker, count }));

  return {
    totalTrades: trades.length,
    buyCount,
    sellCount,
    uniqueTraders: Object.keys(traderCounts).length,
    uniqueStocks: Object.keys(tickerCounts).length,
    topTraders,
    topStocks
  };
}

/**
 * GET /api/political/cache-stats
 * Get cache statistics
 */
router.get('/cache-stats', (req, res) => {
  res.json({
    success: true,
    data: politicalTracker.getCacheStats()
  });
});

export default router;
