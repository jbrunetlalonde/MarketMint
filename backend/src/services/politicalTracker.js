import { config } from '../config/env.js';
import { query, getClient } from '../config/database.js';
import { LRUCache } from 'lru-cache';

// PostgreSQL parameter limit
const POSTGRES_PARAM_LIMIT = 65535;

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// LRU cache with size limits to prevent memory leaks
const memoryCache = new LRUCache({
  max: 500,                    // Max 500 entries
  maxSize: 50 * 1024 * 1024,   // Max 50MB total
  sizeCalculation: (value) => {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 1000; // Default size if stringify fails
    }
  },
  ttl: 1000 * 60 * 60,         // Default 1 hour TTL
  updateAgeOnGet: true,        // Reset TTL on access
  allowStale: false
});

// In-flight request deduplication
const pendingRequests = new Map();

function getCacheKey(type, param = '') {
  return `finnhub:${type}${param ? `:${param}` : ''}`;
}

function getFromMemoryCache(key) {
  return memoryCache.get(key) || null;
}

function setMemoryCache(key, data, ttlSeconds) {
  memoryCache.set(key, data, { ttl: ttlSeconds * 1000 });
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

// Helper to chunk arrays for batch processing
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Save multiple trades in batch using multi-row insert with transaction
async function saveBulkTrades(trades) {
  if (!trades || trades.length === 0) return { inserted: 0 };

  const COLUMNS_PER_ROW = 9;
  const MAX_ROWS_PER_BATCH = Math.floor(POSTGRES_PARAM_LIMIT / COLUMNS_PER_ROW);
  const batches = chunkArray(trades, MAX_ROWS_PER_BATCH);

  const client = await getClient();
  let totalInserted = 0;

  try {
    await client.query('BEGIN');

    for (const batch of batches) {
      const values = [];
      const params = [];
      let paramIndex = 1;

      for (const trade of batch) {
        values.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, NOW())`
        );
        params.push(
          trade.officialName,
          trade.ticker,
          trade.assetDescription,
          trade.transactionType,
          trade.transactionDate,
          trade.reportedDate,
          trade.amountMin,
          trade.amountMax,
          trade.amountDisplay
        );
      }

      const result = await client.query(
        `INSERT INTO political_trades
           (official_name, ticker, asset_description, transaction_type, transaction_date,
            reported_date, amount_min, amount_max, amount_display, retrieved_at)
         VALUES ${values.join(', ')}
         ON CONFLICT (official_name, ticker, COALESCE(transaction_date, '1900-01-01'), transaction_type, COALESCE(amount_min, -1), COALESCE(amount_max, -1)) DO NOTHING`,
        params
      );
      totalInserted += result.rowCount || 0;
    }

    await client.query('COMMIT');
    return { inserted: totalInserted };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
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

// Bulk upsert officials with transaction
async function upsertBulkOfficials(officials) {
  if (!officials || officials.length === 0) return { upserted: 0 };

  const COLUMNS_PER_ROW = 5;
  const MAX_ROWS_PER_BATCH = Math.floor(POSTGRES_PARAM_LIMIT / COLUMNS_PER_ROW);
  const batches = chunkArray(officials, MAX_ROWS_PER_BATCH);

  const client = await getClient();
  let totalUpserted = 0;

  try {
    await client.query('BEGIN');

    for (const batch of batches) {
      const values = [];
      const params = [];
      let paramIndex = 1;

      for (const official of batch) {
        values.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
        );
        params.push(
          official.name,
          official.title,
          official.party,
          official.state,
          official.district
        );
      }

      const result = await client.query(
        `INSERT INTO political_officials (name, title, party, state, district)
         VALUES ${values.join(', ')}
         ON CONFLICT (name) DO UPDATE SET
           title = COALESCE(EXCLUDED.title, political_officials.title),
           party = COALESCE(EXCLUDED.party, political_officials.party),
           state = COALESCE(EXCLUDED.state, political_officials.state),
           district = COALESCE(EXCLUDED.district, political_officials.district)`,
        params
      );
      totalUpserted += result.rowCount || 0;
    }

    await client.query('COMMIT');
    return { upserted: totalUpserted };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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

      // Extract unique officials and bulk upsert them
      const officialMap = new Map();
      for (const trade of trades) {
        if (!officialMap.has(trade.officialName)) {
          officialMap.set(trade.officialName, {
            name: trade.officialName,
            title: trade.position,
            party: null,
            state: null,
            district: null
          });
        }
      }
      await upsertBulkOfficials([...officialMap.values()]);

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

// Get trades by official name (direct database query instead of in-memory filter)
export async function getTradesByOfficial(officialName, options = {}) {
  const { limit = 100, offset = 0 } = options;

  const result = await query(
    `SELECT
       pt.id, pt.official_name, pt.ticker, pt.asset_description, pt.transaction_type,
       pt.transaction_date, pt.reported_date, pt.amount_min, pt.amount_max, pt.amount_display,
       po.party, po.title, po.state, po.ai_portrait_url
     FROM political_trades pt
     LEFT JOIN political_officials po ON pt.official_name = po.name
     WHERE LOWER(pt.official_name) = LOWER($1)
     ORDER BY pt.reported_date DESC NULLS LAST, pt.transaction_date DESC NULLS LAST
     LIMIT $2 OFFSET $3`,
    [officialName, limit, offset]
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

// Update official's portrait URL
export async function updateOfficialPortrait(name, portraitUrl) {
  await query(
    `UPDATE political_officials
     SET ai_portrait_url = $2, portrait_generated_at = NOW()
     WHERE LOWER(name) = LOWER($1)`,
    [name, portraitUrl]
  );
}

// Get chamber stats via SQL aggregation
export async function getChamberStats(chamber) {
  const titlePattern = chamber === 'senate' ? '%Senator%' : '%Representative%';

  const statsResult = await query(
    `SELECT
       COUNT(*) as total_trades,
       COUNT(*) FILTER (WHERE pt.transaction_type = 'BUY') as buy_count,
       COUNT(*) FILTER (WHERE pt.transaction_type = 'SELL') as sell_count,
       COUNT(DISTINCT pt.official_name) as unique_traders,
       COUNT(DISTINCT pt.ticker) as unique_stocks
     FROM political_trades pt
     LEFT JOIN political_officials po ON pt.official_name = po.name
     WHERE po.title LIKE $1 OR (po.title IS NULL AND $2 = 'house')`,
    [titlePattern, chamber]
  );

  const topTradersResult = await query(
    `SELECT pt.official_name as name, COUNT(*) as count
     FROM political_trades pt
     LEFT JOIN political_officials po ON pt.official_name = po.name
     WHERE po.title LIKE $1 OR (po.title IS NULL AND $2 = 'house')
     GROUP BY pt.official_name
     ORDER BY count DESC
     LIMIT 5`,
    [titlePattern, chamber]
  );

  const topStocksResult = await query(
    `SELECT pt.ticker, COUNT(*) as count
     FROM political_trades pt
     LEFT JOIN political_officials po ON pt.official_name = po.name
     WHERE po.title LIKE $1 OR (po.title IS NULL AND $2 = 'house')
     GROUP BY pt.ticker
     ORDER BY count DESC
     LIMIT 5`,
    [titlePattern, chamber]
  );

  const stats = statsResult.rows[0];
  return {
    totalTrades: parseInt(stats.total_trades, 10) || 0,
    buyCount: parseInt(stats.buy_count, 10) || 0,
    sellCount: parseInt(stats.sell_count, 10) || 0,
    uniqueTraders: parseInt(stats.unique_traders, 10) || 0,
    uniqueStocks: parseInt(stats.unique_stocks, 10) || 0,
    topTraders: topTradersResult.rows.map(r => ({ name: r.name, count: parseInt(r.count, 10) })),
    topStocks: topStocksResult.rows.map(r => ({ ticker: r.ticker, count: parseInt(r.count, 10) }))
  };
}

// Get official stats via SQL aggregation
export async function getOfficialStats(officialName) {
  const statsResult = await query(
    `SELECT
       COUNT(*) as total_trades,
       COUNT(*) FILTER (WHERE transaction_type = 'BUY') as buy_count,
       COUNT(*) FILTER (WHERE transaction_type = 'SELL') as sell_count,
       COUNT(DISTINCT ticker) as unique_stocks,
       MAX(transaction_date) as latest_trade,
       AVG(EXTRACT(DAY FROM (reported_date::timestamp - transaction_date::timestamp)))
         FILTER (WHERE reported_date IS NOT NULL AND transaction_date IS NOT NULL) as avg_reporting_delay
     FROM political_trades
     WHERE LOWER(official_name) = LOWER($1)`,
    [officialName]
  );

  const topStocksResult = await query(
    `SELECT ticker, COUNT(*) as count
     FROM political_trades
     WHERE LOWER(official_name) = LOWER($1)
     GROUP BY ticker
     ORDER BY count DESC
     LIMIT 10`,
    [officialName]
  );

  const stats = statsResult.rows[0];
  if (!stats || parseInt(stats.total_trades, 10) === 0) {
    return null;
  }

  return {
    totalTrades: parseInt(stats.total_trades, 10),
    buyCount: parseInt(stats.buy_count, 10),
    sellCount: parseInt(stats.sell_count, 10),
    uniqueStocks: parseInt(stats.unique_stocks, 10),
    topStocks: topStocksResult.rows.map(r => ({ ticker: r.ticker, count: parseInt(r.count, 10) })),
    avgReportingDelay: stats.avg_reporting_delay ? Math.round(parseFloat(stats.avg_reporting_delay)) : null,
    latestTrade: stats.latest_trade || null
  };
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
  return {
    memoryCacheSize: memoryCache.size,
    memoryCacheMaxSize: memoryCache.max,
    calculatedSize: memoryCache.calculatedSize,
    pendingRequests: pendingRequests.size
  };
}

export default {
  getCongressionalTrades,
  getRecentTrades,
  getOfficials,
  getOfficialByName,
  getTradesByOfficial,
  updateOfficialPortrait,
  getWatchlistTrades,
  refreshCommonTickers,
  clearCache,
  getCacheStats,
  getChamberStats,
  getOfficialStats,
  upsertOfficial,
  upsertBulkOfficials,
  saveTradeToDB,
  saveBulkTrades
};
