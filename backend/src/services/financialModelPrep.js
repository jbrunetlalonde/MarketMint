import { config } from '../config/env.js';
import { query } from '../config/database.js';

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

// In-memory cache for hot data (quick access layer)
const memoryCache = new Map();

// In-flight request deduplication (prevent duplicate API calls)
const pendingRequests = new Map();

// Persistent movers cache - survives even when API returns empty (after market hours)
const persistentMoversCache = {
  gainers: { data: [], lastUpdated: null },
  losers: { data: [], lastUpdated: null },
  mostActive: { data: [], lastUpdated: null }
};

function getCacheKey(type, ticker, extra = '') {
  return `fmp:${type}:${ticker}${extra ? `:${extra}` : ''}`;
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

// Request deduplication wrapper
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

  if (Array.isArray(data) && data.length === 0) {
    throw new Error('No data found');
  }

  return data;
}

// DB-first cache check for profile
async function getProfileFromDB(ticker) {
  const result = await query(
    `SELECT * FROM company_profiles
     WHERE ticker = $1 AND (cache_expires_at IS NULL OR cache_expires_at > NOW())`,
    [ticker]
  );
  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      ticker: row.ticker,
      name: row.company_name,
      exchange: row.exchange,
      industry: row.industry,
      sector: row.sector,
      website: row.website,
      description: row.description,
      ceo: row.ceo,
      employees: row.employees,
      headquarters: row.headquarters,
      ipoDate: row.ipo_date,
      image: row.image_url
    };
  }
  return null;
}

async function saveProfileToDB(ticker, profile, ttlSeconds) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await query(
    `INSERT INTO company_profiles
       (ticker, company_name, exchange, sector, industry, description, ceo, employees,
        headquarters, website, logo_url, ipo_date, image_url, fmp_fetched_at, cache_expires_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14, NOW())
     ON CONFLICT (ticker) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       exchange = EXCLUDED.exchange,
       sector = EXCLUDED.sector,
       industry = EXCLUDED.industry,
       description = EXCLUDED.description,
       ceo = EXCLUDED.ceo,
       employees = EXCLUDED.employees,
       headquarters = EXCLUDED.headquarters,
       website = EXCLUDED.website,
       logo_url = EXCLUDED.logo_url,
       ipo_date = EXCLUDED.ipo_date,
       image_url = EXCLUDED.image_url,
       fmp_fetched_at = NOW(),
       cache_expires_at = EXCLUDED.cache_expires_at,
       updated_at = NOW()`,
    [ticker, profile.name, profile.exchange, profile.sector, profile.industry,
     profile.description, profile.ceo, profile.employees, profile.headquarters,
     profile.website, profile.image, profile.ipoDate, profile.image, expiresAt]
  );
}

export async function getProfile(ticker) {
  const cacheKey = getCacheKey('profile', ticker);
  const ttl = config.cacheTTL.profile;

  // 1. Check memory cache
  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  // 2. Check database cache
  const dbCached = await getProfileFromDB(ticker);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300); // 5min memory cache
    return dbCached;
  }

  // 3. Fetch from API with deduplication
  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/profile?symbol=${ticker}`);
      const profile = Array.isArray(data) ? data[0] : data;

      const formatted = {
        ticker: profile.symbol,
        name: profile.companyName,
        exchange: profile.exchange,
        industry: profile.industry,
        sector: profile.sector,
        website: profile.website,
        description: profile.description,
        ceo: profile.ceo,
        employees: parseInt(profile.fullTimeEmployees) || null,
        headquarters: `${profile.city || ''}, ${profile.state || ''}, ${profile.country || ''}`.replace(/^, |, $/g, ''),
        ipoDate: profile.ipoDate,
        image: profile.image
      };

      // Save to both caches
      await saveProfileToDB(ticker, formatted, ttl);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.error(`FMP profile error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch profile for ${ticker}`);
    }
  });
}

// Generic JSONB cache helpers
async function getFromDBCache(tableName, ticker, periodCol = null, period = null) {
  const whereClause = periodCol
    ? `ticker = $1 AND ${periodCol} = $2 AND (cache_expires_at IS NULL OR cache_expires_at > NOW())`
    : `ticker = $1 AND (cache_expires_at IS NULL OR cache_expires_at > NOW())`;
  const params = periodCol ? [ticker, period] : [ticker];

  const result = await query(`SELECT data FROM ${tableName} WHERE ${whereClause}`, params);
  if (result.rows.length > 0) {
    return result.rows[0].data;
  }
  return null;
}

async function saveToDBCache(tableName, ticker, data, ttlSeconds, periodCol = null, period = null) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  if (periodCol) {
    await query(
      `INSERT INTO ${tableName} (ticker, ${periodCol}, data, fetched_at, cache_expires_at)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (ticker, ${periodCol}) DO UPDATE SET
         data = EXCLUDED.data, fetched_at = NOW(), cache_expires_at = EXCLUDED.cache_expires_at`,
      [ticker, period, JSON.stringify(data), expiresAt]
    );
  } else {
    await query(
      `INSERT INTO ${tableName} (ticker, data, fetched_at, cache_expires_at)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (ticker) DO UPDATE SET
         data = EXCLUDED.data, fetched_at = NOW(), cache_expires_at = EXCLUDED.cache_expires_at`,
      [ticker, JSON.stringify(data), expiresAt]
    );
  }
}

export async function getQuote(ticker) {
  const cacheKey = getCacheKey('quote', ticker);
  const ttl = config.cacheTTL.quote;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/quote?symbol=${ticker}`);
      const quote = Array.isArray(data) ? data[0] : data;

      const formatted = {
        ticker: quote.symbol,
        name: quote.name,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercentage,
        dayHigh: quote.dayHigh,
        dayLow: quote.dayLow,
        open: quote.open,
        previousClose: quote.previousClose,
        volume: quote.volume,
        avgVolume: quote.avgVolume || null,
        marketCap: quote.marketCap,
        peRatio: quote.pe || null,
        eps: quote.eps || null,
        fiftyTwoWeekHigh: quote.yearHigh,
        fiftyTwoWeekLow: quote.yearLow,
        exchange: quote.exchange,
        sharesOutstanding: quote.sharesOutstanding || null,
        dividendYield: quote.dividendYield || null
      };

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error(`FMP quote error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch quote for ${ticker}`);
    }
  });
}

export async function getHistoricalPrices(ticker, fromDate = null, toDate = null) {
  // Support both (ticker, period) and (ticker, fromDate, toDate) signatures
  let from, to;
  const periods = ['1d', '5d', '1m', '3m', '6m', 'ytd', '1y', '5y', '10y', 'max'];

  if (periods.includes(fromDate)) {
    // Called with period string (old signature)
    const period = fromDate;
    to = new Date();
    from = new Date();

    switch (period) {
      case '1d': from.setDate(from.getDate() - 7); break; // Get week for 1d fallback
      case '5d': from.setDate(from.getDate() - 14); break;
      case '1m': from.setMonth(from.getMonth() - 1); break;
      case '3m': from.setMonth(from.getMonth() - 3); break;
      case '6m': from.setMonth(from.getMonth() - 6); break;
      case 'ytd':
        from.setMonth(0);
        from.setDate(1);
        break;
      case '1y': from.setFullYear(from.getFullYear() - 1); break;
      case '5y': from.setFullYear(from.getFullYear() - 5); break;
      case '10y': from.setFullYear(from.getFullYear() - 10); break;
      case 'max': from.setFullYear(from.getFullYear() - 20); break;
      default: from.setFullYear(from.getFullYear() - 1);
    }
  } else if (fromDate && toDate) {
    // Called with date range (new signature)
    from = typeof fromDate === 'string' ? new Date(fromDate) : fromDate;
    to = typeof toDate === 'string' ? new Date(toDate) : toDate;
  } else {
    // Default: 1 year
    to = new Date();
    from = new Date();
    from.setFullYear(from.getFullYear() - 1);
  }

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];
  const cacheKey = getCacheKey('history', ticker, `${fromStr}-${toStr}`);
  const ttl = config.cacheTTL.priceHistory;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/historical-price-eod/full?symbol=${ticker}&from=${fromStr}&to=${toStr}`);

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[FMP] No historical data for ${ticker} from ${fromStr} to ${toStr}`);
        return [];
      }

      const history = data.map(item => ({
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        adjClose: item.adjClose || item.close
      })).reverse(); // Oldest first

      setMemoryCache(cacheKey, history, ttl);
      return history;
    } catch (err) {
      console.error(`FMP historical error for ${ticker}:`, err.message);
      return [];
    }
  });
}

export async function getIncomeStatement(ticker, period = 'annual', limit = 5) {
  const cacheKey = getCacheKey('income', ticker, period);
  const ttl = config.cacheTTL.financials;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getFromDBCache('fmp_income_cache', ticker, 'period', period);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const endpoint = period === 'quarter'
        ? `/income-statement?symbol=${ticker}&period=quarter&limit=${limit}`
        : `/income-statement?symbol=${ticker}&limit=${limit}`;

      const data = await fetchFMP(endpoint);

      const formatted = data.map(item => ({
        date: item.date,
        period: item.period,
        revenue: item.revenue,
        costOfRevenue: item.costOfRevenue,
        grossProfit: item.grossProfit,
        operatingExpenses: item.operatingExpenses,
        operatingIncome: item.operatingIncome,
        netIncome: item.netIncome,
        eps: item.eps,
        epsDiluted: item.epsDiluted,
        sharesOutstanding: item.weightedAverageShsOut
      }));

      await saveToDBCache('fmp_income_cache', ticker, formatted, ttl, 'period', period);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.error(`FMP income statement error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch income statement for ${ticker}`);
    }
  });
}

