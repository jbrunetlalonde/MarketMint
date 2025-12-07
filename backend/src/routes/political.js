import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import politicalTracker from '../services/politicalTracker.js';

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
    const { party, ticker, chamber, transactionType, limit = 50 } = req.query;

    try {
      const trades = await politicalTracker.getRecentTrades({
        party,
        ticker,
        chamber,
        transactionType,
        limit: parseInt(limit)
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
    const { limit = 50 } = req.query;

    if (!ticker || !/^[A-Z]{1,5}$/.test(ticker.toUpperCase())) {
      throw new ApiError(400, 'Invalid ticker symbol');
    }

    try {
      const trades = await politicalTracker.getCongressionalTrades(ticker.toUpperCase());

      res.json({
        success: true,
        data: trades.slice(0, parseInt(limit))
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
    const { party, chamber, limit = 100 } = req.query;

    const officials = await politicalTracker.getOfficials({
      party,
      chamber,
      limit: parseInt(limit)
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
    const decodedName = decodeURIComponent(name);

    const official = await politicalTracker.getOfficialByName(decodedName);

    // Get all trades for this official (increase limit for full history)
    const allTrades = await politicalTracker.getRecentTrades({
      limit: 500
    });

    const officialTrades = allTrades.filter(t =>
      t.officialName.toLowerCase() === decodedName.toLowerCase()
    );

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
router.get('/watchlist-trades', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

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
router.post('/refresh', async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

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
 * Get Senate trading statistics
 */
router.get('/senate/stats', async (req, res, next) => {
  try {
    const trades = await politicalTracker.getRecentTrades({ chamber: 'senate', limit: 500 });

    const senateTrades = trades.filter(t =>
      t.title?.toLowerCase().includes('senator')
    );

    if (senateTrades.length === 0) {
      const mockTrades = getMockTrades({ chamber: 'senate', limit: 100 });
      return res.json({
        success: true,
        data: computeStats(mockTrades)
      });
    }

    res.json({
      success: true,
      data: computeStats(senateTrades)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/political/house/stats
 * Get House trading statistics
 */
router.get('/house/stats', async (req, res, next) => {
  try {
    const trades = await politicalTracker.getRecentTrades({ chamber: 'house', limit: 500 });

    const houseTrades = trades.filter(t => {
      const title = t.title?.toLowerCase() || '';
      return title.includes('representative') || title.includes('rep.');
    });

    if (houseTrades.length === 0) {
      const mockTrades = getMockTrades({ chamber: 'house', limit: 100 });
      return res.json({
        success: true,
        data: computeStats(mockTrades)
      });
    }

    res.json({
      success: true,
      data: computeStats(houseTrades)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/political/officials/:name/stats
 * Get statistics for a specific official
 */
router.get('/officials/:name/stats', async (req, res, next) => {
  try {
    const { name } = req.params;
    const decodedName = decodeURIComponent(name);

    const allTrades = await politicalTracker.getRecentTrades({ limit: 500 });
    const officialTrades = allTrades.filter(t =>
      t.officialName.toLowerCase() === decodedName.toLowerCase()
    );

    if (officialTrades.length === 0) {
      throw new ApiError(404, 'No trades found for this official');
    }

    const buyCount = officialTrades.filter(t => t.transactionType === 'BUY').length;
    const sellCount = officialTrades.filter(t => t.transactionType === 'SELL').length;

    const tickerCounts = {};
    const sectorCounts = {};

    officialTrades.forEach(t => {
      tickerCounts[t.ticker] = (tickerCounts[t.ticker] || 0) + 1;
    });

    const topStocks = Object.entries(tickerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ticker, count]) => ({ ticker, count }));

    let totalGap = 0;
    let gapCount = 0;
    officialTrades.forEach(t => {
      if (t.transactionDate && t.reportedDate) {
        const gap = Math.ceil(
          (new Date(t.reportedDate).getTime() - new Date(t.transactionDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (gap > 0) {
          totalGap += gap;
          gapCount++;
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalTrades: officialTrades.length,
        buyCount,
        sellCount,
        uniqueStocks: Object.keys(tickerCounts).length,
        topStocks,
        avgReportingDelay: gapCount > 0 ? Math.round(totalGap / gapCount) : null,
        latestTrade: officialTrades[0]?.transactionDate || null
      }
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
