import { config } from '../config/env.js';
import { query, getClient } from '../config/database.js';
import { LRUCache } from 'lru-cache';
import fmp from './financialModelPrep.js';

// PostgreSQL parameter limit
const POSTGRES_PARAM_LIMIT = 65535;

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
  return `congress:${type}${param ? `:${param}` : ''}`;
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

// Map FMP transaction type to our schema
function mapTransactionType(type) {
  if (!type) return 'BUY';
  const upper = type.toUpperCase();
  if (upper.includes('SALE') || upper.includes('SELL')) return 'SELL';
  if (upper.includes('PURCHASE') || upper.includes('BUY')) return 'BUY';
  if (upper.includes('EXCHANGE')) return 'EXCHANGE';
  return upper.includes('P') ? 'BUY' : 'SELL';
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
  const { ticker, party, chamber, transactionType, limit = 50, offset = 0 } = options;

  let whereConditions = ['1=1'];
  const params = [];
  let paramIndex = 1;

  if (ticker) {
    whereConditions.push(`pt.ticker = $${paramIndex++}`);
    params.push(ticker.toUpperCase());
  }

  if (party) {
    const partyLower = party.toLowerCase();
    if (partyLower === 'd' || partyLower === 'democrat') {
      whereConditions.push(`(LOWER(po.party) LIKE '%democrat%' OR LOWER(po.party) = 'd')`);
    } else if (partyLower === 'r' || partyLower === 'republican') {
      whereConditions.push(`(LOWER(po.party) LIKE '%republican%' OR LOWER(po.party) = 'r')`);
    } else {
      whereConditions.push(`po.party = $${paramIndex++}`);
      params.push(party);
    }
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
  params.push(offset);

  const result = await query(
    `SELECT
       pt.id, pt.official_name, pt.ticker, pt.asset_description, pt.transaction_type,
       pt.transaction_date, pt.reported_date, pt.amount_min, pt.amount_max, pt.amount_display,
       po.party, po.title, po.state, po.ai_portrait_url
     FROM political_trades pt
     LEFT JOIN political_officials po ON pt.official_name = po.name
     WHERE ${whereConditions.join(' AND ')}
     ORDER BY pt.reported_date DESC NULLS LAST, pt.transaction_date DESC NULLS LAST
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
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

// Transform FMP trade data to our standard format
function transformFMPTrade(item, chamber) {
  const title = chamber === 'senate' ? 'Senator' : 'Representative';
  return {
    officialName: item.representative || item.firstName + ' ' + item.lastName || 'Unknown',
    ticker: item.ticker || item.symbol,
    assetDescription: item.assetDescription || item.asset,
    transactionType: mapTransactionType(item.type || item.transactionType),
    transactionDate: item.transactionDate,
    reportedDate: item.disclosureDate,
    amountMin: parseAmountBound(item.amount, 'min'),
    amountMax: parseAmountBound(item.amount, 'max'),
    amountDisplay: item.amount || 'Unknown',
    position: title,
    chamber,
    party: item.party || null,
    state: item.state || item.district?.slice(0, 2) || null,
    district: item.district || null
  };
}

// Parse amount string like "$1,001 - $15,000" to min/max bounds
function parseAmountBound(amountStr, bound) {
  if (!amountStr) return null;
  const cleaned = amountStr.replace(/[$,]/g, '');
  const match = cleaned.match(/(\d+)\s*-\s*(\d+)/);
  if (match) {
    return bound === 'min' ? parseInt(match[1], 10) : parseInt(match[2], 10);
  }
  const singleMatch = cleaned.match(/(\d+)/);
  if (singleMatch) {
    return parseInt(singleMatch[1], 10);
  }
  return null;
}

// Get congressional trades for a specific ticker from FMP
export async function getCongressionalTrades(ticker) {
  const cacheKey = getCacheKey('congressional', ticker);
  const ttl = config.cacheTTL.politicalTrades;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      // Fetch from both Senate and House endpoints
      const [senateTrades, houseTrades] = await Promise.all([
        fmp.getSenateTradesBySymbol(ticker),
        fmp.getHouseTradesBySymbol(ticker)
      ]);

      const allTrades = [
        ...senateTrades.map(t => transformFMPTrade(t, 'senate')),
        ...houseTrades.map(t => transformFMPTrade(t, 'house'))
      ];

      if (allTrades.length === 0) {
        // Fallback to database
        const dbTrades = await getTradesFromDB({ ticker, limit: 50 });
        if (dbTrades.length > 0) {
          return dbTrades;
        }
        return [];
      }

      // Save to database for persistence
      await saveBulkTrades(allTrades);

      // Extract unique officials and bulk upsert them
      const officialMap = new Map();
      for (const trade of allTrades) {
        if (!officialMap.has(trade.officialName)) {
          officialMap.set(trade.officialName, {
            name: trade.officialName,
            title: trade.position,
            party: trade.party,
            state: trade.state,
            district: trade.district
          });
        }
      }
      await upsertBulkOfficials([...officialMap.values()]);

      // Sort by date
      allTrades.sort((a, b) => {
        const dateA = new Date(b.reportedDate || b.transactionDate || 0);
        const dateB = new Date(a.reportedDate || a.transactionDate || 0);
        return dateA - dateB;
      });

      setMemoryCache(cacheKey, allTrades, ttl);
      return allTrades;
    } catch (err) {
      console.error(`FMP congressional trades error for ${ticker}:`, err.message);

      // Fallback to database if API fails
      const dbTrades = await getTradesFromDB({ ticker, limit: 50 });
      if (dbTrades.length > 0) {
        return dbTrades;
      }

      throw new Error(`Failed to fetch congressional trades for ${ticker}`);
    }
  });
}

// Get all recent trades from FMP's latest endpoints
export async function getRecentTrades(options = {}) {
  const { party, chamber, transactionType, ticker, limit = 50, offset = 0 } = options;

  // If ticker is specified, use the ticker-specific endpoint
  if (ticker) {
    return getCongressionalTrades(ticker);
  }

  // First check database for recent trades (always use DB for pagination support)
  const dbTrades = await getTradesFromDB({ party, chamber, transactionType, limit, offset });
  if (dbTrades.length > 0 || offset > 0) {
    return dbTrades;
  }

  // Fetch latest trades from FMP
  const cacheKey = getCacheKey('latestTrades', `${party || 'all'}:${chamber || 'all'}`);
  const ttl = config.cacheTTL.politicalTrades;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) {
    return applyFilters(memCached, { party, chamber, transactionType, limit });
  }

  try {
    // Fetch from both chambers' latest endpoints
    const [senateTrades, houseTrades] = await Promise.all([
      chamber !== 'house' ? fmp.getSenateTradesLatest(0, 100) : Promise.resolve([]),
      chamber !== 'senate' ? fmp.getHouseTradesLatest(0, 100) : Promise.resolve([])
    ]);

    const allTrades = [
      ...senateTrades.map(t => transformFMPTrade(t, 'senate')),
      ...houseTrades.map(t => transformFMPTrade(t, 'house'))
    ];

    if (allTrades.length === 0) {
      return [];
    }

    // Save to database for persistence
    await saveBulkTrades(allTrades);

    // Extract unique officials and bulk upsert them
    const officialMap = new Map();
    for (const trade of allTrades) {
      if (!officialMap.has(trade.officialName)) {
        officialMap.set(trade.officialName, {
          name: trade.officialName,
          title: trade.position,
          party: trade.party,
          state: trade.state,
          district: trade.district
        });
      }
    }
    await upsertBulkOfficials([...officialMap.values()]);

    // Sort by date
    allTrades.sort((a, b) => {
      const dateA = new Date(b.reportedDate || b.transactionDate || 0);
      const dateB = new Date(a.reportedDate || a.transactionDate || 0);
      return dateA - dateB;
    });

    setMemoryCache(cacheKey, allTrades, ttl);
    return applyFilters(allTrades, { party, chamber, transactionType, limit });
  } catch (err) {
    console.error('FMP latest trades error:', err.message);
    return [];
  }
}

// Apply filters to trades list
function applyFilters(trades, { party, chamber, transactionType, limit }) {
  let result = trades;

  if (party) {
    const partyLower = party.toLowerCase();
    result = result.filter(t => {
      const tParty = (t.party || '').toLowerCase();
      if (partyLower === 'd' || partyLower === 'democrat') {
        return tParty.includes('democrat') || tParty === 'd';
      }
      if (partyLower === 'r' || partyLower === 'republican') {
        return tParty.includes('republican') || tParty === 'r';
      }
      return true;
    });
  }

  if (chamber) {
    result = result.filter(t => t.chamber === chamber);
  }

  if (transactionType) {
    result = result.filter(t => t.transactionType === transactionType.toUpperCase());
  }

  return result.slice(0, limit);
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
      if (key.startsWith('congress:')) {
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

// Sync all officials from FMP by fetching multiple pages of trades
export async function syncAllOfficials() {
  const pagesToFetch = 50; // Fetch 50 pages of 100 trades each = 5000 trades per chamber
  const officialMap = new Map();
  let totalTrades = 0;
  const errors = [];

  // Fetch multiple pages from both chambers
  for (let page = 0; page < pagesToFetch; page++) {
    try {
      const [senateTrades, houseTrades] = await Promise.all([
        fmp.getSenateTradesLatest(page, 100),
        fmp.getHouseTradesLatest(page, 100)
      ]);

      const allTrades = [
        ...senateTrades.map(t => transformFMPTrade(t, 'senate')),
        ...houseTrades.map(t => transformFMPTrade(t, 'house'))
      ];

      totalTrades += allTrades.length;

      // Extract unique officials
      for (const trade of allTrades) {
        if (trade.officialName && !officialMap.has(trade.officialName)) {
          officialMap.set(trade.officialName, {
            name: trade.officialName,
            title: trade.position,
            party: trade.party,
            state: trade.state,
            district: trade.district
          });
        }
      }

      // Save trades to DB
      if (allTrades.length > 0) {
        await saveBulkTrades(allTrades);
      }

      // If we got fewer trades than requested, we've reached the end
      if (senateTrades.length < 100 && houseTrades.length < 100) {
        break;
      }

      // Rate limit: wait between pages
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      errors.push({ page, error: err.message });
    }
  }

  // Bulk upsert all officials
  const officials = [...officialMap.values()];
  if (officials.length > 0) {
    await upsertBulkOfficials(officials);
  }

  return {
    officialsFound: officials.length,
    tradesProcessed: totalTrades,
    pagesProcessed: pagesToFetch,
    errors
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
  saveBulkTrades,
  syncAllOfficials
};