export async function getBalanceSheet(ticker, period = 'annual', limit = 5) {
  const cacheKey = getCacheKey('balance', ticker, period);
  const ttl = config.cacheTTL.financials;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getFromDBCache('fmp_balance_cache', ticker, 'period', period);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const endpoint = period === 'quarter'
        ? `/balance-sheet-statement?symbol=${ticker}&period=quarter&limit=${limit}`
        : `/balance-sheet-statement?symbol=${ticker}&limit=${limit}`;

      const data = await fetchFMP(endpoint);

      const formatted = data.map(item => ({
        date: item.date,
        period: item.period,
        totalAssets: item.totalAssets,
        totalLiabilities: item.totalLiabilities,
        totalEquity: item.totalStockholdersEquity,
        cash: item.cashAndCashEquivalents,
        totalDebt: item.totalDebt,
        netDebt: item.netDebt,
        inventory: item.inventory,
        receivables: item.netReceivables
      }));

      await saveToDBCache('fmp_balance_cache', ticker, formatted, ttl, 'period', period);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.error(`FMP balance sheet error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch balance sheet for ${ticker}`);
    }
  });
}

export async function getCashFlow(ticker, period = 'annual', limit = 5) {
  const cacheKey = getCacheKey('cashflow', ticker, period);
  const ttl = config.cacheTTL.financials;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getFromDBCache('fmp_cashflow_cache', ticker, 'period', period);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const endpoint = period === 'quarter'
        ? `/cash-flow-statement?symbol=${ticker}&period=quarter&limit=${limit}`
        : `/cash-flow-statement?symbol=${ticker}&limit=${limit}`;

      const data = await fetchFMP(endpoint);

      const formatted = data.map(item => ({
        date: item.date,
        period: item.period,
        operatingCashFlow: item.netCashProvidedByOperatingActivities,
        investingCashFlow: item.netCashProvidedByInvestingActivities,
        financingCashFlow: item.netCashProvidedByFinancingActivities,
        freeCashFlow: item.freeCashFlow,
        capitalExpenditure: item.investmentsInPropertyPlantAndEquipment,
        dividendsPaid: item.dividendsPaid
      }));

      await saveToDBCache('fmp_cashflow_cache', ticker, formatted, ttl, 'period', period);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.error(`FMP cash flow error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch cash flow for ${ticker}`);
    }
  });
}

export async function getKeyMetrics(ticker, limit = 5) {
  const cacheKey = getCacheKey('metrics', ticker);
  const ttl = config.cacheTTL.financials;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getFromDBCache('fmp_metrics_cache', ticker);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/key-metrics?symbol=${ticker}&limit=${limit}`);

      const formatted = data.map(item => ({
        date: item.date,
        revenuePerShare: item.revenuePerShare,
        netIncomePerShare: item.netIncomePerShare,
        operatingCashFlowPerShare: item.operatingCashFlowPerShare,
        freeCashFlowPerShare: item.freeCashFlowPerShare,
        evToEBITDA: item.evToEBITDA,
        debtToEquity: item.debtToEquityRatio,
        currentRatio: item.currentRatio,
        returnOnEquity: item.returnOnEquity,
        returnOnAssets: item.returnOnAssets,
        earningsYield: item.earningsYield,
        freeCashFlowYield: item.freeCashFlowYield
      }));

      await saveToDBCache('fmp_metrics_cache', ticker, formatted, ttl);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.error(`FMP key metrics error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch key metrics for ${ticker}`);
    }
  });
}

async function getExecutivesFromDB(ticker) {
  const result = await query(
    `SELECT * FROM fmp_executives_cache
     WHERE ticker = $1 AND (cache_expires_at IS NULL OR cache_expires_at > NOW())`,
    [ticker]
  );
  if (result.rows.length > 0) {
    return result.rows.map(row => ({
      name: row.name,
      title: row.title,
      pay: row.pay,
      currencyPay: row.currency_pay,
      gender: row.gender,
      yearBorn: row.year_born,
      titleSince: row.title_since
    }));
  }
  return null;
}

async function saveExecutivesToDB(ticker, executives, ttlSeconds) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  // Delete old entries first
  await query('DELETE FROM fmp_executives_cache WHERE ticker = $1', [ticker]);

  // Insert new entries
  for (const exec of executives) {
    await query(
      `INSERT INTO fmp_executives_cache
         (ticker, name, title, pay, currency_pay, gender, year_born, title_since, fetched_at, cache_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
       ON CONFLICT (ticker, name) DO UPDATE SET
         title = EXCLUDED.title, pay = EXCLUDED.pay, currency_pay = EXCLUDED.currency_pay,
         gender = EXCLUDED.gender, year_born = EXCLUDED.year_born, title_since = EXCLUDED.title_since,
         fetched_at = NOW(), cache_expires_at = EXCLUDED.cache_expires_at`,
      [ticker, exec.name, exec.title, exec.pay, exec.currencyPay, exec.gender, exec.yearBorn, exec.titleSince, expiresAt]
    );
  }
}

export async function getKeyExecutives(ticker) {
  const cacheKey = getCacheKey('executives', ticker);
  const ttl = config.cacheTTL.executives;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getExecutivesFromDB(ticker);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/key-executives?symbol=${ticker}`);

      const formatted = data.map(exec => ({
        name: exec.name,
        title: exec.title,
        pay: exec.pay,
        currencyPay: exec.currencyPay,
        gender: exec.gender,
        yearBorn: exec.yearBorn,
        titleSince: exec.titleSince
      }));

      await saveExecutivesToDB(ticker, formatted, ttl);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.error(`FMP executives error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch executives for ${ticker}`);
    }
  });
}

async function getRatingFromDB(ticker) {
  const result = await query(
    `SELECT * FROM fmp_rating_cache
     WHERE ticker = $1 AND (cache_expires_at IS NULL OR cache_expires_at > NOW())`,
    [ticker]
  );
  if (result.rows.length > 0) {
    const row = result.rows[0];
    // If we have JSON data column with detailed scores, use it
    if (row.data) {
      try {
        return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      } catch {
        // Fall back to basic fields
      }
    }
    // Fall back to basic fields (legacy cache entries)
    return {
      ticker: row.ticker,
      date: row.rating_date,
      rating: row.rating,
      ratingScore: row.rating_score,
      ratingRecommendation: row.rating_recommendation
    };
  }
  return null;
}

async function saveRatingToDB(ticker, rating, ttlSeconds) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  try {
    // Try to store full rating data as JSON for detailed scores (if data column exists)
    await query(
      `INSERT INTO fmp_rating_cache
         (ticker, rating, rating_score, rating_recommendation, rating_date, data, fetched_at, cache_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
       ON CONFLICT (ticker) DO UPDATE SET
         rating = EXCLUDED.rating, rating_score = EXCLUDED.rating_score,
         rating_recommendation = EXCLUDED.rating_recommendation, rating_date = EXCLUDED.rating_date,
         data = EXCLUDED.data, fetched_at = NOW(), cache_expires_at = EXCLUDED.cache_expires_at`,
      [ticker, rating.rating, rating.ratingScore, rating.ratingRecommendation, rating.date, JSON.stringify(rating), expiresAt]
    );
  } catch (err) {
    // Fall back to basic columns if data column doesn't exist
    await query(
      `INSERT INTO fmp_rating_cache
         (ticker, rating, rating_score, rating_recommendation, rating_date, fetched_at, cache_expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       ON CONFLICT (ticker) DO UPDATE SET
         rating = EXCLUDED.rating, rating_score = EXCLUDED.rating_score,
         rating_recommendation = EXCLUDED.rating_recommendation, rating_date = EXCLUDED.rating_date,
         fetched_at = NOW(), cache_expires_at = EXCLUDED.cache_expires_at`,
      [ticker, rating.rating, rating.ratingScore, rating.ratingRecommendation, rating.date, expiresAt]
    );
  }
}

export async function getRating(ticker) {
  const cacheKey = getCacheKey('rating', ticker);
  const ttl = config.cacheTTL.valuation;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getRatingFromDB(ticker);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      // Use FMP's /ratings-snapshot endpoint to get detailed scores
      const data = await fetchFMP(`/ratings-snapshot?symbol=${ticker}`);
      const rating = Array.isArray(data) ? data[0] : data;

      const formatted = {
        ticker,
        date: new Date().toISOString(),
        rating: rating.rating,
        ratingScore: rating.overallScore,
        ratingRecommendation: rating.rating,
        // Map FMP field names to our expected format
        ratingDetailsDCFScore: rating.discountedCashFlowScore,
        ratingDetailsROEScore: rating.returnOnEquityScore,
        ratingDetailsROAScore: rating.returnOnAssetsScore,
        ratingDetailsDEScore: rating.debtToEquityScore,
        ratingDetailsPEScore: rating.priceToEarningsScore,
        ratingDetailsPBScore: rating.priceToBookScore
      };

      await saveRatingToDB(ticker, formatted, ttl);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.error(`FMP rating error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch rating for ${ticker}`);
    }
  });
}

