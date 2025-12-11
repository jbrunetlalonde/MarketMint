import fmp from './financialModelPrep.js';
import { query } from '../config/database.js';
import { config } from '../config/env.js';

// Memory cache
const memoryCache = new Map();
const MEMORY_TTL = 300000; // 5 minutes

function getMemoryCache(key) {
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  memoryCache.delete(key);
  return null;
}

function setMemoryCache(key, data, ttlMs = MEMORY_TTL) {
  memoryCache.set(key, { data, expires: Date.now() + ttlMs });
}

async function getNewsFromDB(ticker = null, limit = 20) {
  try {
    let sql, params;

    if (ticker) {
      sql = `SELECT * FROM fmp_news_cache
             WHERE ticker = $1 AND cache_expires_at > NOW()
             ORDER BY published_at DESC
             LIMIT $2`;
      params = [ticker, limit];
    } else {
      sql = `SELECT * FROM fmp_news_cache
             WHERE cache_expires_at > NOW()
             ORDER BY published_at DESC
             LIMIT $1`;
      params = [limit];
    }

    const result = await query(sql, params);
    return result.rows.length > 0 ? result.rows : null;
  } catch (error) {
    console.error('News DB cache error:', error.message);
    return null;
  }
}

async function saveNewsToDB(newsItems, ticker = null) {
  if (!newsItems || newsItems.length === 0) return;

  const ttlSeconds = config.cacheTTL.news || 1800;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  try {
    for (const item of newsItems) {
      await query(
        `INSERT INTO fmp_news_cache
         (ticker, title, content, url, image_url, source, published_at, sentiment, cache_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [
          ticker || item.related || null,
          item.headline || item.title,
          item.summary || item.text || null,
          item.url,
          item.image || null,
          item.source || null,
          item.datetime ? new Date(item.datetime * 1000) : new Date(),
          item.sentiment || null,
          expiresAt
        ]
      );
    }
  } catch (error) {
    console.error('News DB save error:', error.message);
  }
}

export async function getLatestNews(limit = 20) {
  const cacheKey = `news:latest:${limit}`;

  // 1. Memory cache
  const memCached = getMemoryCache(cacheKey);
  if (memCached) return memCached;

  // 2. Database cache
  const dbCached = await getNewsFromDB(null, limit);
  if (dbCached && dbCached.length > 0) {
    const formatted = formatNewsItems(dbCached);
    setMemoryCache(cacheKey, formatted);
    return formatted;
  }

  // 3. Fetch from FMP general news
  try {
    const news = await fmp.getGeneralNews(50);

    if (news && Array.isArray(news) && news.length > 0) {
      await saveNewsToDB(news.slice(0, 50));
      const result = formatNewsItems(news.slice(0, limit));
      setMemoryCache(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.error('FMP news fetch error:', err.message);
  }

  return [];
}

export async function getTickerNews(ticker, limit = 10) {
  const cacheKey = `news:${ticker}:${limit}`;
  const normalizedTicker = ticker.toUpperCase();

  // 1. Memory cache
  const memCached = getMemoryCache(cacheKey);
  if (memCached) return memCached;

  // 2. Database cache
  const dbCached = await getNewsFromDB(normalizedTicker, limit);
  if (dbCached && dbCached.length > 0) {
    const formatted = formatNewsItems(dbCached);
    setMemoryCache(cacheKey, formatted);
    return formatted;
  }

  // 3. Fetch from FMP stock news
  try {
    const news = await fmp.getStockNews(normalizedTicker, limit);

    if (news && Array.isArray(news) && news.length > 0) {
      await saveNewsToDB(news.slice(0, limit), normalizedTicker);
      const result = formatNewsItems(news.slice(0, limit));
      setMemoryCache(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.error(`FMP news fetch error for ${normalizedTicker}:`, err.message);
  }

  return [];
}

export async function getTrendingNews(limit = 10) {
  const cacheKey = `news:trending:${limit}`;

  const memCached = getMemoryCache(cacheKey);
  if (memCached) return memCached;

  // Get general market news
  const news = await getLatestNews(limit * 2);
  const trending = news.slice(0, limit);

  setMemoryCache(cacheKey, trending, 60000); // 1 minute for trending
  return trending;
}

export async function getMarketSummary() {
  const cacheKey = 'news:market-summary';

  const memCached = getMemoryCache(cacheKey);
  if (memCached) return memCached;

  const [latest, trending] = await Promise.all([
    getLatestNews(5),
    getTrendingNews(5)
  ]);

  const summary = {
    headlines: trending,
    latestNews: latest,
    generatedAt: new Date().toISOString()
  };

  setMemoryCache(cacheKey, summary, 120000); // 2 minutes
  return summary;
}

function formatNewsItems(items) {
  return items.map(item => ({
    id: item.id || `${(item.headline || item.title)?.slice(0, 20)}-${item.datetime || item.published_at}`,
    ticker: item.ticker || item.related || null,
    title: item.headline || item.title,
    content: item.summary || item.content || item.text || null,
    url: item.url,
    imageUrl: item.image_url || item.image || null,
    source: item.source || null,
    publishedAt: item.published_at || (item.datetime ? new Date(item.datetime * 1000).toISOString() : null),
    sentiment: item.sentiment || null
  }));
}

export function getCacheStats() {
  return {
    memoryCacheSize: memoryCache.size
  };
}

export async function clearCache(ticker = null) {
  if (ticker) {
    for (const [key] of memoryCache) {
      if (key.includes(ticker)) {
        memoryCache.delete(key);
      }
    }
    await query('DELETE FROM fmp_news_cache WHERE ticker = $1', [ticker]);
  } else {
    memoryCache.clear();
    await query('DELETE FROM fmp_news_cache');
  }
}

export default {
  getLatestNews,
  getTickerNews,
  getTrendingNews,
  getMarketSummary,
  getCacheStats,
  clearCache
};
