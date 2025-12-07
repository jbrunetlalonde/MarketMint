import { query } from '../config/database.js';
import { tradingIdeas } from './tradingIdeas.js';

// Ticker validation regex
const TICKER_REGEX = /^[A-Z]{1,5}$/;

export function validateTicker(ticker) {
  if (!ticker || typeof ticker !== 'string') {
    return { valid: false, error: 'Ticker is required' };
  }
  const normalized = ticker.toUpperCase().trim();
  if (!TICKER_REGEX.test(normalized)) {
    return { valid: false, error: 'Ticker must be 1-5 uppercase letters' };
  }
  return { valid: true, ticker: normalized };
}

// Watchlist queries
export const watchlists = {
  async getByUserId(userId) {
    const result = await query(
      `SELECT id, ticker, notes, added_at
       FROM watchlists
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async addTicker(userId, ticker, notes = null) {
    const result = await query(
      `INSERT INTO watchlists (user_id, ticker, notes)
       VALUES ($1, $2, $3)
       RETURNING id, ticker, notes, added_at`,
      [userId, ticker, notes]
    );
    return result.rows[0];
  },

  async removeTicker(userId, ticker) {
    const result = await query(
      `DELETE FROM watchlists
       WHERE user_id = $1 AND ticker = $2
       RETURNING id`,
      [userId, ticker]
    );
    return result.rowCount > 0;
  },

  async exists(userId, ticker) {
    const result = await query(
      `SELECT 1 FROM watchlists
       WHERE user_id = $1 AND ticker = $2
       LIMIT 1`,
      [userId, ticker]
    );
    return result.rows.length > 0;
  },

  async updateNotes(userId, ticker, notes) {
    const result = await query(
      `UPDATE watchlists
       SET notes = $3
       WHERE user_id = $1 AND ticker = $2
       RETURNING id, ticker, notes, added_at`,
      [userId, ticker, notes]
    );
    return result.rows[0] || null;
  }
};

// Quote cache queries
export const quotes = {
  async getCached(ticker) {
    const result = await query(
      `SELECT ticker, price, previous_close, change_amount, change_percent,
              day_high, day_low, volume, market_cap, pe_ratio, last_updated
       FROM quote_cache
       WHERE ticker = $1 AND (ttl_expires IS NULL OR ttl_expires > NOW())`,
      [ticker]
    );
    return result.rows[0] || null;
  },

  async getBulkCached(tickers) {
    const result = await query(
      `SELECT ticker, price, previous_close, change_amount, change_percent,
              day_high, day_low, volume, market_cap, pe_ratio, last_updated
       FROM quote_cache
       WHERE ticker = ANY($1) AND (ttl_expires IS NULL OR ttl_expires > NOW())`,
      [tickers]
    );
    return result.rows;
  },

  async upsertCache(ticker, data, ttlSeconds = 60) {
    const ttlExpires = new Date(Date.now() + ttlSeconds * 1000);
    const result = await query(
      `INSERT INTO quote_cache (ticker, price, previous_close, change_amount, change_percent,
                                day_high, day_low, volume, market_cap, pe_ratio, ttl_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (ticker)
       DO UPDATE SET
         price = EXCLUDED.price,
         previous_close = EXCLUDED.previous_close,
         change_amount = EXCLUDED.change_amount,
         change_percent = EXCLUDED.change_percent,
         day_high = EXCLUDED.day_high,
         day_low = EXCLUDED.day_low,
         volume = EXCLUDED.volume,
         market_cap = EXCLUDED.market_cap,
         pe_ratio = EXCLUDED.pe_ratio,
         last_updated = NOW(),
         ttl_expires = EXCLUDED.ttl_expires
       RETURNING *`,
      [ticker, data.price, data.previousClose, data.change, data.changePercent,
       data.dayHigh, data.dayLow, data.volume, data.marketCap, data.peRatio, ttlExpires]
    );
    return result.rows[0];
  }
};

// Newsletter queries
export const newsletter = {
  async getLatest() {
    const result = await query(
      `SELECT id, title, slug, category, content, summary, featured_ticker,
              image_url, published_at, created_at
       FROM newsletter_articles
       WHERE published_at IS NOT NULL AND published_at <= NOW()
       ORDER BY published_at DESC
       LIMIT 1`
    );
    return result.rows[0] || null;
  },

  async getArchive(limit = 20, offset = 0) {
    const result = await query(
      `SELECT id, title, slug, category, summary, featured_ticker,
              image_url, published_at
       FROM newsletter_articles
       WHERE published_at IS NOT NULL AND published_at <= NOW()
       ORDER BY published_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }
};

// Political trades queries
export const politicalTrades = {
  async getRecent(limit = 50) {
    const result = await query(
      `SELECT pt.id, pt.official_name, pt.ticker, pt.asset_description,
              pt.transaction_type, pt.transaction_date, pt.reported_date,
              pt.amount_display, po.party, po.title, po.state, po.ai_portrait_url
       FROM political_trades pt
       LEFT JOIN political_officials po ON pt.official_id = po.id
       ORDER BY pt.reported_date DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async getByTicker(ticker, limit = 20) {
    const result = await query(
      `SELECT pt.id, pt.official_name, pt.ticker, pt.asset_description,
              pt.transaction_type, pt.transaction_date, pt.reported_date,
              pt.amount_display, po.party, po.title, po.state
       FROM political_trades pt
       LEFT JOIN political_officials po ON pt.official_id = po.id
       WHERE pt.ticker = $1
       ORDER BY pt.reported_date DESC
       LIMIT $2`,
      [ticker, limit]
    );
    return result.rows;
  }
};

// Financials queries
export const financials = {
  async getByTicker(ticker) {
    const result = await query(
      `SELECT * FROM financials
       WHERE ticker = $1
       ORDER BY period_end_date DESC
       LIMIT 4`,
      [ticker]
    );
    return result.rows;
  },

  async getProfile(ticker) {
    const result = await query(
      `SELECT * FROM company_profiles
       WHERE ticker = $1`,
      [ticker]
    );
    return result.rows[0] || null;
  }
};

// News cache queries
export const news = {
  async getRecent(limit = 20, category = null) {
    if (category) {
      const result = await query(
        `SELECT id, source, title, description, url, image_url, published_at, tickers, sentiment
         FROM news_cache
         WHERE $1 = ANY(tickers) OR sentiment = $1
         ORDER BY published_at DESC
         LIMIT $2`,
        [category, limit]
      );
      return result.rows;
    }
    const result = await query(
      `SELECT id, source, title, description, url, image_url, published_at, tickers, sentiment
       FROM news_cache
       ORDER BY published_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
};

// Portfolio Holdings queries
export const portfolioHoldings = {
  async getByUserId(userId) {
    const result = await query(
      `SELECT id, ticker, shares, cost_basis, purchase_date, notes, created_at, updated_at
       FROM portfolio_holdings
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async addHolding(userId, ticker, shares, costBasis, purchaseDate = null, notes = null) {
    const result = await query(
      `INSERT INTO portfolio_holdings (user_id, ticker, shares, cost_basis, purchase_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, ticker, shares, cost_basis, purchase_date, notes, created_at`,
      [userId, ticker, shares, costBasis, purchaseDate, notes]
    );
    return result.rows[0];
  },

  async updateHolding(userId, holdingId, updates) {
    const setClauses = [];
    const params = [userId, holdingId];
    let paramIndex = 3;

    if (updates.shares !== undefined) {
      setClauses.push(`shares = $${paramIndex++}`);
      params.push(updates.shares);
    }
    if (updates.costBasis !== undefined) {
      setClauses.push(`cost_basis = $${paramIndex++}`);
      params.push(updates.costBasis);
    }
    if (updates.purchaseDate !== undefined) {
      setClauses.push(`purchase_date = $${paramIndex++}`);
      params.push(updates.purchaseDate);
    }
    if (updates.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      params.push(updates.notes);
    }

    if (setClauses.length === 0) return null;

    const result = await query(
      `UPDATE portfolio_holdings
       SET ${setClauses.join(', ')}
       WHERE user_id = $1 AND id = $2
       RETURNING id, ticker, shares, cost_basis, purchase_date, notes, updated_at`,
      params
    );
    return result.rows[0] || null;
  },

  async removeHolding(userId, holdingId) {
    const result = await query(
      `DELETE FROM portfolio_holdings
       WHERE user_id = $1 AND id = $2
       RETURNING id`,
      [userId, holdingId]
    );
    return result.rowCount > 0;
  },

  async getHoldingById(userId, holdingId) {
    const result = await query(
      `SELECT id, ticker, shares, cost_basis, purchase_date, notes, created_at, updated_at
       FROM portfolio_holdings
       WHERE user_id = $1 AND id = $2`,
      [userId, holdingId]
    );
    return result.rows[0] || null;
  },

  async getSummary(userId) {
    const result = await query(
      `SELECT ticker, SUM(shares) as total_shares,
              SUM(shares * cost_basis) / NULLIF(SUM(shares), 0) as avg_cost_basis
       FROM portfolio_holdings
       WHERE user_id = $1
       GROUP BY ticker
       ORDER BY ticker`,
      [userId]
    );
    return result.rows;
  }
};

// Portrait queries
export const portraits = {
  async getCeoByName(name) {
    const result = await query(
      `SELECT id, name, company, title, ai_portrait_url, created_at
       FROM ceo_profiles
       WHERE LOWER(name) = LOWER($1)
       LIMIT 1`,
      [name]
    );
    return result.rows[0] || null;
  },

  async getAllCeos() {
    const result = await query(
      `SELECT id, name, company, title, ai_portrait_url
       FROM ceo_profiles
       ORDER BY name ASC`
    );
    return result.rows;
  },

  async updateCeoPortrait(name, portraitUrl) {
    const result = await query(
      `UPDATE ceo_profiles
       SET ai_portrait_url = $2, updated_at = NOW()
       WHERE LOWER(name) = LOWER($1)
       RETURNING *`,
      [name, portraitUrl]
    );
    return result.rows[0] || null;
  },

  async upsertCeo(name, company, title = 'CEO') {
    const result = await query(
      `INSERT INTO ceo_profiles (name, company, title)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET
         company = EXCLUDED.company,
         title = EXCLUDED.title,
         updated_at = NOW()
       RETURNING *`,
      [name, company, title]
    );
    return result.rows[0];
  },

  async getOfficialByName(name) {
    const result = await query(
      `SELECT id, name, title, state, party, ai_portrait_url
       FROM political_officials
       WHERE LOWER(name) = LOWER($1)
       LIMIT 1`,
      [name]
    );
    return result.rows[0] || null;
  },

  async getAllOfficials() {
    const result = await query(
      `SELECT id, name, title, state, party, ai_portrait_url
       FROM political_officials
       ORDER BY name ASC`
    );
    return result.rows;
  },

  async updateOfficialPortrait(name, portraitUrl) {
    const result = await query(
      `UPDATE political_officials
       SET ai_portrait_url = $2
       WHERE LOWER(name) = LOWER($1)
       RETURNING *`,
      [name, portraitUrl]
    );
    return result.rows[0] || null;
  },

  async upsertOfficial(name, title, state, party) {
    const result = await query(
      `INSERT INTO political_officials (name, title, state, party)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET
         title = EXCLUDED.title,
         state = EXCLUDED.state,
         party = EXCLUDED.party
       RETURNING *`,
      [name, title, state, party]
    );
    return result.rows[0];
  }
};

export default {
  validateTicker,
  watchlists,
  quotes,
  newsletter,
  politicalTrades,
  financials,
  news,
  portraits,
  tradingIdeas,
  portfolioHoldings
};

export { tradingIdeas };