async function getDCFFromDB(ticker) {
  const result = await query(
    `SELECT * FROM fmp_dcf_cache
     WHERE ticker = $1 AND (cache_expires_at IS NULL OR cache_expires_at > NOW())`,
    [ticker]
  );
  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      ticker: row.ticker,
      date: row.dcf_date,
      dcf: parseFloat(row.dcf_value),
      stockPrice: parseFloat(row.stock_price)
    };
  }
  return null;
}

async function saveDCFToDB(ticker, dcf, ttlSeconds) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await query(
    `INSERT INTO fmp_dcf_cache
       (ticker, dcf_value, stock_price, dcf_date, fetched_at, cache_expires_at)
     VALUES ($1, $2, $3, $4, NOW(), $5)
     ON CONFLICT (ticker) DO UPDATE SET
       dcf_value = EXCLUDED.dcf_value, stock_price = EXCLUDED.stock_price, dcf_date = EXCLUDED.dcf_date,
       fetched_at = NOW(), cache_expires_at = EXCLUDED.cache_expires_at`,
    [ticker, dcf.dcf, dcf.stockPrice, dcf.date, expiresAt]
  );
}

export async function getDCF(ticker) {
  const cacheKey = getCacheKey('dcf', ticker);
  const ttl = config.cacheTTL.valuation;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getDCFFromDB(ticker);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/discounted-cash-flow?symbol=${ticker}`);
      const dcf = Array.isArray(data) ? data[0] : data;

      const formatted = {
        ticker: dcf.symbol,
        date: dcf.date,
        dcf: dcf.dcf,
        stockPrice: dcf['Stock Price']
      };

      await saveDCFToDB(ticker, formatted, ttl);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.error(`FMP DCF error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch DCF for ${ticker}`);
    }
  });
}

export async function getFinancialRatios(ticker, limit = 5) {
  const cacheKey = getCacheKey('ratios', ticker);
  const ttl = config.cacheTTL.financials;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getFromDBCache('fmp_ratios_cache', ticker);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/ratios?symbol=${ticker}&limit=${limit}`);

      const formatted = data.map(item => ({
        date: item.date,
        currentRatio: item.currentRatio,
        quickRatio: item.quickRatio,
        grossProfitMargin: item.grossProfitMargin,
        operatingProfitMargin: item.operatingProfitMargin,
        netProfitMargin: item.netProfitMargin,
        returnOnAssets: item.returnOnAssets,
        returnOnEquity: item.returnOnEquity,
        debtRatio: item.debtRatio,
        debtToEquityRatio: item.debtToEquityRatio,
        peRatio: item.priceToEarningsRatio,
        pbRatio: item.priceToBookRatio,
        priceToSalesRatio: item.priceToSalesRatio,
        dividendYield: item.dividendYield,
        payoutRatio: item.payoutRatio,
        pegRatio: item.priceToEarningsGrowthRatio,
        freeCashFlowPerShare: item.freeCashFlowPerShare
      }));

      await saveToDBCache('fmp_ratios_cache', ticker, formatted, ttl);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.error(`FMP ratios error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch ratios for ${ticker}`);
    }
  });
}

export async function getFinancialGrowth(ticker, limit = 5) {
  const cacheKey = getCacheKey('growth', ticker);
  const ttl = config.cacheTTL.financials;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/financial-growth?symbol=${ticker}&limit=${limit}`);

      const formatted = data.map(item => ({
        date: item.date,
        revenueGrowth: item.revenueGrowth,
        grossProfitGrowth: item.grossProfitGrowth,
        operatingIncomeGrowth: item.operatingIncomeGrowth,
        netIncomeGrowth: item.netIncomeGrowth,
        epsGrowth: item.epsgrowth,
        freeCashFlowGrowth: item.freeCashFlowGrowth,
        assetGrowth: item.assetGrowth,
        debtGrowth: item.debtGrowth
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error(`FMP financial growth error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch financial growth for ${ticker}`);
    }
  });
}

export async function getEnterpriseValue(ticker, limit = 5) {
  const cacheKey = getCacheKey('ev', ticker);
  const ttl = config.cacheTTL.financials;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/key-metrics?symbol=${ticker}&limit=${limit}`);

      const formatted = data.map(item => ({
        date: item.date,
        marketCapitalization: item.marketCap,
        enterpriseValue: item.enterpriseValue,
        evToSales: item.evToSales,
        evToEBITDA: item.evToEBITDA
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error(`FMP enterprise value error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch enterprise value for ${ticker}`);
    }
  });
}

export async function getStockNews(ticker, limit = 10) {
  const cacheKey = getCacheKey('news', ticker);
  const ttl = config.cacheTTL.news || 1800;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  try {
    // Use new stable endpoint /news/stock?symbols=TICKER
    const data = await fetchFMP(`/news/stock?symbols=${ticker}&limit=${limit}`);

    const formatted = (Array.isArray(data) ? data : []).map(item => ({
      title: item.title,
      text: item.text,
      url: item.url,
      image: item.image,
      site: item.site,
      publishedDate: item.publishedDate,
      ticker: item.symbol
    }));

    setMemoryCache(cacheKey, formatted, ttl);
    return formatted;
  } catch (err) {
    console.warn(`FMP news not available for ${ticker}:`, err.message);
    return [];
  }
}

export async function getGeneralNews(limit = 50) {
  const cacheKey = getCacheKey('general-news', 'all');
  const ttl = config.cacheTTL.news || 1800;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  try {
    // Use stock news endpoint with major market tickers for general market news
    const majorTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];
    const data = await fetchFMP(`/news/stock?tickers=${majorTickers.join(',')}&limit=${limit}`);

    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Deduplicate by title and sort by date
    const seen = new Set();
    const formatted = data
      .filter(item => {
        if (seen.has(item.title)) return false;
        seen.add(item.title);
        return true;
      })
      .map(item => ({
        title: item.title,
        text: item.text,
        url: item.url,
        image: item.image,
        site: item.site,
        publishedDate: item.publishedDate,
        related: item.symbol || null
      }))
      .slice(0, limit);

    setMemoryCache(cacheKey, formatted, ttl);
    return formatted;
  } catch (err) {
    console.warn('FMP general news not available:', err.message);
    return [];
  }
}

export async function getDividends(ticker) {
  const cacheKey = getCacheKey('dividends', ticker);
  const ttl = config.cacheTTL.financials;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getFromDBCache('fmp_dividends_cache', ticker);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/dividends?symbol=${ticker}`);

      const formatted = (Array.isArray(data) ? data : []).slice(0, 20).map(item => ({
        date: item.date,
        dividend: item.dividend,
        adjDividend: item.adjDividend,
        recordDate: item.recordDate,
        paymentDate: item.paymentDate,
        declarationDate: item.declarationDate
      }));

      await saveToDBCache('fmp_dividends_cache', ticker, formatted, ttl);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.error(`FMP dividends error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch dividends for ${ticker}`);
    }
  });
}

export async function getStockSplits(ticker) {
  const cacheKey = getCacheKey('splits', ticker);
  const ttl = config.cacheTTL.peers;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getFromDBCache('fmp_splits_cache', ticker);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/stock-splits?symbol=${ticker}`);

      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        date: item.date,
        label: item.label,
        numerator: item.numerator,
        denominator: item.denominator
      }));

      await saveToDBCache('fmp_splits_cache', ticker, formatted, ttl);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.warn(`FMP splits not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

async function getPriceTargetFromDB(ticker) {
  const result = await query(
    `SELECT * FROM fmp_price_target_cache
     WHERE ticker = $1 AND (cache_expires_at IS NULL OR cache_expires_at > NOW())`,
    [ticker]
  );
  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      ticker: row.ticker,
      targetHigh: parseFloat(row.target_high),
      targetLow: parseFloat(row.target_low),
      targetConsensus: parseFloat(row.target_consensus),
      targetMedian: parseFloat(row.target_median)
    };
  }
  return null;
}

async function savePriceTargetToDB(ticker, target, ttlSeconds) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await query(
    `INSERT INTO fmp_price_target_cache
       (ticker, target_high, target_low, target_consensus, target_median, fetched_at, cache_expires_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6)
     ON CONFLICT (ticker) DO UPDATE SET
       target_high = EXCLUDED.target_high, target_low = EXCLUDED.target_low,
       target_consensus = EXCLUDED.target_consensus, target_median = EXCLUDED.target_median,
       fetched_at = NOW(), cache_expires_at = EXCLUDED.cache_expires_at`,
    [ticker, target.targetHigh, target.targetLow, target.targetConsensus, target.targetMedian, expiresAt]
  );
}

export async function getPriceTarget(ticker) {
  const cacheKey = getCacheKey('priceTarget', ticker);
  const ttl = config.cacheTTL.valuation;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getPriceTargetFromDB(ticker);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/price-target-consensus?symbol=${ticker}`);
      const target = Array.isArray(data) ? data[0] : data;

      const formatted = {
        ticker: target.symbol,
        targetHigh: target.targetHigh,
        targetLow: target.targetLow,
        targetConsensus: target.targetConsensus,
        targetMedian: target.targetMedian
      };

      await savePriceTargetToDB(ticker, formatted, ttl);
      setMemoryCache(cacheKey, formatted, 300);
      return formatted;
    } catch (err) {
      console.error(`FMP price target error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch price target for ${ticker}`);
    }
  });
}

