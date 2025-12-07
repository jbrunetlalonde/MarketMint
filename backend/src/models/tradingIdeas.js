import { query } from '../config/database.js';

// Trading Ideas model
export const tradingIdeas = {
  // Get all ideas for a user with optional status filter
  async getByUserId(userId, status = null) {
    if (status) {
      const result = await query(
        `SELECT id, user_id, ticker, title, thesis, entry_price, target_price,
                stop_loss, timeframe, sentiment, status, actual_exit_price,
                closed_at, created_at, updated_at
         FROM trading_ideas
         WHERE user_id = $1 AND status = $2
         ORDER BY created_at DESC`,
        [userId, status]
      );
      return result.rows;
    }
    const result = await query(
      `SELECT id, user_id, ticker, title, thesis, entry_price, target_price,
              stop_loss, timeframe, sentiment, status, actual_exit_price,
              closed_at, created_at, updated_at
       FROM trading_ideas
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Get single idea by ID with ownership check
  async getById(ideaId, userId) {
    const result = await query(
      `SELECT id, user_id, ticker, title, thesis, entry_price, target_price,
              stop_loss, timeframe, sentiment, status, actual_exit_price,
              closed_at, created_at, updated_at
       FROM trading_ideas
       WHERE id = $1 AND user_id = $2`,
      [ideaId, userId]
    );
    return result.rows[0] || null;
  },

  // Create new trading idea
  async create(userId, data) {
    const { ticker, title, thesis, entryPrice, targetPrice, stopLoss, timeframe, sentiment } = data;
    const result = await query(
      `INSERT INTO trading_ideas
         (user_id, ticker, title, thesis, entry_price, target_price, stop_loss, timeframe, sentiment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, ticker, title, thesis, entry_price, target_price,
                 stop_loss, timeframe, sentiment, status, actual_exit_price,
                 closed_at, created_at, updated_at`,
      [userId, ticker.toUpperCase(), title, thesis, entryPrice, targetPrice, stopLoss, timeframe, sentiment]
    );
    return result.rows[0];
  },

  // Update trading idea
  async update(ideaId, userId, data) {
    const { title, thesis, entryPrice, targetPrice, stopLoss, timeframe, sentiment } = data;
    const result = await query(
      `UPDATE trading_ideas
       SET title = COALESCE($3, title),
           thesis = COALESCE($4, thesis),
           entry_price = COALESCE($5, entry_price),
           target_price = COALESCE($6, target_price),
           stop_loss = COALESCE($7, stop_loss),
           timeframe = COALESCE($8, timeframe),
           sentiment = COALESCE($9, sentiment),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'open'
       RETURNING id, user_id, ticker, title, thesis, entry_price, target_price,
                 stop_loss, timeframe, sentiment, status, actual_exit_price,
                 closed_at, created_at, updated_at`,
      [ideaId, userId, title, thesis, entryPrice, targetPrice, stopLoss, timeframe, sentiment]
    );
    return result.rows[0] || null;
  },

  // Close position with exit price and status
  async close(ideaId, userId, exitPrice, status = 'closed') {
    const validStatuses = ['closed', 'stopped_out', 'target_hit'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid close status: ${status}`);
    }
    const result = await query(
      `UPDATE trading_ideas
       SET status = $3,
           actual_exit_price = $4,
           closed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'open'
       RETURNING id, user_id, ticker, title, thesis, entry_price, target_price,
                 stop_loss, timeframe, sentiment, status, actual_exit_price,
                 closed_at, created_at, updated_at`,
      [ideaId, userId, status, exitPrice]
    );
    return result.rows[0] || null;
  },

  // Delete trading idea
  async delete(ideaId, userId) {
    const result = await query(
      `DELETE FROM trading_ideas
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [ideaId, userId]
    );
    return result.rowCount > 0;
  },

  // Get ideas for a specific ticker
  async getByTicker(userId, ticker) {
    const result = await query(
      `SELECT id, user_id, ticker, title, thesis, entry_price, target_price,
              stop_loss, timeframe, sentiment, status, actual_exit_price,
              closed_at, created_at, updated_at
       FROM trading_ideas
       WHERE user_id = $1 AND ticker = $2
       ORDER BY created_at DESC`,
      [userId, ticker.toUpperCase()]
    );
    return result.rows;
  },

  // Get performance statistics
  async getStats(userId) {
    const result = await query(
      `SELECT
         COUNT(*) as total_ideas,
         COUNT(*) FILTER (WHERE status = 'open') as open_ideas,
         COUNT(*) FILTER (WHERE status != 'open') as closed_ideas,
         COUNT(*) FILTER (WHERE status = 'target_hit') as target_hit_count,
         COUNT(*) FILTER (WHERE status = 'stopped_out') as stopped_out_count,
         AVG(
           CASE
             WHEN status != 'open' AND entry_price > 0 AND actual_exit_price IS NOT NULL
             THEN ((actual_exit_price - entry_price) / entry_price * 100)
             ELSE NULL
           END
         ) as avg_pnl_percent
       FROM trading_ideas
       WHERE user_id = $1`,
      [userId]
    );

    const stats = result.rows[0];
    const closedIdeas = parseInt(stats.closed_ideas) || 0;
    const targetHits = parseInt(stats.target_hit_count) || 0;

    return {
      totalIdeas: parseInt(stats.total_ideas) || 0,
      openIdeas: parseInt(stats.open_ideas) || 0,
      closedIdeas,
      targetHitCount: targetHits,
      stoppedOutCount: parseInt(stats.stopped_out_count) || 0,
      winRate: closedIdeas > 0 ? (targetHits / closedIdeas * 100).toFixed(1) : 0,
      avgPnlPercent: stats.avg_pnl_percent ? parseFloat(stats.avg_pnl_percent).toFixed(2) : 0
    };
  },

  // Get all open ideas for price alert checking (no user filter - system check)
  async getOpenIdeasForAlertCheck() {
    const result = await query(
      `SELECT ti.id, ti.user_id, ti.ticker, ti.entry_price, ti.target_price,
              ti.stop_loss, ti.sentiment, ti.title
       FROM trading_ideas ti
       WHERE ti.status = 'open'
         AND ti.entry_price IS NOT NULL
         AND (ti.target_price IS NOT NULL OR ti.stop_loss IS NOT NULL)`
    );
    return result.rows;
  },

  // Check if idea exists
  async exists(ideaId, userId) {
    const result = await query(
      `SELECT 1 FROM trading_ideas
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [ideaId, userId]
    );
    return result.rows.length > 0;
  }
};

export default tradingIdeas;
