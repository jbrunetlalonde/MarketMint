-- PostgreSQL Performance Initialization for MarketMint
-- This script runs after the main schema is created

-- Create additional indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_ticker_recent ON price_history(ticker, date DESC)
  WHERE date > CURRENT_DATE - INTERVAL '1 year';

-- Partial index for recent data (most common queries)
CREATE INDEX IF NOT EXISTS idx_quote_cache_active ON quote_cache(ticker)
  WHERE ttl_expires IS NULL OR ttl_expires > NOW();

-- Statistics for the query planner
ANALYZE price_history;
ANALYZE quote_cache;
ANALYZE financials;
ANALYZE watchlists;

-- Set default statistics target for better query plans
ALTER TABLE price_history ALTER COLUMN ticker SET STATISTICS 1000;
ALTER TABLE price_history ALTER COLUMN date SET STATISTICS 1000;

-- Function to clean up expired cache entries (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  -- Clean expired quote cache entries
  DELETE FROM quote_cache
  WHERE ttl_expires IS NOT NULL AND ttl_expires < NOW() - INTERVAL '1 hour';

  -- Clean old news cache (older than 7 days)
  DELETE FROM news_cache
  WHERE retrieved_at < NOW() - INTERVAL '7 days';

  -- Vacuum the cleaned tables
  VACUUM ANALYZE quote_cache;
  VACUUM ANALYZE news_cache;
END;
$$ LANGUAGE plpgsql;

-- Function to get price history efficiently with date range
CREATE OR REPLACE FUNCTION get_price_history(
  p_ticker VARCHAR(20),
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  open DECIMAL(12,4),
  high DECIMAL(12,4),
  low DECIMAL(12,4),
  close DECIMAL(12,4),
  volume BIGINT,
  adjusted_close DECIMAL(12,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT ph.date, ph.open, ph.high, ph.low, ph.close, ph.volume, ph.adjusted_close
  FROM price_history ph
  WHERE ph.ticker = p_ticker
    AND ph.date >= p_start_date
    AND ph.date <= p_end_date
  ORDER BY ph.date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Materialized view for commonly accessed data
CREATE MATERIALIZED VIEW IF NOT EXISTS market_summary AS
SELECT
  q.ticker,
  q.price,
  q.change_percent,
  q.volume,
  q.market_cap,
  cp.company_name,
  cp.sector,
  cp.industry,
  (SELECT COUNT(*) FROM watchlists w WHERE w.ticker = q.ticker) as watchlist_count
FROM quote_cache q
LEFT JOIN company_profiles cp ON q.ticker = cp.ticker
WHERE q.ttl_expires IS NULL OR q.ttl_expires > NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_summary_ticker ON market_summary(ticker);

-- Refresh function for market summary
CREATE OR REPLACE FUNCTION refresh_market_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY market_summary;
EXCEPTION
  WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW market_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO marketmint;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO marketmint;