async function getPeersFromDB(ticker) {
  const result = await query(
    `SELECT peers FROM fmp_peers_cache
     WHERE ticker = $1 AND (cache_expires_at IS NULL OR cache_expires_at > NOW())`,
    [ticker]
  );
  if (result.rows.length > 0) {
    return result.rows[0].peers;
  }
  return null;
}

async function savePeersToDB(ticker, peers, ttlSeconds) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await query(
    `INSERT INTO fmp_peers_cache (ticker, peers, fetched_at, cache_expires_at)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (ticker) DO UPDATE SET
       peers = EXCLUDED.peers, fetched_at = NOW(), cache_expires_at = EXCLUDED.cache_expires_at`,
    [ticker, peers, expiresAt]
  );
}

export async function getStockPeers(ticker) {
  const cacheKey = getCacheKey('peers', ticker);
  const ttl = config.cacheTTL.peers;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  const dbCached = await getPeersFromDB(ticker);
  if (dbCached) {
    setMemoryCache(cacheKey, dbCached, 300);
    return dbCached;
  }

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/stock-peers?symbol=${ticker}`);
      const peers = Array.isArray(data)
        ? data.map(p => p.symbol).filter(s => s !== ticker)
        : [];

      await savePeersToDB(ticker, peers, ttl);
      setMemoryCache(cacheKey, peers, 300);
      return peers;
    } catch (err) {
      console.error(`FMP peers error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch peers for ${ticker}`);
    }
  });
}

// Bulk refresh for scheduled jobs
export async function bulkRefreshProfiles(tickers, delayMs = 500) {
  const results = { success: 0, failed: 0, errors: [] };

  for (const ticker of tickers) {
    try {
      // Force refresh by clearing memory cache
      const cacheKey = getCacheKey('profile', ticker);
      memoryCache.delete(cacheKey);

      // Clear DB cache to force API fetch
      await query('UPDATE company_profiles SET cache_expires_at = NOW() WHERE ticker = $1', [ticker]);

      await getProfile(ticker);
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ ticker, error: err.message });
    }

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return results;
}

export async function bulkRefreshFinancials(tickers, delayMs = 1000) {
  const results = { success: 0, failed: 0, errors: [] };

  for (const ticker of tickers) {
    try {
      // Clear caches
      for (const type of ['income', 'balance', 'cashflow', 'metrics', 'ratios']) {
        const cacheKey = getCacheKey(type, ticker);
        memoryCache.delete(cacheKey);
      }

      // Clear DB caches
      await Promise.all([
        query('DELETE FROM fmp_income_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_balance_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_cashflow_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_metrics_cache WHERE ticker = $1', [ticker]),
        query('DELETE FROM fmp_ratios_cache WHERE ticker = $1', [ticker])
      ]);

      // Fetch fresh data
      await Promise.all([
        getIncomeStatement(ticker).catch(() => null),
        getBalanceSheet(ticker).catch(() => null),
        getCashFlow(ticker).catch(() => null),
        getKeyMetrics(ticker).catch(() => null),
        getFinancialRatios(ticker).catch(() => null)
      ]);

      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ ticker, error: err.message });
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return results;
}

export function clearCache(ticker = null) {
  if (ticker) {
    for (const key of memoryCache.keys()) {
      if (key.includes(`:${ticker}`)) {
        memoryCache.delete(key);
      }
    }
  } else {
    memoryCache.clear();
  }
}

export function getCacheStats() {
  return {
    memoryCacheSize: memoryCache.size,
    pendingRequests: pendingRequests.size
  };
}

export async function getEarningsCalendar(from, to) {
  const cacheKey = `fmp:earnings:${from}:${to}`;
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      // Use new stable endpoint /earnings-calendar
      const data = await fetchFMP(`/earnings-calendar?from=${from}&to=${to}`);

      const formatted = (Array.isArray(data) ? data : [])
        .filter(item => {
          // Filter to only items within date range
          const itemDate = new Date(item.date);
          const fromDate = new Date(from);
          const toDate = new Date(to);
          return itemDate >= fromDate && itemDate <= toDate;
        })
        .map(item => ({
          symbol: item.symbol,
          date: item.date,
          time: item.time || 'bmo', // bmo = before market open, amc = after market close
          epsEstimate: item.epsEstimated,
          revenue: item.revenueActual,
          revenueEstimate: item.revenueEstimated
        }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error(`FMP earnings calendar error:`, err.message);
      return [];
    }
  });
}

export async function getRevenueSegments(ticker, period = 'annual') {
  const cacheKey = getCacheKey('segments', ticker, period);
  const ttl = config.cacheTTL.financials;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const endpoint = period === 'quarter'
        ? `/revenue-product-segmentation?symbol=${ticker}&period=quarter`
        : `/revenue-product-segmentation?symbol=${ticker}`;

      const data = await fetchFMP(endpoint);

      // Transform the data - FMP returns array of objects with date and product keys
      const formatted = (Array.isArray(data) ? data : []).map(item => {
        const { date, ...products } = item;
        return {
          date,
          segments: Object.entries(products).map(([name, value]) => ({
            name,
            revenue: value
          }))
        };
      });

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP revenue segments not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

export async function getProductRevenue(ticker) {
  const cacheKey = getCacheKey('productRevenue', ticker);
  const ttl = config.cacheTTL.financials;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/revenue-product-segmentation?symbol=${ticker}&structure=flat`);
      setMemoryCache(cacheKey, data, ttl);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn(`FMP product revenue not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

export async function getGeographicRevenue(ticker) {
  const cacheKey = getCacheKey('geoRevenue', ticker);
  const ttl = config.cacheTTL.financials;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/revenue-geographic-segmentation?symbol=${ticker}&structure=flat`);
      setMemoryCache(cacheKey, data, ttl);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn(`FMP geographic revenue not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

export async function getInstitutionalHolders(ticker) {
  const cacheKey = getCacheKey('institutional', ticker);
  const ttl = config.cacheTTL.financials;

  const memCached = getFromMemoryCache(cacheKey);
  if (memCached) return memCached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/institutional-holder/${ticker}`);

      const formatted = (Array.isArray(data) ? data : []).slice(0, 20).map(item => ({
        holder: item.holder,
        shares: item.shares,
        dateReported: item.dateReported,
        change: item.change,
        changePercentage: item.changePercentage
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP institutional holders not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

export async function searchSymbols(query, limit = 10) {
  const cacheKey = getCacheKey('search', query.toLowerCase());
  const ttl = 300; // 5 minute cache for search results

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      // Use new stable search-symbol endpoint
      const data = await fetchFMP(`/search-symbol?query=${encodeURIComponent(query)}&limit=${limit * 3}`);

      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchangeFullName || item.exchange || item.stockExchange || item.exchangeShortName || 'N/A'
      }));

      // Sort results to prioritize:
      // 1. Exact symbol matches
      // 2. US exchanges (NASDAQ, NYSE, AMEX)
      // 3. Major international exchanges
      // 4. Others
      const queryUpper = query.toUpperCase();
      const priorityExchanges = ['NASDAQ', 'NYSE', 'AMEX', 'New York Stock Exchange', 'NASDAQ Global Select'];

      formatted.sort((a, b) => {
        // Exact symbol match gets highest priority
        const aExactMatch = a.symbol === queryUpper;
        const bExactMatch = b.symbol === queryUpper;
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        // Symbol starts with query
        const aStartsWith = a.symbol.startsWith(queryUpper);
        const bStartsWith = b.symbol.startsWith(queryUpper);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // US exchanges get priority
        const aIsUS = priorityExchanges.some(ex => a.exchange.includes(ex));
        const bIsUS = priorityExchanges.some(ex => b.exchange.includes(ex));
        if (aIsUS && !bIsUS) return -1;
        if (!aIsUS && bIsUS) return 1;

        // Clean symbols (no dots) get priority over international variants
        const aClean = !a.symbol.includes('.');
        const bClean = !b.symbol.includes('.');
        if (aClean && !bClean) return -1;
        if (!aClean && bClean) return 1;

        return 0;
      });

      const result = formatted.slice(0, limit);
      setMemoryCache(cacheKey, result, ttl);
      return result;
    } catch (err) {
      console.error(`FMP search error for "${query}":`, err.message);
      return [];
    }
  });
}

// Congress Trading - Senate
export async function getSenateTradesLatest(page = 0, limit = 100) {
  const cacheKey = `fmp:senate:latest:${page}:${limit}`;
  const ttl = config.cacheTTL.politicalTrades || 3600;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/senate-latest?page=${page}&limit=${limit}`);
      setMemoryCache(cacheKey, data, ttl);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('FMP senate trades error:', err.message);
      return [];
    }
  });
}

export async function getSenateTradesBySymbol(ticker) {
  const cacheKey = getCacheKey('senateTrades', ticker);
  const ttl = config.cacheTTL.politicalTrades || 3600;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/senate-trades?symbol=${ticker}`);
      setMemoryCache(cacheKey, data, ttl);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn(`FMP senate trades not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

// Congress Trading - House
export async function getHouseTradesLatest(page = 0, limit = 100) {
  const cacheKey = `fmp:house:latest:${page}:${limit}`;
  const ttl = config.cacheTTL.politicalTrades || 3600;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/house-latest?page=${page}&limit=${limit}`);
      setMemoryCache(cacheKey, data, ttl);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('FMP house trades error:', err.message);
      return [];
    }
  });
}

