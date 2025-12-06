import { config } from '../config/env.js';
import { query } from '../config/database.js';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// In-memory cache for hot data
const memoryCache = new Map();

// In-flight request deduplication
const pendingRequests = new Map();

function getCacheKey(type, param = '') {
  return `finnhub:${type}${param ? `:${param}` : ''}`;
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

async function fetchFinnhub(endpoint) {
  if (!config.finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY not configured. Please add your Finnhub API key to .env');
  }

  const url = `${FINNHUB_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${config.finnhubApiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid Finnhub API key');
    }
    if (response.status === 429) {
      throw new Error('Finnhub rate limit exceeded');
    }
    throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Map Finnhub transaction type to our schema
function mapTransactionType(type) {
  if (!type) return 'BUY';
  const upper = type.toUpperCase();
  if (upper.includes('SALE') || upper.includes('SELL')) return 'SELL';
  if (upper.includes('PURCHASE') || upper.includes('BUY')) return 'BUY';
  if (upper.includes('EXCHANGE')) return 'EXCHANGE';
  return 'BUY';
}

// Format amount range for display
function formatAmountRange(min, max) {
  const formatNum = (n) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n}`;
  };

  if (min && max && min !== max) {
    return `${formatNum(min)} - ${formatNum(max)}`;
  }
  if (max) return `Up to ${formatNum(max)}`;
  if (min) return `${formatNum(min)}+`;
  return 'Unknown';
}

// Parse congress member position to determine chamber
function parseChamber(position) {
  if (!position) return 'unknown';
  const pos = position.toLowerCase();
  if (pos.includes('senator')) return 'senate';
  if (pos.includes('representative') || pos.includes('rep.')) return 'house';
  return 'unknown';
}

// Save trade to database
async function saveTradeToDB(trade) {
  await query(
    `INSERT INTO political_trades
       (official_name, ticker, asset_description, transaction_type, transaction_date,
        reported_date, amount_min, amount_max, amount_display, retrieved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT DO NOTHING`,
    [
      trade.officialName,
      trade.ticker,
      trade.assetDescription,
      trade.transactionType,
      trade.transactionDate,
      trade.reportedDate,
      trade.amountMin,
      trade.amountMax,
      trade.amountDisplay
    ]
  );
}

// Save multiple trades in batch
async function saveBulkTrades(trades) {
  for (const trade of trades) {
    await saveTradeToDB(trade);
  }
}

// Upsert official in database
async function upsertOfficial(official) {
  const result = await query(
    `INSERT INTO political_officials (name, title, party, state, district)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (name) DO UPDATE SET
       title = COALESCE(EXCLUDED.title, political_officials.title),
       party = COALESCE(EXCLUDED.party, political_officials.party),
       state = COALESCE(EXCLUDED.state, political_officials.state),
       district = COALESCE(EXCLUDED.district, political_officials.district)
     RETURNING id`,
    [official.name, official.title, official.party, official.state, official.district]
  );
  return result.rows[0]?.id;
}

// Get trades from database
async function getTradesFromDB(options = {}) {
  const { ticker, party, chamber, transactionType, limit = 50 } = options;

  let whereConditions = ['1=1'];
  const params = [];
  let paramIndex = 1;

  if (ticker) {
    whereConditions.push(`pt.ticker = $${paramIndex++}`);
    params.push(ticker.toUpperCase());
  }

  if (party) {
    whereConditions.push(`po.party = $${paramIndex++}`);
    params.push(party);
  }

  if (chamber) {
    const titlePattern = chamber === 'senate' ? '%Senator%' : '%Representative%';
    whereConditions.push(`po.title LIKE $${paramIndex++}`);
    params.push(titlePattern);
  }

  if (transactionType) {
    whereConditions.push(`pt.transaction_type = $${paramIndex++}`);
    params.push(transactionType.toUpperCase());
  }

  params.push(limit);

  const result = await query(
    `SELECT
       pt.id, pt.official_name, pt.ticker, pt.asset_description, pt.transaction_type,
       pt.transaction_date, pt.reported_date, pt.amount_min, pt.amount_max, pt.amount_display,
       po.party, po.title, po.state, po.ai_portrait_url
     FROM political_trades pt
     LEFT JOIN political_officials po ON pt.official_name = po.name
     WHERE ${whereConditions.join(' AND ')}
     ORDER BY pt.reported_date DESC NULLS LAST, pt.transaction_date DESC NULLS LAST
     LIMIT $${paramIndex}`,
    params
  );

  return result.rows.map(row => ({
    id: row.id,
    officialName: row.official_name,
    ticker: row.ticker,
    assetDescription: row.asset_description,
    transactionType: row.transaction_type,
    transactionDate: row.transaction_date,
    reportedDate: row.reported_date,
    amountMin: row.amount_min,
    amountMax: row.amount_max,
    amountDisplay: row.amount_display,
    party: row.party,
    title: row.title,
    state: row.state,
    portraitUrl: row.ai_portrait_url,
    chamber: parseChamber(row.title)
  }));
}

