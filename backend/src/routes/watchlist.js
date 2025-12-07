import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { watchlists, validateTicker } from '../models/index.js';

const router = Router();

/**
 * GET /api/watchlist
 * Get user's watchlist
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const items = await watchlists.getByUserId(req.user.id);
    res.json({
      success: true,
      data: items
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/watchlist/add
 * Add ticker to watchlist
 */
router.post('/add', authenticate, async (req, res, next) => {
  try {
    const { ticker, notes } = req.body;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const exists = await watchlists.exists(req.user.id, validation.ticker);
    if (exists) {
      throw new ApiError(409, 'Ticker already in watchlist');
    }

    const item = await watchlists.addTicker(req.user.id, validation.ticker, notes || null);

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/watchlist/:ticker
 * Update notes for a ticker in watchlist
 */
router.put('/:ticker', authenticate, async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { notes } = req.body;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const item = await watchlists.updateNotes(req.user.id, validation.ticker, notes || null);

    if (!item) {
      throw new ApiError(404, 'Ticker not found in watchlist');
    }

    res.json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/watchlist/:ticker
 * Remove ticker from watchlist
 */
router.delete('/:ticker', authenticate, async (req, res, next) => {
  try {
    const { ticker } = req.params;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const removed = await watchlists.removeTicker(req.user.id, validation.ticker);

    if (!removed) {
      throw new ApiError(404, 'Ticker not found in watchlist');
    }

    res.json({
      success: true,
      message: 'Ticker removed from watchlist'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
