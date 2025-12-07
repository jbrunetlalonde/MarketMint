-- Migration: Add political trading constraints and alerts table
-- Run this after schema.sql

-- Add UNIQUE constraint on political_officials.name for ON CONFLICT support
ALTER TABLE political_officials
ADD CONSTRAINT political_officials_name_unique UNIQUE (name);

-- Add trade alerts table for watchlist notifications
CREATE TABLE IF NOT EXISTS trade_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trade_id BIGINT REFERENCES political_trades(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  official_name VARCHAR(255),
  transaction_type VARCHAR(20),
  amount_display VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for trade_alerts
CREATE INDEX idx_trade_alerts_user ON trade_alerts(user_id);
CREATE INDEX idx_trade_alerts_unread ON trade_alerts(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_trade_alerts_created ON trade_alerts(created_at DESC);

-- Add FMP cache columns to company_profiles if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'company_profiles' AND column_name = 'ipo_date') THEN
    ALTER TABLE company_profiles ADD COLUMN ipo_date VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'company_profiles' AND column_name = 'image_url') THEN
    ALTER TABLE company_profiles ADD COLUMN image_url VARCHAR(500);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'company_profiles' AND column_name = 'fmp_fetched_at') THEN
    ALTER TABLE company_profiles ADD COLUMN fmp_fetched_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'company_profiles' AND column_name = 'cache_expires_at') THEN
    ALTER TABLE company_profiles ADD COLUMN cache_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Ensure political_trades has proper indexes for common queries
CREATE INDEX IF NOT EXISTS idx_political_trades_official_name ON political_trades(official_name);
CREATE INDEX IF NOT EXISTS idx_political_trades_reported ON political_trades(reported_date DESC NULLS LAST);