// Get congressional trades for a specific ticker from Finnhub
export async function getCongressionalTrades(ticker) {
  const cacheKey = getCacheKey('congressional', ticker);
  const ttl = config.cacheTTL.politicalTrades;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFinnhub(`/stock/congressional-trading?symbol=${ticker}`);

      if (!data || !Array.isArray(data.data)) {
        return [];
      }

      const trades = data.data.map(item => ({
        officialName: item.name,
        ticker: data.symbol || ticker,
        assetDescription: item.assetName,
        transactionType: mapTransactionType(item.transactionType),
        transactionDate: item.transactionDate,
        reportedDate: item.filingDate,
        amountMin: item.amountFrom,
        amountMax: item.amountTo,
        amountDisplay: formatAmountRange(item.amountFrom, item.amountTo),
        position: item.position,
        chamber: parseChamber(item.position),
        ownerType: item.ownerType
      }));

      // Save to database for persistence
      await saveBulkTrades(trades);

      // Extract unique officials and save them
      const officials = [...new Set(trades.map(t => t.officialName))];
      for (const name of officials) {
        const trade = trades.find(t => t.officialName === name);
        await upsertOfficial({
          name,
          title: trade?.position,
          party: null,
          state: null,
          district: null
        });
      }

      setMemoryCache(cacheKey, trades, ttl);
      return trades;
    } catch (err) {
      console.error(`Finnhub congressional trades error for ${ticker}:`, err.message);

      // Fallback to database if API fails
      const dbTrades = await getTradesFromDB({ ticker, limit: 50 });
      if (dbTrades.length > 0) {
        return dbTrades;
      }

      throw new Error(`Failed to fetch congressional trades for ${ticker}`);
    }
  });
}

// Get all recent trades (aggregated from multiple tickers)
export async function getRecentTrades(options = {}) {
  const { party, chamber, transactionType, ticker, limit = 50 } = options;

  // First check database for recent trades
  const dbTrades = await getTradesFromDB({ party, chamber, transactionType, ticker, limit });

  if (dbTrades.length > 0) {
    return dbTrades;
  }

  // If database is empty, fetch from common tickers
  const commonTickers = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'AMZN', 'META'];
  const allTrades = [];

  for (const t of commonTickers.slice(0, 3)) {
    try {
      const trades = await getCongressionalTrades(t);
      allTrades.push(...trades);
    } catch (err) {
      console.warn(`Failed to fetch trades for ${t}:`, err.message);
    }
  }

  // Sort by date and limit
  return allTrades
    .sort((a, b) => new Date(b.reportedDate || b.transactionDate) - new Date(a.reportedDate || a.transactionDate))
    .slice(0, limit);
}

