-- MarketMint Trading Platform Database Schema
-- PostgreSQL 16

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user'))
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WATCHLIST MANAGEMENT
-- ============================================

CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, ticker)
);

-- ============================================
-- MARKET DATA
-- ============================================

-- Historical Price Data (cached from Yahoo Finance)
CREATE TABLE price_history (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  open DECIMAL(12,4),
  high DECIMAL(12,4),
  low DECIMAL(12,4),
  close DECIMAL(12,4),
  volume BIGINT,
  adjusted_close DECIMAL(12,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ticker, date)
);

-- Real-time Quote Cache
CREATE TABLE quote_cache (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) UNIQUE NOT NULL,
  price DECIMAL(12,4),
  previous_close DECIMAL(12,4),
  change_amount DECIMAL(12,4),
  change_percent DECIMAL(8,4),
  day_high DECIMAL(12,4),
  day_low DECIMAL(12,4),
  volume BIGINT,
  avg_volume BIGINT,
  market_cap BIGINT,
  pe_ratio DECIMAL(12,4),
  eps DECIMAL(12,4),
  dividend_yield DECIMAL(8,4),
  fifty_two_week_high DECIMAL(12,4),
  fifty_two_week_low DECIMAL(12,4),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ttl_expires TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- FINANCIAL STATEMENTS
-- ============================================

CREATE TABLE financials (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  period VARCHAR(20) NOT NULL, -- 'Q1_2024', 'Q2_2024', 'FY2024', etc.
  period_end_date DATE,

  -- Income Statement
  revenue BIGINT,
  cost_of_revenue BIGINT,
  gross_profit BIGINT,
  operating_income BIGINT,
  net_income BIGINT,
  ebitda BIGINT,

  -- Per Share
  eps DECIMAL(12,4),
  eps_diluted DECIMAL(12,4),

  -- Cash Flow
  operating_cash_flow BIGINT,
  capital_expenditure BIGINT,
  free_cash_flow BIGINT,

  -- Balance Sheet
  total_assets BIGINT,
  total_liabilities BIGINT,
  total_debt BIGINT,
  cash_and_equivalents BIGINT,
  shareholders_equity BIGINT,

  -- Ratios
  roe DECIMAL(8,4),
  roa DECIMAL(8,4),
  roi DECIMAL(8,4),
  debt_to_equity DECIMAL(8,4),
  current_ratio DECIMAL(8,4),
  quick_ratio DECIMAL(8,4),

  retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ticker, period)
);

-- Company Profiles
CREATE TABLE company_profiles (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) UNIQUE NOT NULL,
  company_name VARCHAR(500) NOT NULL,
  exchange VARCHAR(50),
  sector VARCHAR(100),
  industry VARCHAR(200),
  description TEXT,
  ceo VARCHAR(255),
  employees INTEGER,
  headquarters VARCHAR(255),
  website VARCHAR(500),
  logo_url VARCHAR(500),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- POLITICAL TRADING
-- ============================================

CREATE TABLE political_officials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(100), -- 'Senator', 'Representative'
  party VARCHAR(50),
  state VARCHAR(50),
  district VARCHAR(50),
  ai_portrait_url VARCHAR(500),
  portrait_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE political_trades (
  id BIGSERIAL PRIMARY KEY,
  official_id UUID REFERENCES political_officials(id) ON DELETE SET NULL,
  official_name VARCHAR(255) NOT NULL,
  ticker VARCHAR(20) NOT NULL,
  asset_description VARCHAR(500),
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('BUY', 'SELL', 'EXCHANGE')),
  transaction_date DATE,
  reported_date DATE,
  amount_min BIGINT,
  amount_max BIGINT,
  amount_display VARCHAR(100), -- '$100,001 - $250,000'
  source_url VARCHAR(500),
  retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NEWSLETTER & CONTENT
-- ============================================

CREATE TABLE newsletter_articles (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE,
  category VARCHAR(50) CHECK (category IN ('trending_stocks', 'market_news', 'economics', 'political_trades', 'analysis')),
  content TEXT NOT NULL,
  summary TEXT,
  featured_ticker VARCHAR(20),
  chart_config JSONB, -- Embedded chart configuration
  image_url VARCHAR(500),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id)
);