export async function getHouseTradesBySymbol(ticker) {
  const cacheKey = getCacheKey('houseTrades', ticker);
  const ttl = config.cacheTTL.politicalTrades || 3600;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/house-trades?symbol=${ticker}`);
      setMemoryCache(cacheKey, data, ttl);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn(`FMP house trades not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

// Insider Trading
export async function getInsiderTradesLatest(page = 0, limit = 100) {
  const cacheKey = `fmp:insider:latest:${page}:${limit}`;
  const ttl = config.cacheTTL.politicalTrades || 3600;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/insider-trading-latest?page=${page}&limit=${limit}`);
      setMemoryCache(cacheKey, data, ttl);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('FMP insider trades error:', err.message);
      return [];
    }
  });
}

export async function getInsiderTradesBySymbol(ticker, page = 0) {
  const cacheKey = getCacheKey('insiderTrades', `${ticker}-${page}`);
  const ttl = config.cacheTTL.politicalTrades || 3600;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/insider-trading?symbol=${ticker}&page=${page}`);
      setMemoryCache(cacheKey, data, ttl);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn(`FMP insider trades not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

// Stock Screener
export async function screenStocks(filters = {}) {
  const params = new URLSearchParams();

  // Add supported filters
  if (filters.marketCapMoreThan) params.append('marketCapMoreThan', filters.marketCapMoreThan);
  if (filters.marketCapLowerThan) params.append('marketCapLowerThan', filters.marketCapLowerThan);
  if (filters.priceMoreThan) params.append('priceMoreThan', filters.priceMoreThan);
  if (filters.priceLowerThan) params.append('priceLowerThan', filters.priceLowerThan);
  if (filters.betaMoreThan) params.append('betaMoreThan', filters.betaMoreThan);
  if (filters.betaLowerThan) params.append('betaLowerThan', filters.betaLowerThan);
  if (filters.volumeMoreThan) params.append('volumeMoreThan', filters.volumeMoreThan);
  if (filters.volumeLowerThan) params.append('volumeLowerThan', filters.volumeLowerThan);
  if (filters.dividendMoreThan) params.append('dividendMoreThan', filters.dividendMoreThan);
  if (filters.dividendLowerThan) params.append('dividendLowerThan', filters.dividendLowerThan);
  if (filters.sector) params.append('sector', filters.sector);
  if (filters.industry) params.append('industry', filters.industry);
  if (filters.exchange) params.append('exchange', filters.exchange);
  if (filters.country) params.append('country', filters.country || 'US');
  if (filters.isEtf !== undefined) params.append('isEtf', filters.isEtf);
  if (filters.isFund !== undefined) params.append('isFund', filters.isFund);
  if (filters.isActivelyTrading !== undefined) params.append('isActivelyTrading', filters.isActivelyTrading);
  params.append('limit', filters.limit || 50);

  const cacheKey = `fmp:screener:${params.toString()}`;
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/company-screener?${params.toString()}`);

      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        symbol: item.symbol,
        companyName: item.companyName,
        marketCap: item.marketCap,
        sector: item.sector,
        industry: item.industry,
        beta: item.beta,
        price: item.price,
        lastAnnualDividend: item.lastAnnualDividend,
        volume: item.volume,
        exchange: item.exchangeShortName || item.exchange,
        country: item.country,
        isEtf: item.isEtf,
        isFund: item.isFund,
        isActivelyTrading: item.isActivelyTrading
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error('FMP screener error:', err.message);
      return [];
    }
  });
}

// SEC Filings
export async function getSecFilings(ticker, limit = 20) {
  const cacheKey = getCacheKey('secFilings', ticker);
  const ttl = 86400; // 24 hours

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      // Use stable API for SEC filings - requires date range
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setFullYear(fromDate.getFullYear() - 2); // Last 2 years
      const from = fromDate.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];

      const data = await fetchFMP(`/sec-filings-search/symbol?symbol=${ticker}&from=${from}&to=${to}&page=0&limit=${limit}`);

      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        symbol: item.symbol,
        cik: item.cik,
        formType: item.formType || item.type,
        filingDate: item.filingDate || item.fillingDate,
        acceptedDate: item.acceptedDate,
        link: item.link,
        finalLink: item.finalLink
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP SEC filings not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