// Get all officials with portraits
export async function getOfficials(options = {}) {
  const { party, chamber, limit = 100 } = options;

  let whereConditions = ['1=1'];
  const params = [];
  let paramIndex = 1;

  if (party) {
    whereConditions.push(`party = $${paramIndex++}`);
    params.push(party);
  }

  if (chamber) {
    const titlePattern = chamber === 'senate' ? '%Senator%' : '%Representative%';
    whereConditions.push(`title LIKE $${paramIndex++}`);
    params.push(titlePattern);
  }

  params.push(limit);

  const result = await query(
    `SELECT id, name, title, party, state, district, ai_portrait_url, portrait_generated_at
     FROM political_officials
     WHERE ${whereConditions.join(' AND ')}
     ORDER BY name
     LIMIT $${paramIndex}`,
    params
  );

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    title: row.title,
    party: row.party,
    state: row.state,
    district: row.district,
    portraitUrl: row.ai_portrait_url,
    portraitGeneratedAt: row.portrait_generated_at,
    chamber: parseChamber(row.title)
  }));
}

// Get single official by name
export async function getOfficialByName(name) {
  const result = await query(
    `SELECT id, name, title, party, state, district, ai_portrait_url, portrait_generated_at
     FROM political_officials
     WHERE LOWER(name) = LOWER($1)`,
    [name]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    party: row.party,
    state: row.state,
    district: row.district,
    portraitUrl: row.ai_portrait_url,
    portraitGeneratedAt: row.portrait_generated_at,
    chamber: parseChamber(row.title)
  };
}

// Update official's portrait URL
export async function updateOfficialPortrait(name, portraitUrl) {
  await query(
    `UPDATE political_officials
     SET ai_portrait_url = $2, portrait_generated_at = NOW()
     WHERE LOWER(name) = LOWER($1)`,
    [name, portraitUrl]
  );
}

// Get trades for stocks in a user's watchlist
export async function getWatchlistTrades(userId) {
  const result = await query(
    `SELECT DISTINCT pt.*,
       po.party, po.title, po.state, po.ai_portrait_url
     FROM political_trades pt
     LEFT JOIN political_officials po ON pt.official_name = po.name
     INNER JOIN watchlists w ON w.ticker = pt.ticker AND w.user_id = $1
     ORDER BY pt.reported_date DESC NULLS LAST
     LIMIT 50`,
    [userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    officialName: row.official_name,
    ticker: row.ticker,
    assetDescription: row.asset_description,
    transactionType: row.transaction_type,
    transactionDate: row.transaction_date,
    reportedDate: row.reported_date,
    amountMin: row.amount_min,
    amountMax: row.amount_max,
    amountDisplay: row.amount_display,
    party: row.party,
    title: row.title,
    state: row.state,
    portraitUrl: row.ai_portrait_url,
    chamber: parseChamber(row.title)
  }));
}

// Refresh trades for common tickers (for cron job)
export async function refreshCommonTickers() {
  const commonTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'V', 'UNH'];
  const results = { success: 0, failed: 0, errors: [] };

  for (const ticker of commonTickers) {
    try {
      // Clear memory cache
      const cacheKey = getCacheKey('congressional', ticker);
      memoryCache.delete(cacheKey);

      await getCongressionalTrades(ticker);
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ ticker, error: err.message });
    }

    // Rate limit: 30 calls/second max, but be conservative
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// Clear cache
export function clearCache(ticker = null) {
  if (ticker) {
    const cacheKey = getCacheKey('congressional', ticker);
    memoryCache.delete(cacheKey);
  } else {
    for (const key of memoryCache.keys()) {
      if (key.startsWith('finnhub:')) {
        memoryCache.delete(key);
      }
    }
  }
}

// Get cache stats
export function getCacheStats() {
  let finnhubKeys = 0;
  for (const key of memoryCache.keys()) {
    if (key.startsWith('finnhub:')) finnhubKeys++;
  }
  return {
    memoryCacheSize: finnhubKeys,
    pendingRequests: pendingRequests.size
  };
}

export default {
  getCongressionalTrades,
  getRecentTrades,
  getOfficials,
  getOfficialByName,
  updateOfficialPortrait,
  getWatchlistTrades,
  refreshCommonTickers,
  clearCache,
  getCacheStats,
  upsertOfficial,
  saveTradeToDB,
  saveBulkTrades
};
