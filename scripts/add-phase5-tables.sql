-- Phase 5: News & Economic Data Tables
-- Run with: docker-compose exec postgres psql -U marketmint -d marketmint -f /scripts/add-phase5-tables.sql

-- FRED economic data cache
CREATE TABLE IF NOT EXISTS fred_cache (
  id SERIAL PRIMARY KEY,
  series_id VARCHAR(20) NOT NULL,
  observation_date DATE NOT NULL,
  value DECIMAL(20,4),
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  cache_expires_at TIMESTAMPTZ,
  UNIQUE(series_id, observation_date)
);

-- News cache
CREATE TABLE IF NOT EXISTS fmp_news_cache (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10),
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  image_url TEXT,
  source VARCHAR(100),
  published_at TIMESTAMPTZ,
  sentiment VARCHAR(20),
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  cache_expires_at TIMESTAMPTZ
);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_token UUID DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{}'::jsonb
);

-- Newsletter send log
CREATE TABLE IF NOT EXISTS newsletter_sends (
  id SERIAL PRIMARY KEY,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient_count INT DEFAULT 0,
  subject TEXT,
  content_html TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fred_cache_series ON fred_cache(series_id);
CREATE INDEX IF NOT EXISTS idx_fred_cache_expires ON fred_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_news_cache_ticker ON fmp_news_cache(ticker);
CREATE INDEX IF NOT EXISTS idx_news_cache_published ON fmp_news_cache(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_cache_expires ON fmp_news_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON newsletter_subscribers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON newsletter_subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_status ON newsletter_sends(status);

-- Cleanup function for expired cache
CREATE OR REPLACE FUNCTION cleanup_phase5_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM fred_cache WHERE cache_expires_at < NOW();
  DELETE FROM fmp_news_cache WHERE cache_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE 'Phase 5 tables created successfully:';
  RAISE NOTICE '  - fred_cache';
  RAISE NOTICE '  - fmp_news_cache';
  RAISE NOTICE '  - newsletter_subscribers';
  RAISE NOTICE '  - newsletter_sends';
END $$;
