-- Trading Idea Alerts Table
-- Alerts for when trading ideas hit target or stop loss

CREATE TABLE IF NOT EXISTS idea_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id BIGINT REFERENCES trading_ideas(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('target_hit', 'stopped_out')),
  trigger_price DECIMAL(12,4),
  entry_price DECIMAL(12,4),
  target_price DECIMAL(12,4),
  stop_loss DECIMAL(12,4),
  pnl_percent DECIMAL(10,4),
  idea_title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(idea_id, alert_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_idea_alerts_user ON idea_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_alerts_unread ON idea_alerts(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_idea_alerts_created ON idea_alerts(created_at DESC);

-- Add column to trading_ideas to track if alert was sent
ALTER TABLE trading_ideas ADD COLUMN IF NOT EXISTS alert_sent BOOLEAN DEFAULT false;