export async function getEarningsSurprises(ticker, limit = 8) {
  const cacheKey = getCacheKey('earningsSurprises', ticker);
  const ttl = config.cacheTTL.financials;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/earnings-surprises?symbol=${ticker}`);

      const formatted = (Array.isArray(data) ? data : []).slice(0, limit).map(item => ({
        date: item.date,
        symbol: item.symbol,
        actualEarningsResult: item.actualEarningResult,
        estimatedEarning: item.estimatedEarning,
        revenue: item.revenue,
        revenueEstimated: item.revenueEstimated,
        surprisePercent: item.actualEarningResult && item.estimatedEarning
          ? ((item.actualEarningResult - item.estimatedEarning) / Math.abs(item.estimatedEarning) * 100)
          : null,
        revenueSurprisePercent: item.revenue && item.revenueEstimated
          ? ((item.revenue - item.revenueEstimated) / Math.abs(item.revenueEstimated) * 100)
          : null
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP earnings surprises not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

export async function getAnalystGrades(ticker, limit = 20) {
  const cacheKey = getCacheKey('analystGrades', ticker);
  const ttl = config.cacheTTL.valuation;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/upgrades-downgrades?symbol=${ticker}`);

      const formatted = (Array.isArray(data) ? data : []).slice(0, limit).map(item => ({
        symbol: item.symbol,
        publishedDate: item.publishedDate,
        gradingCompany: item.gradingCompany,
        newGrade: item.newGrade,
        previousGrade: item.previousGrade,
        action: item.action // upgrade, downgrade, maintain, init
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP analyst grades not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

// Historical OHLCV for candlestick charts
export async function getOHLCV(ticker, period = '1y') {
  const cacheKey = getCacheKey('ohlcv', ticker, period);
  const ttl = config.cacheTTL.priceHistory;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case '1d': startDate.setDate(startDate.getDate() - 7); break; // Extra days for fallback
        case '5d': startDate.setDate(startDate.getDate() - 14); break;
        case '1m': startDate.setMonth(startDate.getMonth() - 1); break;
        case '3m': startDate.setMonth(startDate.getMonth() - 3); break;
        case '6m': startDate.setMonth(startDate.getMonth() - 6); break;
        case 'ytd':
          startDate.setMonth(0);
          startDate.setDate(1);
          break;
        case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
        case '5y': startDate.setFullYear(startDate.getFullYear() - 5); break;
        case '10y': startDate.setFullYear(startDate.getFullYear() - 10); break;
        case 'max': startDate.setFullYear(startDate.getFullYear() - 20); break;
        default: startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const fromStr = startDate.toISOString().split('T')[0];
      const toStr = endDate.toISOString().split('T')[0];

      const data = await fetchFMP(`/historical-price-eod/full?symbol=${ticker}&from=${fromStr}&to=${toStr}`);

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[FMP] No OHLCV data for ${ticker} from ${fromStr} to ${toStr}`);
        return [];
      }

      const history = data.map(item => ({
        time: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      })).reverse(); // Oldest first

      setMemoryCache(cacheKey, history, ttl);
      return history;
    } catch (err) {
      console.error(`FMP OHLCV error for ${ticker}:`, err.message);
      return [];
    }
  });
}

// Sector Performance
export async function getSectorPerformance() {
  const cacheKey = 'fmp:sectorPerformance';
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      // Get the last trading day (skip weekends)
      const today = new Date();
      let lastTradingDay = new Date(today);

      // If Sunday, go back to Friday
      if (today.getDay() === 0) {
        lastTradingDay.setDate(lastTradingDay.getDate() - 2);
      }
      // If Saturday, go back to Friday
      else if (today.getDay() === 6) {
        lastTradingDay.setDate(lastTradingDay.getDate() - 1);
      }
      // If Monday before market hours, go back to Friday
      else if (today.getDay() === 1 && today.getHours() < 9) {
        lastTradingDay.setDate(lastTradingDay.getDate() - 3);
      }
      // If other weekday before market open, use previous day
      else if (today.getHours() < 9) {
        lastTradingDay.setDate(lastTradingDay.getDate() - 1);
        // If that makes it Sunday, go back to Friday
        if (lastTradingDay.getDay() === 0) {
          lastTradingDay.setDate(lastTradingDay.getDate() - 2);
        }
      }

      const dateStr = lastTradingDay.toISOString().split('T')[0];

      // Use new stable sector-performance-snapshot endpoint
      const data = await fetchFMP(`/sector-performance-snapshot?date=${dateStr}`);

      // Group by sector and get unique sectors (API returns multiple exchanges)
      const sectorMap = new Map();
      (Array.isArray(data) ? data : []).forEach(item => {
        // Prioritize NASDAQ data, or use first occurrence
        if (!sectorMap.has(item.sector) || item.exchange === 'NASDAQ') {
          sectorMap.set(item.sector, {
            sector: item.sector,
            changePercent: item.averageChange || 0
          });
        }
      });

      const formatted = Array.from(sectorMap.values())
        .sort((a, b) => b.changePercent - a.changePercent);

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error('FMP sector performance error:', err.message);
      return [];
    }
  });
}

// Market Movers - Top Gainers
export async function getMarketGainers(limit = 10) {
  const cacheKey = `fmp:marketGainers:${limit}`;
  const ttl = 300; // 5 minute cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP('/biggest-gainers');
      const formatted = (Array.isArray(data) ? data : []).slice(0, limit).map(item => ({
        ticker: item.symbol,
        name: item.name,
        price: item.price,
        change: item.change,
        changePercent: item.changesPercentage
      }));

      // If we got data, update persistent cache
      if (formatted.length > 0) {
        persistentMoversCache.gainers = { data: formatted, lastUpdated: new Date().toISOString() };
        setMemoryCache(cacheKey, formatted, ttl);
        return formatted;
      }

      // No data from API - return persistent cache if available
      if (persistentMoversCache.gainers.data.length > 0) {
        return persistentMoversCache.gainers.data;
      }

      return [];
    } catch (err) {
      console.error('FMP market gainers error:', err.message);
      // Return persistent cache on error
      if (persistentMoversCache.gainers.data.length > 0) {
        return persistentMoversCache.gainers.data;
      }
      return [];
    }
  });
}

// Market Movers - Top Losers
export async function getMarketLosers(limit = 10) {
  const cacheKey = `fmp:marketLosers:${limit}`;
  const ttl = 300; // 5 minute cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP('/biggest-losers');
      const formatted = (Array.isArray(data) ? data : []).slice(0, limit).map(item => ({
        ticker: item.symbol,
        name: item.name,
        price: item.price,
        change: item.change,
        changePercent: item.changesPercentage
      }));

      // If we got data, update persistent cache
      if (formatted.length > 0) {
        persistentMoversCache.losers = { data: formatted, lastUpdated: new Date().toISOString() };
        setMemoryCache(cacheKey, formatted, ttl);
        return formatted;
      }

      // No data from API - return persistent cache if available
      if (persistentMoversCache.losers.data.length > 0) {
        return persistentMoversCache.losers.data;
      }

      return [];
    } catch (err) {
      console.error('FMP market losers error:', err.message);
      // Return persistent cache on error
      if (persistentMoversCache.losers.data.length > 0) {
        return persistentMoversCache.losers.data;
      }
      return [];
    }
  });
}

// Market Movers - Most Active
export async function getMostActive(limit = 10) {
  const cacheKey = `fmp:mostActive:${limit}`;
  const ttl = 300; // 5 minute cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP('/most-actives');
      const formatted = (Array.isArray(data) ? data : []).slice(0, limit).map(item => ({
        ticker: item.symbol,
        name: item.name,
        price: item.price,
        change: item.change,
        changePercent: item.changesPercentage,
        volume: item.volume
      }));

      // If we got data, update persistent cache
      if (formatted.length > 0) {
        persistentMoversCache.mostActive = { data: formatted, lastUpdated: new Date().toISOString() };
        setMemoryCache(cacheKey, formatted, ttl);
        return formatted;
      }

      // No data from API - return persistent cache if available
      if (persistentMoversCache.mostActive.data.length > 0) {
        return persistentMoversCache.mostActive.data;
      }

      return [];
    } catch (err) {
      console.error('FMP most active error:', err.message);
      // Return persistent cache on error
      if (persistentMoversCache.mostActive.data.length > 0) {
        return persistentMoversCache.mostActive.data;
      }
      return [];
    }
  });
}

// All Market Movers in one call
export async function getMarketMovers(limit = 10) {
  const [gainers, losers, mostActive] = await Promise.all([
    getMarketGainers(limit),
    getMarketLosers(limit),
    getMostActive(limit)
  ]);

  // Calculate lastUpdated from the most recent persistent cache timestamp
  const timestamps = [
    persistentMoversCache.gainers.lastUpdated,
    persistentMoversCache.losers.lastUpdated,
    persistentMoversCache.mostActive.lastUpdated
  ].filter(Boolean);

  const lastUpdated = timestamps.length > 0
    ? timestamps.sort().reverse()[0] // Most recent timestamp
    : new Date().toISOString();

  // Check if we're returning cached data (no fresh data from API)
  const isCached = gainers.length === 0 && losers.length === 0 && mostActive.length === 0
    ? false // No data at all
    : (persistentMoversCache.gainers.data === gainers ||
       persistentMoversCache.losers.data === losers ||
       persistentMoversCache.mostActive.data === mostActive);

  return { gainers, losers, mostActive, lastUpdated, isCached };
}

// IPO Calendar
export async function getIPOCalendar(from, to) {
  const cacheKey = `fmp:ipoCalendar:${from}:${to}`;
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/ipos-calendar?from=${from}&to=${to}`);

      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        symbol: item.symbol,
        company: item.company,
        exchange: item.exchange,
        date: item.date,
        priceRange: item.priceRange,
        shares: item.shares,
        expectedPrice: item.expectedPrice,
        marketCap: item.marketCap
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error('FMP IPO calendar error:', err.message);
      return [];
    }
  });
}

// IPO Prospectus - detailed offering information
export async function getIPOProspectus(from, to) {
  const cacheKey = `fmp:ipoProspectus:${from}:${to}`;
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/ipos-prospectus?from=${from}&to=${to}`);

      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        symbol: item.symbol,
        cik: item.cik,
        form: item.form,
        filingDate: item.filingDate,
        acceptedDate: item.acceptedDate,
        effectivenessDate: item.effectivenessDate,
        url: item.url,
        publicOfferingPrice: item.publicOfferingPrice,
        discountOrCommission: item.discountOrCommission,
        proceedsBeforeExpenses: item.proceedsBeforeExpenses,
        sharesOffered: item.sharesOffered,
        ipoDate: item.ipoDate,
        company: item.company
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error('FMP IPO prospectus error:', err.message);
      return [];
    }
  });
}

// IPO Disclosure - SEC filing information
export async function getIPODisclosure(from, to) {
  const cacheKey = `fmp:ipoDisclosure:${from}:${to}`;
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/ipos-disclosure?from=${from}&to=${to}`);

      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        symbol: item.symbol,
        cik: item.cik,
        form: item.form,
        filingDate: item.filingDate,
        acceptedDate: item.acceptedDate,
        effectivenessDate: item.effectivenessDate,
        url: item.url,
        company: item.company,
        exchange: item.exchange,
        ipoDate: item.ipoDate
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error('FMP IPO disclosure error:', err.message);
      return [];
    }
  });
}

// Analyst Estimates (EPS and Revenue forecasts)
// Note: Quarterly estimates require premium FMP subscription, so we always use annual
export async function getAnalystEstimates(ticker, period = 'annual', limit = 4) {
  const cacheKey = getCacheKey('estimates', ticker, 'annual'); // Always annual due to FMP tier
  const ttl = config.cacheTTL.valuation;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      // FMP stable API requires period=annual (quarterly is premium only)
      const endpoint = `/analyst-estimates?symbol=${ticker}&period=annual&limit=${limit}`;

      const data = await fetchFMP(endpoint);

      // Map FMP stable API field names to our expected format
      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        date: item.date,
        symbol: item.symbol,
        estimatedRevenueLow: item.revenueLow,
        estimatedRevenueHigh: item.revenueHigh,
        estimatedRevenueAvg: item.revenueAvg,
        estimatedEpsLow: item.epsLow,
        estimatedEpsHigh: item.epsHigh,
        estimatedEpsAvg: item.epsAvg,
        estimatedNetIncomeLow: item.netIncomeLow,
        estimatedNetIncomeHigh: item.netIncomeHigh,
        estimatedNetIncomeAvg: item.netIncomeAvg,
        numberAnalystEstimatedRevenue: item.numAnalystsRevenue,
        numberAnalystsEstimatedEps: item.numAnalystsEps
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP analyst estimates not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

// Market Hours for exchanges
export async function getMarketHours(exchange = 'NYSE') {
  const cacheKey = `fmp:marketHours:${exchange}`;
  const ttl = 86400; // 24 hour cache (market hours don't change often)

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/market-hours?exchange=${exchange}`);
      const result = Array.isArray(data) ? data[0] : data;
      setMemoryCache(cacheKey, result, ttl);
      return result;
    } catch (err) {
      console.warn(`FMP market hours not available for ${exchange}:`, err.message);
      return null;
    }
  });
}

// Check if market is open
export async function isMarketOpen() {
  const cacheKey = 'fmp:marketOpen';
  const ttl = 60; // 1 minute cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached !== null) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP('/exchange-market-hours?exchange=NYSE');
      // Check if market is currently open based on trading hours
      if (data && data.length > 0) {
        const nyse = data[0];
        const result = nyse.isMarketOpen || false;
        setMemoryCache(cacheKey, result, ttl);
        return result;
      }
      return null;
    } catch (err) {
      console.warn('FMP market open check failed:', err.message);
      return null;
    }
  });
}

// Press Releases
export async function getPressReleases(ticker, limit = 20) {
  const cacheKey = getCacheKey('pressReleases', ticker);
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/press-releases/${ticker}?limit=${limit}`);

      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        symbol: item.symbol,
        date: item.date,
        title: item.title,
        text: item.text
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP press releases not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

// Dividend Calendar
export async function getDividendCalendar(from, to) {
  const cacheKey = `fmp:dividendCalendar:${from}:${to}`;
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/dividends-calendar?from=${from}&to=${to}`);

      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        symbol: item.symbol,
        date: item.date,
        dividend: item.dividend,
        adjDividend: item.adjDividend,
        recordDate: item.recordDate,
        paymentDate: item.paymentDate,
        declarationDate: item.declarationDate
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error('FMP dividend calendar error:', err.message);
      return [];
    }
  });
}

// ETF Holdings
export async function getETFHoldings(ticker, limit = 50) {
  const cacheKey = getCacheKey('etfHoldings', ticker);
  const ttl = 86400; // 24 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/etf-holder/${ticker}`);

      const formatted = (Array.isArray(data) ? data : []).slice(0, limit).map(item => ({
        asset: item.asset,
        sharesNumber: item.sharesNumber,
        weightPercentage: item.weightPercentage,
        marketValue: item.marketValue
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP ETF holdings not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

// Mutual Fund Holders (who owns the stock)
export async function getMutualFundHolders(ticker, limit = 20) {
  const cacheKey = getCacheKey('mutualFundHolders', ticker);
  const ttl = config.cacheTTL.financials;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/mutual-fund-holder/${ticker}`);

      const formatted = (Array.isArray(data) ? data : []).slice(0, limit).map(item => ({
        holder: item.holder,
        shares: item.shares,
        dateReported: item.dateReported,
        change: item.change,
        changePercentage: item.changePercentage,
        marketValue: item.marketValue
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP mutual fund holders not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

// Stock Split Calendar
export async function getStockSplitCalendar(from, to) {
  const cacheKey = `fmp:splitCalendar:${from}:${to}`;
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/splits-calendar?from=${from}&to=${to}`);

      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        symbol: item.symbol,
        date: item.date,
        label: item.label,
        numerator: item.numerator,
        denominator: item.denominator
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error('FMP stock split calendar error:', err.message);
      return [];
    }
  });
}

