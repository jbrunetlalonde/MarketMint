-- FMP Data Cache Tables Migration
-- Adds persistent PostgreSQL caching for Financial Modeling Prep API data
-- Run this after the main schema.sql

-- ============================================
-- FMP CACHE TABLES
-- ============================================

-- Company profiles cache (extends existing company_profiles)
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS ipo_date DATE,
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS fmp_fetched_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cache_expires_at TIMESTAMP WITH TIME ZONE;

-- Key executives cache
CREATE TABLE IF NOT EXISTS fmp_executives_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  pay BIGINT,
  currency_pay VARCHAR(10),
  gender VARCHAR(20),
  year_born INTEGER,
  title_since INTEGER,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(ticker, name)
);

-- Income statement cache (stores full response as JSONB for flexibility)
CREATE TABLE IF NOT EXISTS fmp_income_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  period VARCHAR(20) NOT NULL, -- 'annual' or 'quarter'
  data JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(ticker, period)
);

-- Balance sheet cache
CREATE TABLE IF NOT EXISTS fmp_balance_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  period VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(ticker, period)
);

-- Cash flow cache
CREATE TABLE IF NOT EXISTS fmp_cashflow_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  period VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(ticker, period)
);

-- Key metrics cache
CREATE TABLE IF NOT EXISTS fmp_metrics_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(ticker)
);

-- Financial ratios cache
CREATE TABLE IF NOT EXISTS fmp_ratios_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(ticker)
);

-- Analyst rating cache
CREATE TABLE IF NOT EXISTS fmp_rating_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) UNIQUE NOT NULL,
  rating VARCHAR(50),
  rating_score INTEGER,
  rating_recommendation VARCHAR(50),
  rating_date DATE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE
);

-- DCF valuation cache
CREATE TABLE IF NOT EXISTS fmp_dcf_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) UNIQUE NOT NULL,
  dcf_value DECIMAL(12,4),
  stock_price DECIMAL(12,4),
  dcf_date DATE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE
);

-- Price target cache
CREATE TABLE IF NOT EXISTS fmp_price_target_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) UNIQUE NOT NULL,
  target_high DECIMAL(12,4),
  target_low DECIMAL(12,4),
  target_consensus DECIMAL(12,4),
  target_median DECIMAL(12,4),
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE
);

-- Stock peers cache
CREATE TABLE IF NOT EXISTS fmp_peers_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) UNIQUE NOT NULL,
  peers VARCHAR(20)[] NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE
);

-- Dividends cache
CREATE TABLE IF NOT EXISTS fmp_dividends_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(ticker)
);

-- Stock splits cache
CREATE TABLE IF NOT EXISTS fmp_splits_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(ticker)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_fmp_executives_ticker ON fmp_executives_cache(ticker);
CREATE INDEX IF NOT EXISTS idx_fmp_executives_expires ON fmp_executives_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_fmp_income_ticker ON fmp_income_cache(ticker);
CREATE INDEX IF NOT EXISTS idx_fmp_income_expires ON fmp_income_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_fmp_balance_ticker ON fmp_balance_cache(ticker);
CREATE INDEX IF NOT EXISTS idx_fmp_cashflow_ticker ON fmp_cashflow_cache(ticker);
CREATE INDEX IF NOT EXISTS idx_fmp_metrics_expires ON fmp_metrics_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_fmp_ratios_expires ON fmp_ratios_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_fmp_rating_expires ON fmp_rating_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_fmp_dcf_expires ON fmp_dcf_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_fmp_price_target_expires ON fmp_price_target_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_fmp_peers_expires ON fmp_peers_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_fmp_dividends_expires ON fmp_dividends_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_company_profiles_expires ON company_profiles(cache_expires_at);

-- ============================================
-- CLEANUP FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_fmp_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM fmp_executives_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_income_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_balance_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_cashflow_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_metrics_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_ratios_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_rating_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_dcf_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_price_target_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_peers_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_dividends_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_splits_cache WHERE cache_expires_at < NOW();
  UPDATE company_profiles SET fmp_fetched_at = NULL WHERE cache_expires_at < NOW();

  VACUUM ANALYZE fmp_executives_cache;
  VACUUM ANALYZE fmp_income_cache;
  VACUUM ANALYZE fmp_balance_cache;
  VACUUM ANALYZE fmp_cashflow_cache;
  VACUUM ANALYZE fmp_metrics_cache;
  VACUUM ANALYZE fmp_ratios_cache;
  VACUUM ANALYZE company_profiles;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BULK REFRESH TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS fmp_refresh_log (
  id BIGSERIAL PRIMARY KEY,
  data_type VARCHAR(50) NOT NULL, -- 'profile', 'financials', 'valuations'
  tickers_processed INTEGER DEFAULT 0,
  tickers_failed INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed'
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_fmp_refresh_log_status ON fmp_refresh_log(status, started_at DESC);
