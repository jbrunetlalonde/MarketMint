-- Migration: Add indexes and constraints to political_trades table
-- Created: 2024-12-07
-- Issues addressed: #015 (missing indexes), #016 (missing unique constraint)

-- First, clean up any duplicate records (keep the most recent by id)
-- This must run before adding the unique constraint
DELETE FROM political_trades a
USING political_trades b
WHERE a.id < b.id
  AND a.official_name = b.official_name
  AND a.ticker = b.ticker
  AND a.transaction_date = b.transaction_date
  AND a.transaction_type = b.transaction_type
  AND COALESCE(a.amount_min, 0) = COALESCE(b.amount_min, 0)
  AND COALESCE(a.amount_max, 0) = COALESCE(b.amount_max, 0);

-- Add unique constraint to prevent duplicate trades
-- Natural key: official_name + ticker + transaction_date + transaction_type + amount range
-- Note: Using COALESCE to handle NULLs since NULLS NOT DISTINCT requires PostgreSQL 15+
CREATE UNIQUE INDEX IF NOT EXISTS idx_political_trades_unique_trade
ON political_trades (
  official_name,
  ticker,
  COALESCE(transaction_date, '1900-01-01'),
  transaction_type,
  COALESCE(amount_min, -1),
  COALESCE(amount_max, -1)
);

-- Functional index for case-insensitive official name searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_political_trades_official_name_lower
ON political_trades (LOWER(official_name));

-- Index for date-based queries (most recent trades)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_political_trades_dates
ON political_trades (reported_date DESC NULLS LAST, transaction_date DESC NULLS LAST);

-- Index for ticker lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_political_trades_ticker
ON political_trades (ticker);

-- Composite index for common query pattern (official + date ordering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_political_trades_official_date
ON political_trades (LOWER(official_name), reported_date DESC NULLS LAST);

-- Index on political_officials for name lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_political_officials_name_lower
ON political_officials (LOWER(name));