// Detailed Analyst Grades (individual analyst recommendations)
export async function getDetailedGrades(ticker, limit = 100) {
  const cacheKey = getCacheKey('detailedGrades', ticker);
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/grades?symbol=${ticker}`);

      const formatted = (Array.isArray(data) ? data : []).slice(0, limit).map(item => ({
        symbol: item.symbol,
        date: item.date,
        gradingCompany: item.gradingCompany,
        previousGrade: item.previousGrade,
        newGrade: item.newGrade,
        action: item.action
      }));

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP detailed grades not available for ${ticker}:`, err.message);
      return [];
    }
  });
}

// Price Target Summary (aggregated price target statistics)
export async function getPriceTargetSummary(ticker) {
  const cacheKey = getCacheKey('priceTargetSummary', ticker);
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/price-target-summary?symbol=${ticker}`);

      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      const formatted = result ? {
        symbol: result.symbol,
        lastMonthCount: result.lastMonthCount,
        lastMonthAvgPriceTarget: result.lastMonthAvgPriceTarget,
        lastQuarterCount: result.lastQuarterCount,
        lastQuarterAvgPriceTarget: result.lastQuarterAvgPriceTarget,
        lastYearCount: result.lastYearCount,
        lastYearAvgPriceTarget: result.lastYearAvgPriceTarget,
        allTimeCount: result.allTimeCount,
        allTimeAvgPriceTarget: result.allTimeAvgPriceTarget,
        publishers: typeof result.publishers === 'string' ? JSON.parse(result.publishers) : result.publishers
      } : null;

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP price target summary not available for ${ticker}:`, err.message);
      return null;
    }
  });
}

// ============================================================================
// FMP STARTER PACK EXPANSION - New Endpoints
// ============================================================================

// Financial Scores (Piotroski F-Score & Altman Z-Score)
export async function getFinancialScore(ticker) {
  const cacheKey = getCacheKey('score', ticker);
  const ttl = config.cacheTTL.financials;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/financial-scores?symbol=${ticker}`);
      const score = Array.isArray(data) ? data[0] : data;

      const formatted = {
        symbol: ticker,
        piotroskiScore: score?.piotroskiScore ?? null,
        altmanZScore: score?.altmanZScore ?? null,
        workingCapital: score?.workingCapital ?? null,
        totalAssets: score?.totalAssets ?? null,
        retainedEarnings: score?.retainedEarnings ?? null,
        ebit: score?.ebit ?? null,
        marketCap: score?.marketCap ?? null,
        totalLiabilities: score?.totalLiabilities ?? null,
        revenue: score?.revenue ?? null
      };

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP financial score not available for ${ticker}:`, err.message);
      return null;
    }
  });
}

// Shares Float (Float, Outstanding Shares, Free Float %)
export async function getSharesFloat(ticker) {
  const cacheKey = getCacheKey('float', ticker);
  const ttl = config.cacheTTL.financials;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/shares-float?symbol=${ticker}`);
      const floatData = Array.isArray(data) ? data[0] : data;

      const formatted = {
        symbol: ticker,
        floatShares: floatData?.floatShares ?? null,
        outstandingShares: floatData?.outstandingShares ?? null,
        freeFloat: floatData?.freeFloat ?? null,
        date: floatData?.date ?? null
      };

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP shares float not available for ${ticker}:`, err.message);
      return null;
    }
  });
}

// Industry Performance (market-wide, like sector performance)
export async function getIndustryPerformance() {
  const cacheKey = 'fmp:industryPerformance';
  const ttl = 3600; // 1 hour cache

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP('/industry-performance');

      const formatted = data.map(item => ({
        industry: item.industry,
        changePercent: item.changesPercentage ?? item.changePercent ?? 0
      })).filter(item => item.industry);

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn('FMP industry performance not available:', err.message);
      return [];
    }
  });
}

// Insider Trade Statistics (aggregated insider sentiment)
export async function getInsiderTradeStats(ticker) {
  const cacheKey = getCacheKey('insiderStats', ticker);
  const ttl = config.cacheTTL.financials;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/insider-trading/statistics?symbol=${ticker}`);
      const stats = Array.isArray(data) ? data[0] : data;

      const formatted = {
        symbol: ticker,
        totalBought: stats?.totalAcquired ?? 0,
        totalSold: stats?.totalDisposed ?? 0,
        buyCount: stats?.acquiredTransactions ?? 0,
        sellCount: stats?.disposedTransactions ?? 0,
        averageBuyPrice: stats?.averageAcquired ?? null,
        averageSellPrice: stats?.averageDisposed ?? null,
        year: stats?.year ?? null,
        quarter: stats?.quarter ?? null,
        periodStart: stats?.year && stats?.quarter ? `${stats.year}-Q${stats.quarter}` : null,
        periodEnd: null
      };

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP insider trade stats not available for ${ticker}:`, err.message);
      return null;
    }
  });
}

// Aftermarket Quotes (pre/post market prices)
export async function getAftermarketQuote(ticker) {
  const cacheKey = getCacheKey('aftermarket', ticker);
  const ttl = 60; // 1 minute cache for real-time data

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/pre-post-market?symbol=${ticker}`);
      const quote = Array.isArray(data) ? data[0] : data;

      const formatted = {
        symbol: ticker,
        preMarketPrice: quote?.preMarketPrice ?? null,
        preMarketChange: quote?.preMarketChange ?? null,
        preMarketChangePercent: quote?.preMarketChangePercent ?? null,
        postMarketPrice: quote?.postMarketPrice ?? null,
        postMarketChange: quote?.postMarketChange ?? null,
        postMarketChangePercent: quote?.postMarketChangePercent ?? null,
        timestamp: quote?.timestamp ?? null
      };

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP aftermarket quote not available for ${ticker}:`, err.message);
      return null;
    }
  });
}

// TTM Income Statement (Trailing Twelve Months)
export async function getIncomeStatementTTM(ticker) {
  const cacheKey = getCacheKey('incomeTTM', ticker);
  const ttl = config.cacheTTL.financials;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/income-statement?symbol=${ticker}&period=ttm`);
      const statement = Array.isArray(data) ? data[0] : data;

      if (!statement) return null;

      const formatted = {
        symbol: ticker,
        period: 'TTM',
        revenue: statement.revenue,
        costOfRevenue: statement.costOfRevenue,
        grossProfit: statement.grossProfit,
        operatingExpenses: statement.operatingExpenses,
        operatingIncome: statement.operatingIncome,
        netIncome: statement.netIncome,
        eps: statement.eps,
        epsDiluted: statement.epsdiluted,
        ebitda: statement.ebitda
      };

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP TTM income statement not available for ${ticker}:`, err.message);
      return null;
    }
  });
}

