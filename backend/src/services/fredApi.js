import { config } from '../config/env.js';
import { query } from '../config/database.js';

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred';

// Key economic series to track
export const ECONOMIC_SERIES = {
  FEDFUNDS: { name: 'Federal Funds Rate', unit: '%', frequency: 'daily' },
  DGS10: { name: '10-Year Treasury Yield', unit: '%', frequency: 'daily' },
  DGS2: { name: '2-Year Treasury Yield', unit: '%', frequency: 'daily' },
  CPIAUCSL: { name: 'Consumer Price Index', unit: 'index', frequency: 'monthly' },
  UNRATE: { name: 'Unemployment Rate', unit: '%', frequency: 'monthly' },
  GDP: { name: 'Gross Domestic Product', unit: 'billions USD', frequency: 'quarterly' },
  VIXCLS: { name: 'VIX Volatility Index', unit: 'index', frequency: 'daily' },
  T10Y2Y: { name: '10Y-2Y Treasury Spread', unit: '%', frequency: 'daily' },
  MORTGAGE30US: { name: '30-Year Mortgage Rate', unit: '%', frequency: 'weekly' },
  DCOILWTICO: { name: 'WTI Crude Oil Price', unit: 'USD/barrel', frequency: 'daily' }
};

// Memory cache for quick access
const memoryCache = new Map();
const MEMORY_TTL = 300000; // 5 minutes

// In-flight request deduplication
const pendingRequests = new Map();

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

async function deduplicatedRequest(key, fetchFn) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  const promise = fetchFn().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}

async function fetchFromFRED(endpoint, params = {}) {
  if (!config.fredApiKey) {
    console.warn('FRED_API_KEY not configured');
    return null;
  }

  const url = new URL(`${FRED_BASE_URL}/${endpoint}`);
  url.searchParams.set('api_key', config.fredApiKey);
  url.searchParams.set('file_type', 'json');

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`FRED API fetch error: ${error.message}`);
    return null;
  }
}

async function getSeriesFromDB(seriesId, limit = 30) {
  try {
    const result = await query(
      `SELECT series_id, observation_date, value, cached_at
       FROM fred_cache
       WHERE series_id = $1 AND cache_expires_at > NOW()
       ORDER BY observation_date DESC
       LIMIT $2`,
      [seriesId, limit]
    );
    return result.rows.length > 0 ? result.rows : null;
  } catch (error) {
    console.error(`FRED DB cache error: ${error.message}`);
    return null;
  }
}

async function saveSeriesData(seriesId, observations) {
  if (!observations || observations.length === 0) return;

  const ttlSeconds = config.cacheTTL.economic;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  try {
    for (const obs of observations) {
      if (obs.value === '.') continue; // FRED uses '.' for missing data

      await query(
        `INSERT INTO fred_cache (series_id, observation_date, value, cache_expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (series_id, observation_date)
         DO UPDATE SET value = $3, cached_at = NOW(), cache_expires_at = $4`,
        [seriesId, obs.date, parseFloat(obs.value), expiresAt]
      );
    }
  } catch (error) {
    console.error(`FRED DB save error: ${error.message}`);
  }
}

export async function getSeriesData(seriesId, options = {}) {
  const { limit = 30, forceRefresh = false } = options;
  const cacheKey = `fred:${seriesId}:${limit}`;

  // 1. Check memory cache
  if (!forceRefresh) {
    const memCached = getMemoryCache(cacheKey);
    if (memCached) return memCached;
  }

  // 2. Check database cache
  if (!forceRefresh) {
    const dbCached = await getSeriesFromDB(seriesId, limit);
    if (dbCached) {
      const result = formatSeriesResult(seriesId, dbCached);
      setMemoryCache(cacheKey, result);
      return result;
    }
  }

  // 3. Fetch from FRED API with deduplication
  return deduplicatedRequest(cacheKey, async () => {
    const data = await fetchFromFRED('series/observations', {
      series_id: seriesId,
      sort_order: 'desc',
      limit: limit
    });

    if (!data?.observations) {
      return getSeriesFromDB(seriesId, limit).then(cached =>
        cached ? formatSeriesResult(seriesId, cached) : null
      );
    }

    await saveSeriesData(seriesId, data.observations);

    const result = formatSeriesResult(seriesId, data.observations.map(obs => ({
      series_id: seriesId,
      observation_date: obs.date,
      value: obs.value === '.' ? null : parseFloat(obs.value)
    })));

    setMemoryCache(cacheKey, result);
    return result;
  });
}

function formatSeriesResult(seriesId, observations) {
  const meta = ECONOMIC_SERIES[seriesId] || { name: seriesId, unit: '', frequency: 'unknown' };

  const validObs = observations.filter(o => o.value !== null && o.value !== '.');
  const latest = validObs[0];
  const previous = validObs[1];

  let change = null;
  let changePercent = null;

  if (latest && previous && previous.value) {
    change = latest.value - previous.value;
    changePercent = (change / Math.abs(previous.value)) * 100;
  }

  return {
    seriesId,
    name: meta.name,
    unit: meta.unit,
    frequency: meta.frequency,
    latest: latest ? {
      date: latest.observation_date,
      value: parseFloat(latest.value)
    } : null,
    change,
    changePercent,
    history: validObs.slice(0, 30).map(o => ({
      date: o.observation_date,
      value: parseFloat(o.value)
    }))
  };
}

export async function getAllIndicators() {
  const cacheKey = 'fred:all-indicators';

  const memCached = getMemoryCache(cacheKey);
  if (memCached) return memCached;

  const seriesIds = Object.keys(ECONOMIC_SERIES);
  const results = await Promise.all(
    seriesIds.map(id => getSeriesData(id, { limit: 5 }))
  );

  const indicators = results
    .filter(r => r !== null)
    .reduce((acc, result) => {
      acc[result.seriesId] = result;
      return acc;
    }, {});

  setMemoryCache(cacheKey, indicators, 60000); // 1 minute for dashboard
  return indicators;
}

export async function getSeriesInfo(seriesId) {
  const data = await fetchFromFRED('series', { series_id: seriesId });
  return data?.seriess?.[0] || null;
}

export function getCacheStats() {
  return {
    memoryCacheSize: memoryCache.size,
    pendingRequests: pendingRequests.size
  };
}

export async function clearCache(seriesId = null) {
  if (seriesId) {
    for (const [key] of memoryCache) {
      if (key.startsWith(`fred:${seriesId}`)) {
        memoryCache.delete(key);
      }
    }
    await query('DELETE FROM fred_cache WHERE series_id = $1', [seriesId]);
  } else {
    memoryCache.clear();
    await query('DELETE FROM fred_cache');
  }
}

export default {
  getSeriesData,
  getAllIndicators,
  getSeriesInfo,
  getCacheStats,
  clearCache,
  ECONOMIC_SERIES
};