-- ============================================
-- TRADING IDEAS
-- ============================================

CREATE TABLE trading_ideas (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  title VARCHAR(255),
  thesis TEXT NOT NULL,
  entry_price DECIMAL(12,4),
  target_price DECIMAL(12,4),
  stop_loss DECIMAL(12,4),
  timeframe VARCHAR(50) CHECK (timeframe IN ('intraday', 'swing', 'position', 'long_term')),
  sentiment VARCHAR(20) CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'stopped_out', 'target_hit')),
  actual_exit_price DECIMAL(12,4),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NEWS CACHE
-- ============================================

CREATE TABLE news_cache (
  id BIGSERIAL PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  url VARCHAR(1000) NOT NULL,
  image_url VARCHAR(1000),
  published_at TIMESTAMP WITH TIME ZONE,
  tickers VARCHAR(200)[], -- Array of related tickers
  sentiment VARCHAR(20),
  retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Market Data
CREATE INDEX idx_price_history_ticker_date ON price_history(ticker, date DESC);
CREATE INDEX idx_quote_cache_ticker ON quote_cache(ticker);
CREATE INDEX idx_quote_cache_ttl ON quote_cache(ttl_expires) WHERE ttl_expires IS NOT NULL;

-- Financials
CREATE INDEX idx_financials_ticker ON financials(ticker);
CREATE INDEX idx_financials_ticker_period ON financials(ticker, period_end_date DESC);
CREATE INDEX idx_company_profiles_ticker ON company_profiles(ticker);
CREATE INDEX idx_company_profiles_sector ON company_profiles(sector);

-- Watchlists
CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_watchlists_ticker ON watchlists(ticker);

-- Political
CREATE INDEX idx_political_trades_ticker ON political_trades(ticker);
CREATE INDEX idx_political_trades_date ON political_trades(transaction_date DESC);
CREATE INDEX idx_political_trades_official ON political_trades(official_id);

-- Newsletter
CREATE INDEX idx_newsletter_published_at ON newsletter_articles(published_at DESC);
CREATE INDEX idx_newsletter_category ON newsletter_articles(category);
CREATE INDEX idx_newsletter_slug ON newsletter_articles(slug);

-- Trading Ideas
CREATE INDEX idx_trading_ideas_user ON trading_ideas(user_id);
CREATE INDEX idx_trading_ideas_ticker ON trading_ideas(ticker);
CREATE INDEX idx_trading_ideas_status ON trading_ideas(status);

-- News
CREATE INDEX idx_news_cache_published ON news_cache(published_at DESC);
CREATE INDEX idx_news_cache_tickers ON news_cache USING GIN(tickers);

-- ============================================
-- MATERIALIZED VIEWS
-- ============================================

-- Trending stocks based on watchlist activity
CREATE MATERIALIZED VIEW trending_stocks AS
SELECT
  w.ticker,
  COUNT(DISTINCT w.user_id) as watchlist_count,
  q.price,
  q.change_percent,
  q.volume,
  q.market_cap
FROM watchlists w
LEFT JOIN quote_cache q ON w.ticker = q.ticker
GROUP BY w.ticker, q.price, q.change_percent, q.volume, q.market_cap
ORDER BY watchlist_count DESC
LIMIT 50;

CREATE UNIQUE INDEX idx_trending_stocks_ticker ON trending_stocks(ticker);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_articles_updated_at
  BEFORE UPDATE ON newsletter_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_ideas_updated_at
  BEFORE UPDATE ON trading_ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA (Optional seed data)
-- ============================================

-- Create admin user (password: 'admin123' - change in production!)
-- Password hash generated with bcrypt cost factor 12
INSERT INTO users (username, email, password_hash, role)
VALUES (
  'admin',
  'admin@marketmint.local',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.U8v7JWqWQ6/5Hy',
  'admin'
) ON CONFLICT (username) DO NOTHING;