// TTM Balance Sheet (Trailing Twelve Months)
export async function getBalanceSheetTTM(ticker) {
  const cacheKey = getCacheKey('balanceTTM', ticker);
  const ttl = config.cacheTTL.financials;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/balance-sheet-statement?symbol=${ticker}&period=ttm`);
      const statement = Array.isArray(data) ? data[0] : data;

      if (!statement) return null;

      const formatted = {
        symbol: ticker,
        period: 'TTM',
        cashAndCashEquivalents: statement.cashAndCashEquivalents,
        shortTermInvestments: statement.shortTermInvestments,
        totalCurrentAssets: statement.totalCurrentAssets,
        totalAssets: statement.totalAssets,
        totalCurrentLiabilities: statement.totalCurrentLiabilities,
        totalLiabilities: statement.totalLiabilities,
        totalEquity: statement.totalStockholdersEquity,
        totalDebt: statement.totalDebt,
        netDebt: statement.netDebt
      };

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP TTM balance sheet not available for ${ticker}:`, err.message);
      return null;
    }
  });
}

// TTM Cash Flow Statement (Trailing Twelve Months)
export async function getCashFlowTTM(ticker) {
  const cacheKey = getCacheKey('cashflowTTM', ticker);
  const ttl = config.cacheTTL.financials;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/cash-flow-statement?symbol=${ticker}&period=ttm`);
      const statement = Array.isArray(data) ? data[0] : data;

      if (!statement) return null;

      const formatted = {
        symbol: ticker,
        period: 'TTM',
        netIncome: statement.netIncome,
        operatingCashFlow: statement.operatingCashFlow,
        investingCashFlow: statement.netCashUsedForInvestingActivites,
        financingCashFlow: statement.netCashUsedProvidedByFinancingActivities,
        freeCashFlow: statement.freeCashFlow,
        capitalExpenditure: statement.capitalExpenditure
      };

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.warn(`FMP TTM cash flow not available for ${ticker}:`, err.message);
      return null;
    }
  });
}

// Batch quotes for multiple tickers
export async function getBatchQuotes(tickers) {
  const tickerList = Array.isArray(tickers) ? tickers : tickers.split(',');
  const cacheKey = `fmp:batchQuotes:${tickerList.join(',')}`;
  const ttl = config.cacheTTL.quote;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      // Fetch quotes in parallel (batch endpoint requires paid plan)
      const results = await Promise.allSettled(
        tickerList.map(ticker => getQuote(ticker))
      );

      const formatted = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error('FMP batch quotes error:', err.message);
      return [];
    }
  });
}

export default {
  getProfile,
  getQuote,
  getHistoricalPrices,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getKeyMetrics,
  getKeyExecutives,
  getRating,
  getDCF,
  getFinancialRatios,
  getFinancialGrowth,
  getEnterpriseValue,
  getStockNews,
  getGeneralNews,
  getDividends,
  getStockSplits,
  getPriceTarget,
  getStockPeers,
  getRevenueSegments,
  getProductRevenue,
  getGeographicRevenue,
  getInstitutionalHolders,
  getEarningsCalendar,
  getSectorPerformance,
  searchSymbols,
  bulkRefreshProfiles,
  bulkRefreshFinancials,
  clearCache,
  getCacheStats,
  // FMP congress, insider, screener endpoints
  getSenateTradesLatest,
  getSenateTradesBySymbol,
  getHouseTradesLatest,
  getHouseTradesBySymbol,
  getInsiderTradesLatest,
  getInsiderTradesBySymbol,
  screenStocks,
  getSecFilings,
  getOHLCV,
  getBatchQuotes,
  getEarningsSurprises,
  getAnalystGrades,
  // Technical indicators
  getTechnicalIndicators,
  getSMA,
  getEMA,
  getRSI,
  getMACD,
  // Market movers
  getMarketGainers,
  getMarketLosers,
  getMostActive,
  getMarketMovers,
  // Calendars
  getIPOCalendar,
  getIPOProspectus,
  getIPODisclosure,
  getDividendCalendar,
  getStockSplitCalendar,
  // Analyst data
  getAnalystEstimates,
  getDetailedGrades,
  getPriceTargetSummary,
  // Market info
  getMarketHours,
  isMarketOpen,
  // Holdings
  getETFHoldings,
  getMutualFundHolders,
  // Press releases
  getPressReleases,
  // FMP Starter Pack Expansion
  getFinancialScore,
  getSharesFloat,
  getIndustryPerformance,
  getInsiderTradeStats,
  getAftermarketQuote,
  getIncomeStatementTTM,
  getBalanceSheetTTM,
  getCashFlowTTM
};

// Technical indicator calculations
function calculateSMA(prices, period) {
  const result = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

function calculateEMA(prices, period) {
  const result = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

function calculateRSI(prices, period = 14) {
  const result = [];
  const gains = [];
  const losses = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    result.push(rsi);
  }
  return result;
}

function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // Align arrays (slow EMA starts later)
  const offset = slowPeriod - fastPeriod;
  const macdLine = [];

  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = [];

  const signalOffset = signalPeriod - 1;
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signalOffset] - signalLine[i]);
  }

  return { macdLine, signalLine, histogram };
}

export async function getTechnicalIndicators(ticker, days = 100) {
  try {
    const history = await getHistoricalPrices(ticker, { timeseries: days });
    if (!history || history.length < 50) {
      throw new Error('Insufficient price data');
    }

    // Reverse to chronological order (oldest first)
    const prices = [...history].reverse().map(d => d.close);
    const dates = [...history].reverse().map(d => d.date);

    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const rsi = calculateRSI(prices, 14);
    const macd = calculateMACD(prices);

    return {
      dates: dates.slice(-50),
      sma20: sma20.slice(-50),
      sma50: sma50.slice(-50),
      ema12: ema12.slice(-50),
      ema26: ema26.slice(-50),
      rsi: rsi.slice(-50),
      macd: {
        line: macd.macdLine.slice(-50),
        signal: macd.signalLine.slice(-50),
        histogram: macd.histogram.slice(-50)
      },
      latest: {
        sma20: sma20[sma20.length - 1],
        sma50: sma50[sma50.length - 1],
        ema12: ema12[ema12.length - 1],
        ema26: ema26[ema26.length - 1],
        rsi: rsi[rsi.length - 1],
        macd: macd.macdLine[macd.macdLine.length - 1],
        signal: macd.signalLine[macd.signalLine.length - 1],
        histogram: macd.histogram[macd.histogram.length - 1]
      }
    };
  } catch (err) {
    console.error(`Technical indicators error for ${ticker}:`, err.message);
    throw new Error(`Failed to calculate technical indicators for ${ticker}`);
  }
}

export async function getSMA(ticker, period = 20, days = 100) {
  try {
    const history = await getHistoricalPrices(ticker, { timeseries: days });
    if (!history || history.length < period) {
      throw new Error('Insufficient price data');
    }

    const prices = [...history].reverse().map(d => d.close);
    const dates = [...history].reverse().map(d => d.date);
    const sma = calculateSMA(prices, period);

    const startIdx = period - 1;
    return dates.slice(startIdx).map((date, i) => ({
      date,
      value: sma[i]
    }));
  } catch (err) {
    console.error(`SMA error for ${ticker}:`, err.message);
    throw new Error(`Failed to calculate SMA for ${ticker}`);
  }
}

export async function getEMA(ticker, period = 20, days = 100) {
  try {
    const history = await getHistoricalPrices(ticker, { timeseries: days });
    if (!history || history.length < period) {
      throw new Error('Insufficient price data');
    }

    const prices = [...history].reverse().map(d => d.close);
    const dates = [...history].reverse().map(d => d.date);
    const ema = calculateEMA(prices, period);

    const startIdx = period - 1;
    return dates.slice(startIdx).map((date, i) => ({
      date,
      value: ema[i]
    }));
  } catch (err) {
    console.error(`EMA error for ${ticker}:`, err.message);
    throw new Error(`Failed to calculate EMA for ${ticker}`);
  }
}

export async function getRSI(ticker, period = 14, days = 100) {
  try {
    const history = await getHistoricalPrices(ticker, { timeseries: days });
    if (!history || history.length < period + 1) {
      throw new Error('Insufficient price data');
    }

    const prices = [...history].reverse().map(d => d.close);
    const dates = [...history].reverse().map(d => d.date);
    const rsi = calculateRSI(prices, period);

    const startIdx = period + period;
    return dates.slice(startIdx).map((date, i) => ({
      date,
      value: rsi[i]
    }));
  } catch (err) {
    console.error(`RSI error for ${ticker}:`, err.message);
    throw new Error(`Failed to calculate RSI for ${ticker}`);
  }
}

export async function getMACD(ticker, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9, days = 100) {
  try {
    const history = await getHistoricalPrices(ticker, { timeseries: days });
    if (!history || history.length < slowPeriod + signalPeriod) {
      throw new Error('Insufficient price data');
    }

    const prices = [...history].reverse().map(d => d.close);
    const dates = [...history].reverse().map(d => d.date);
    const macd = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);

    const startIdx = slowPeriod + signalPeriod - 2;
    return dates.slice(startIdx).map((date, i) => ({
      date,
      macd: macd.macdLine[i + signalPeriod - 1],
      signal: macd.signalLine[i],
      histogram: macd.histogram[i]
    }));
  } catch (err) {
    console.error(`MACD error for ${ticker}:`, err.message);
    throw new Error(`Failed to calculate MACD for ${ticker}`);
  }
}
