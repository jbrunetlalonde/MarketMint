-- Article Extraction Cache table
-- Stores extracted full article content from external news URLs

CREATE TABLE IF NOT EXISTS extracted_articles (
  id SERIAL PRIMARY KEY,
  original_url TEXT NOT NULL UNIQUE,
  url_hash VARCHAR(64) NOT NULL,

  -- Extracted content
  title TEXT,
  content TEXT,
  excerpt TEXT,
  author TEXT,
  site_name TEXT,
  published_date TIMESTAMPTZ,
  word_count INTEGER,
  reading_time_minutes INTEGER,

  -- Related article matching
  ticker VARCHAR(10),
  keywords TEXT[],

  -- Status tracking
  extraction_status VARCHAR(20) DEFAULT 'pending',
  extraction_error TEXT,

  -- Timestamps
  extracted_at TIMESTAMPTZ,
  cache_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast URL lookups
CREATE INDEX IF NOT EXISTS idx_extracted_url_hash ON extracted_articles(url_hash);

-- Index for ticker-based related articles
CREATE INDEX IF NOT EXISTS idx_extracted_ticker ON extracted_articles(ticker);

-- GIN index for keyword array matching
CREATE INDEX IF NOT EXISTS idx_extracted_keywords ON extracted_articles USING GIN(keywords);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_extracted_status ON extracted_articles(extraction_status);

-- Index for cache expiration cleanup
CREATE INDEX IF NOT EXISTS idx_extracted_expires ON extracted_articles(cache_expires_at);

-- Index for site_name lookups (related articles)
CREATE INDEX IF NOT EXISTS idx_extracted_site_name ON extracted_articles(site_name);
