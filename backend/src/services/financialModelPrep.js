import { config } from '../config/env.js';
import { query } from '../config/database.js';

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

// In-memory cache for hot data (quick access layer)
const memoryCache = new Map();

// In-flight request deduplication (prevent duplicate API calls)
const pendingRequests = new Map();

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
        avgVolume: null,
        marketCap: quote.marketCap,
        peRatio: null,
        eps: null,
        fiftyTwoWeekHigh: quote.yearHigh,
        fiftyTwoWeekLow: quote.yearLow,
        exchange: quote.exchange
      };

      setMemoryCache(cacheKey, formatted, ttl);
      return formatted;
    } catch (err) {
      console.error(`FMP quote error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch quote for ${ticker}`);
    }
  });
}

export async function getHistoricalPrices(ticker, period = '1y') {
  const cacheKey = getCacheKey('history', ticker, period);
  const ttl = config.cacheTTL.priceHistory;

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      const data = await fetchFMP(`/historical-price-eod/full?symbol=${ticker}`);

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No historical data');
      }

      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case '1d': startDate.setDate(startDate.getDate() - 1); break;
        case '5d': startDate.setDate(startDate.getDate() - 5); break;
        case '1m': startDate.setMonth(startDate.getMonth() - 1); break;
        case '3m': startDate.setMonth(startDate.getMonth() - 3); break;
        case '6m': startDate.setMonth(startDate.getMonth() - 6); break;
        case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
        case '5y': startDate.setFullYear(startDate.getFullYear() - 5); break;
        default: startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const history = data
        .filter(item => new Date(item.date) >= startDate)
        .map(item => ({
          date: item.date,
          close: item.close,
          volume: item.volume
        }))
        .reverse();

      setMemoryCache(cacheKey, history, ttl);
      return history;
    } catch (err) {
      console.error(`FMP historical error for ${ticker}:`, err.message);
      throw new Error(`Failed to fetch historical data for ${ticker}`);
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
        peRatio: item.priceToEarningsRatio || item.peRatio,
        pbRatio: item.priceToBookRatio || item.pbRatio,
        debtToEquity: item.debtToEquityRatio || item.debtToEquity,
        currentRatio: item.currentRatio,
        roe: item.returnOnEquity || item.roe,
        roa: item.returnOnAssets || item.roa,
        dividendYield: item.dividendYield
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
      const data = await fetchFMP(`/ratios?symbol=${ticker}&limit=1`);
      const ratio = Array.isArray(data) ? data[0] : data;

      let score = 3;
      const peRatio = ratio.priceToEarningsRatio;
      const pbRatio = ratio.priceToBookRatio;
      const roe = ratio.returnOnEquity;

      if (peRatio && peRatio < 15) score += 0.5;
      if (peRatio && peRatio < 10) score += 0.5;
      if (pbRatio && pbRatio < 3) score += 0.5;
      if (roe && roe > 0.15) score += 0.5;

      const ratings = ['Strong Sell', 'Sell', 'Hold', 'Buy', 'Strong Buy'];
      const ratingIndex = Math.min(4, Math.max(0, Math.round(score) - 1));

      const formatted = {
        ticker,
        date: ratio.date,
        rating: ratings[ratingIndex],
        ratingScore: Math.round(score),
        ratingRecommendation: ratings[ratingIndex]
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
        debtEquityRatio: item.debtToEquityRatio,
        priceEarningsRatio: item.priceToEarningsRatio,
        priceToBookRatio: item.priceToBookRatio,
        priceToSalesRatio: item.priceToSalesRatio,
        dividendYield: item.dividendYield,
        payoutRatio: item.payoutRatio
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
    const data = await fetchFMP(`/stock-news?symbol=${ticker}&limit=${limit}`);

    const formatted = data.map(item => ({
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

export async function searchSymbols(query, limit = 10) {
  const cacheKey = getCacheKey('search', query.toLowerCase());
  const ttl = 300; // 5 minute cache for search results

  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  return deduplicatedRequest(cacheKey, async () => {
    try {
      // Fetch more results to allow for sorting/filtering
      const data = await fetchFMP(`/search-name?query=${encodeURIComponent(query)}&limit=${limit * 3}`);

      const formatted = (Array.isArray(data) ? data : []).map(item => ({
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchangeFullName || item.exchange || 'N/A'
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
  getEnterpriseValue,
  getStockNews,
  getDividends,
  getStockSplits,
  getPriceTarget,
  getStockPeers,
  searchSymbols,
  bulkRefreshProfiles,
  bulkRefreshFinancials,
  clearCache,
  getCacheStats
};
