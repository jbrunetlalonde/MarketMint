import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { portfolioHoldings, validateTicker } from '../models/index.js';

const router = Router();

/**
 * GET /api/portfolio
 * Get user's portfolio holdings
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const holdings = await portfolioHoldings.getByUserId(req.user.id);
    res.json({
      success: true,
      data: holdings.map(h => ({
        id: h.id,
        ticker: h.ticker,
        shares: parseFloat(h.shares),
        costBasis: parseFloat(h.cost_basis),
        purchaseDate: h.purchase_date,
        notes: h.notes,
        createdAt: h.created_at,
        updatedAt: h.updated_at
      }))
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portfolio/summary
 * Get aggregated portfolio summary by ticker
 */
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const summary = await portfolioHoldings.getSummary(req.user.id);
    res.json({
      success: true,
      data: summary.map(s => ({
        ticker: s.ticker,
        totalShares: parseFloat(s.total_shares),
        avgCostBasis: s.avg_cost_basis ? parseFloat(s.avg_cost_basis) : null
      }))
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/portfolio
 * Add a new holding
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { ticker, shares, costBasis, purchaseDate, notes } = req.body;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    if (!shares || shares <= 0) {
      throw new ApiError(400, 'Shares must be a positive number');
    }

    if (!costBasis || costBasis <= 0) {
      throw new ApiError(400, 'Cost basis must be a positive number');
    }

    const holding = await portfolioHoldings.addHolding(
      req.user.id,
      validation.ticker,
      shares,
      costBasis,
      purchaseDate || null,
      notes || null
    );

    res.status(201).json({
      success: true,
      data: {
        id: holding.id,
        ticker: holding.ticker,
        shares: parseFloat(holding.shares),
        costBasis: parseFloat(holding.cost_basis),
        purchaseDate: holding.purchase_date,
        notes: holding.notes,
        createdAt: holding.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/portfolio/:id
 * Update a holding
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { shares, costBasis, purchaseDate, notes } = req.body;

    const updates = {};
    if (shares !== undefined) {
      if (shares <= 0) {
        throw new ApiError(400, 'Shares must be a positive number');
      }
      updates.shares = shares;
    }
    if (costBasis !== undefined) {
      if (costBasis <= 0) {
        throw new ApiError(400, 'Cost basis must be a positive number');
      }
      updates.costBasis = costBasis;
    }
    if (purchaseDate !== undefined) {
      updates.purchaseDate = purchaseDate;
    }
    if (notes !== undefined) {
      updates.notes = notes;
    }

    const holding = await portfolioHoldings.updateHolding(req.user.id, id, updates);

    if (!holding) {
      throw new ApiError(404, 'Holding not found');
    }

    res.json({
      success: true,
      data: {
        id: holding.id,
        ticker: holding.ticker,
        shares: parseFloat(holding.shares),
        costBasis: parseFloat(holding.cost_basis),
        purchaseDate: holding.purchase_date,
        notes: holding.notes,
        updatedAt: holding.updated_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/portfolio/:id
 * Remove a holding
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const removed = await portfolioHoldings.removeHolding(req.user.id, id);

    if (!removed) {
      throw new ApiError(404, 'Holding not found');
    }

    res.json({
      success: true,
      message: 'Holding removed'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
