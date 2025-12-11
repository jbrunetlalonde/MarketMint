-- Portfolio Holdings table
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    shares NUMERIC(18, 8) NOT NULL CHECK (shares > 0),
    cost_basis NUMERIC(18, 4) NOT NULL CHECK (cost_basis > 0),
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_id ON portfolio_holdings(user_id);

-- Index for ticker lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_ticker ON portfolio_holdings(ticker);

-- Composite index for user + ticker queries
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_ticker ON portfolio_holdings(user_id, ticker);
