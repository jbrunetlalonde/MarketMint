import { config } from '../config/env.js';

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

const memoryCache = new Map();
const pendingRequests = new Map();

function getCacheKey(type, param = '') {
  return `insider:${type}${param ? `:${param}` : ''}`;
}

function getFromMemoryCache(key) {
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  memoryCache.delete(key);
  return null;
}

function setMemoryCache(key, data, ttlSeconds) {
  memoryCache.set(key, {
    data,
    expires: Date.now() + ttlSeconds * 1000
  });
}

async function deduplicatedRequest(key, fetchFn) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetchFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

async function fetchFMP(endpoint) {
  if (!config.fmpApiKey) {
    throw new Error('FMP_API_KEY not configured');
  }

  const url = `${FMP_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${config.fmpApiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

// Mock data for when FMP API key is not configured
const MOCK_INSIDER_TRADES = [
  {
    id: 1,
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    reporterName: 'Tim Cook',
    reporterTitle: 'Chief Executive Officer',
    transactionType: 'SALE',
    transactionDate: '2024-11-28',
    filingDate: '2024-11-30',
    sharesTransacted: 500000,
    sharePrice: 234.50,
    totalValue: 117250000,
    sharesOwned: 3500000
  },
  {
    id: 2,
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    reporterName: 'Satya Nadella',
    reporterTitle: 'Chief Executive Officer',
    transactionType: 'SALE',
    transactionDate: '2024-11-25',
    filingDate: '2024-11-27',
    sharesTransacted: 150000,
    sharePrice: 430.25,
    totalValue: 64537500,
    sharesOwned: 825000
  },
  {
    id: 3,
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    reporterName: 'Jensen Huang',
    reporterTitle: 'Chief Executive Officer',
    transactionType: 'SALE',
    transactionDate: '2024-11-22',
    filingDate: '2024-11-24',
    sharesTransacted: 200000,
    sharePrice: 142.80,
    totalValue: 28560000,
    sharesOwned: 86700000
  },
  {
    id: 4,
    symbol: 'TSLA',
    companyName: 'Tesla Inc.',
    reporterName: 'Elon Musk',
    reporterTitle: 'Chief Executive Officer',
    transactionType: 'PURCHASE',
    transactionDate: '2024-11-20',
    filingDate: '2024-11-22',
    sharesTransacted: 100000,
    sharePrice: 352.40,
    totalValue: 35240000,
    sharesOwned: 715000000
  },
  {
    id: 5,
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    reporterName: 'Ruth Porat',
    reporterTitle: 'Chief Financial Officer',
    transactionType: 'SALE',
    transactionDate: '2024-11-18',
    filingDate: '2024-11-20',
    sharesTransacted: 8000,
    sharePrice: 180.50,
    totalValue: 1444000,
    sharesOwned: 42000
  },
  {
    id: 6,
    symbol: 'META',
    companyName: 'Meta Platforms Inc.',
    reporterName: 'Mark Zuckerberg',
    reporterTitle: 'Chief Executive Officer',
    transactionType: 'SALE',
    transactionDate: '2024-11-15',
    filingDate: '2024-11-17',
    sharesTransacted: 75000,
    sharePrice: 580.25,
    totalValue: 43518750,
    sharesOwned: 350000000
  },
  {
    id: 7,
    symbol: 'AMZN',
    companyName: 'Amazon.com Inc.',
    reporterName: 'Andy Jassy',
    reporterTitle: 'Chief Executive Officer',
    transactionType: 'SALE',
    transactionDate: '2024-11-12',
    filingDate: '2024-11-14',
    sharesTransacted: 25000,
    sharePrice: 212.80,
    totalValue: 5320000,
    sharesOwned: 90000
  },
  {
    id: 8,
    symbol: 'JPM',
    companyName: 'JPMorgan Chase & Co.',
    reporterName: 'Jamie Dimon',
    reporterTitle: 'Chief Executive Officer',
    transactionType: 'PURCHASE',
    transactionDate: '2024-11-10',
    filingDate: '2024-11-12',
    sharesTransacted: 50000,
    sharePrice: 245.30,
    totalValue: 12265000,
    sharesOwned: 8400000
  }
];

function getMockTrades(options = {}) {
  const { ticker, transactionType, limit = 50 } = options;

  let trades = [...MOCK_INSIDER_TRADES];

  if (ticker) {
    trades = trades.filter(t => t.symbol.toUpperCase() === ticker.toUpperCase());
  }

  if (transactionType) {
    trades = trades.filter(t =>
      t.transactionType.toUpperCase().includes(transactionType.toUpperCase())
    );
  }

  return trades.slice(0, Number(limit)).map(t => ({ ...t, isMock: true }));
}

export async function getInsiderTrades(options = {}) {
  const { ticker, page = 0, limit = 100 } = options;
  const cacheKey = getCacheKey('trades', ticker || 'all');
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      let endpoint = `/insider-trading?page=${page}`;
      if (ticker) {
        endpoint = `/insider-trading?symbol=${ticker}&page=${page}`;
      }

      const data = await fetchFMP(endpoint);

      if (!Array.isArray(data) || data.length === 0) {
        console.warn('No insider trading data from FMP, using mock data');
        return getMockTrades({ ticker, limit });
      }

      const formatted = data.slice(0, limit).map((item, index) => ({
        id: index + 1,
        symbol: item.symbol,
        companyName: item.companyName || item.symbol,
        reporterName: item.reportingName,
        reporterTitle: item.typeOfOwner,
        transactionType: item.transactionType?.toUpperCase() === 'P' ? 'PURCHASE' :
                         item.transactionType?.toUpperCase() === 'S' ? 'SALE' :
                         item.transactionType?.toUpperCase() || 'UNKNOWN',
        transactionDate: item.transactionDate,
        filingDate: item.filingDate,
        sharesTransacted: item.securitiesTransacted,
        sharePrice: item.price,
        totalValue: item.securitiesTransacted * (item.price || 0),
        sharesOwned: item.securitiesOwned
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn('FMP insider trading failed, using mock data:', err.message);
      return getMockTrades({ ticker, limit });
    }
  });
}

export async function getInsiderTradesByTicker(ticker) {
  const cacheKey = getCacheKey('ticker-trades', ticker);
  const ttl = 3600;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/insider-trading?symbol=${ticker}`);

      if (!Array.isArray(data) || data.length === 0) {
        return getMockTrades({ ticker, limit: 20 });
      }

      const formatted = data.slice(0, 50).map((item, index) => ({
        id: index + 1,
        symbol: item.symbol,
        companyName: item.companyName || item.symbol,
        reporterName: item.reportingName,
        reporterTitle: item.typeOfOwner,
        transactionType: item.transactionType?.toUpperCase() === 'P' ? 'PURCHASE' :
                         item.transactionType?.toUpperCase() === 'S' ? 'SALE' :
                         item.transactionType?.toUpperCase() || 'UNKNOWN',
        transactionDate: item.transactionDate,
        filingDate: item.filingDate,
        sharesTransacted: item.securitiesTransacted,
        sharePrice: item.price,
        totalValue: item.securitiesTransacted * (item.price || 0),
        sharesOwned: item.securitiesOwned
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP insider trades for ${ticker} failed:`, err.message);
      return getMockTrades({ ticker, limit: 20 });
    }
  });
}

export async function getLatestInsiderTrades(limit = 50) {
  const cacheKey = getCacheKey('latest', String(limit));
  const ttl = 1800; // 30 minutes

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP('/insider-trading?page=0');

      if (!Array.isArray(data) || data.length === 0) {
        return getMockTrades({ limit });
      }

      // Sort by filing date desc and take top trades
      const sorted = data
        .sort((a, b) => new Date(b.filingDate) - new Date(a.filingDate))
        .slice(0, limit);

      const formatted = sorted.map((item, index) => ({
        id: index + 1,
        symbol: item.symbol,
        companyName: item.companyName || item.symbol,
        reporterName: item.reportingName,
        reporterTitle: item.typeOfOwner,
        transactionType: item.transactionType?.toUpperCase() === 'P' ? 'PURCHASE' :
                         item.transactionType?.toUpperCase() === 'S' ? 'SALE' :
                         item.transactionType?.toUpperCase() || 'UNKNOWN',
        transactionDate: item.transactionDate,
        filingDate: item.filingDate,
        sharesTransacted: item.securitiesTransacted,
        sharePrice: item.price,
        totalValue: item.securitiesTransacted * (item.price || 0),
        sharesOwned: item.securitiesOwned
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn('FMP latest insider trades failed:', err.message);
      return getMockTrades({ limit });
    }
  });
}

export function getInsiderStats(trades) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      purchaseCount: 0,
      saleCount: 0,
      totalValue: 0,
      topBuyers: [],
      topSellers: []
    };
  }

  const purchases = trades.filter(t => t.transactionType === 'PURCHASE');
  const sales = trades.filter(t => t.transactionType === 'SALE');

  const buyerValues = {};
  const sellerValues = {};

  trades.forEach(t => {
    if (t.transactionType === 'PURCHASE') {
      buyerValues[t.reporterName] = (buyerValues[t.reporterName] || 0) + t.totalValue;
    } else if (t.transactionType === 'SALE') {
      sellerValues[t.reporterName] = (sellerValues[t.reporterName] || 0) + t.totalValue;
    }
  });

  const topBuyers = Object.entries(buyerValues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const topSellers = Object.entries(sellerValues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const totalValue = trades.reduce((sum, t) => sum + (t.totalValue || 0), 0);

  return {
    totalTrades: trades.length,
    purchaseCount: purchases.length,
    saleCount: sales.length,
    totalValue,
    topBuyers,
    topSellers
  };
}

export function getCacheStats() {
  return {
    memoryCacheSize: memoryCache.size,
    pendingRequests: pendingRequests.size
  };
}

export function clearCache() {
  memoryCache.clear();
}

export default {
  getInsiderTrades,
  getInsiderTradesByTicker,
  getLatestInsiderTrades,
  getInsiderStats,
  getCacheStats,
  clearCache
};
