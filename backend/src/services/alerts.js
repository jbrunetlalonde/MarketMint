import { query } from '../config/database.js';

/**
 * Get unread alerts count for a user
 */
export async function getUnreadCount(userId) {
  const result = await query(
    `SELECT COUNT(*) as count
     FROM trade_alerts
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return parseInt(result.rows[0]?.count || 0);
}

/**
 * Get alerts for a user
 */
export async function getUserAlerts(userId, options = {}) {
  const { limit = 50, unreadOnly = false } = options;

  let whereConditions = ['ta.user_id = $1'];
  const params = [userId];

  if (unreadOnly) {
    whereConditions.push('ta.read_at IS NULL');
  }

  params.push(limit);

  const result = await query(
    `SELECT
       ta.id,
       ta.ticker,
       ta.official_name,
       ta.transaction_type,
       ta.amount_display,
       ta.created_at,
       ta.read_at,
       pt.asset_description,
       pt.transaction_date,
       pt.reported_date,
       po.party,
       po.title,
       po.state,
       po.ai_portrait_url
     FROM trade_alerts ta
     LEFT JOIN political_trades pt ON ta.trade_id = pt.id
     LEFT JOIN political_officials po ON ta.official_name = po.name
     WHERE ${whereConditions.join(' AND ')}
     ORDER BY ta.created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return result.rows.map(row => ({
    id: row.id,
    ticker: row.ticker,
    officialName: row.official_name,
    transactionType: row.transaction_type,
    amountDisplay: row.amount_display,
    createdAt: row.created_at,
    readAt: row.read_at,
    assetDescription: row.asset_description,
    transactionDate: row.transaction_date,
    reportedDate: row.reported_date,
    party: row.party,
    title: row.title,
    state: row.state,
    portraitUrl: row.ai_portrait_url
  }));
}

/**
 * Mark an alert as read
 */
export async function markAlertRead(alertId, userId) {
  const result = await query(
    `UPDATE trade_alerts
     SET read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL
     RETURNING id`,
    [alertId, userId]
  );
  return result.rowCount > 0;
}

/**
 * Mark all alerts as read for a user
 */
export async function markAllRead(userId) {
  const result = await query(
    `UPDATE trade_alerts
     SET read_at = NOW()
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return result.rowCount;
}

/**
 * Create alerts for all users who have a ticker in their watchlist
 */
export async function createAlertsForTrade(trade) {
  // Find all users who have this ticker in their watchlist
  const usersResult = await query(
    `SELECT DISTINCT user_id
     FROM watchlists
     WHERE ticker = $1`,
    [trade.ticker]
  );

  if (usersResult.rows.length === 0) {
    return 0;
  }

  let created = 0;

  for (const { user_id } of usersResult.rows) {
    try {
      await query(
        `INSERT INTO trade_alerts
           (user_id, trade_id, ticker, official_name, transaction_type, amount_display)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          user_id,
          trade.id,
          trade.ticker,
          trade.officialName,
          trade.transactionType,
          trade.amountDisplay
        ]
      );
      created++;
    } catch (err) {
      console.error(`Failed to create alert for user ${user_id}:`, err.message);
    }
  }

  return created;
}

/**
 * Process new trades and create alerts
 * Called by the political tracker when new trades are fetched
 */
export async function processNewTrades(trades) {
  let totalCreated = 0;

  for (const trade of trades) {
    if (trade.id) {
      const created = await createAlertsForTrade(trade);
      totalCreated += created;
    }
  }

  return totalCreated;
}

/**
 * Delete old read alerts (cleanup)
 */
export async function cleanupOldAlerts(daysOld = 30) {
  const result = await query(
    `DELETE FROM trade_alerts
     WHERE read_at IS NOT NULL
     AND read_at < NOW() - INTERVAL '${daysOld} days'`
  );
  return result.rowCount;
}

/**
 * Create an alert for a trading idea (target hit or stopped out)
 */
export async function createIdeaAlert(idea, alertType, triggerPrice) {
  const pnlPercent = idea.entry_price
    ? ((triggerPrice - idea.entry_price) / idea.entry_price) * 100
    : null;

  try {
    await query(
      `INSERT INTO idea_alerts
         (user_id, idea_id, ticker, alert_type, trigger_price, entry_price,
          target_price, stop_loss, pnl_percent, idea_title)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (idea_id, alert_type) DO NOTHING`,
      [
        idea.user_id,
        idea.id,
        idea.ticker,
        alertType,
        triggerPrice,
        idea.entry_price,
        idea.target_price,
        idea.stop_loss,
        pnlPercent,
        idea.title
      ]
    );

    // Mark the idea as alert sent
    await query(
      `UPDATE trading_ideas SET alert_sent = true WHERE id = $1`,
      [idea.id]
    );

    return true;
  } catch (err) {
    console.error(`Failed to create idea alert for idea ${idea.id}:`, err.message);
    return false;
  }
}

/**
 * Get idea alerts for a user
 */
export async function getIdeaAlerts(userId, options = {}) {
  const { limit = 50, unreadOnly = false } = options;

  let whereConditions = ['user_id = $1'];
  const params = [userId];

  if (unreadOnly) {
    whereConditions.push('read_at IS NULL');
  }

  params.push(limit);

  const result = await query(
    `SELECT id, idea_id, ticker, alert_type, trigger_price, entry_price,
            target_price, stop_loss, pnl_percent, idea_title, created_at, read_at
     FROM idea_alerts
     WHERE ${whereConditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return result.rows.map(row => ({
    id: row.id,
    ideaId: row.idea_id,
    ticker: row.ticker,
    alertType: row.alert_type,
    triggerPrice: row.trigger_price,
    entryPrice: row.entry_price,
    targetPrice: row.target_price,
    stopLoss: row.stop_loss,
    pnlPercent: row.pnl_percent,
    ideaTitle: row.idea_title,
    createdAt: row.created_at,
    readAt: row.read_at
  }));
}

/**
 * Mark an idea alert as read
 */
export async function markIdeaAlertRead(alertId, userId) {
  const result = await query(
    `UPDATE idea_alerts
     SET read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL
     RETURNING id`,
    [alertId, userId]
  );
  return result.rowCount > 0;
}

/**
 * Get unread idea alerts count for a user
 */
export async function getUnreadIdeaAlertCount(userId) {
  const result = await query(
    `SELECT COUNT(*) as count
     FROM idea_alerts
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return parseInt(result.rows[0]?.count || 0);
}

export default {
  getUnreadCount,
  getUserAlerts,
  markAlertRead,
  markAllRead,
  createAlertsForTrade,
  processNewTrades,
  cleanupOldAlerts,
  createIdeaAlert,
  getIdeaAlerts,
  markIdeaAlertRead,
  getUnreadIdeaAlertCount
};
