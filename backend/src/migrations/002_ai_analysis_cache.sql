-- AI Analysis Cache table for storing OpenAI-generated analysis
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  analysis_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(ticker, analysis_type)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_ai_analysis_ticker ON ai_analysis_cache(ticker);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_expires ON ai_analysis_cache(expires_at);
