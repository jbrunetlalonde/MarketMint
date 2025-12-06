import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { validateTicker, tradingIdeas } from '../models/index.js';
import { generatePDF } from '../services/pdfExport.js';

const router = Router();

const VALID_TIMEFRAMES = ['intraday', 'swing', 'position', 'long_term'];
const VALID_SENTIMENTS = ['bullish', 'bearish', 'neutral'];
const VALID_CLOSE_STATUSES = ['closed', 'stopped_out', 'target_hit'];

// Validate trading idea input
function validateIdeaInput(data, requireThesis = true) {
  const errors = [];

  if (data.ticker) {
    const tickerValidation = validateTicker(data.ticker);
    if (!tickerValidation.valid) {
      errors.push(tickerValidation.error);
    }
  }

  if (requireThesis && (!data.thesis || typeof data.thesis !== 'string' || data.thesis.trim().length === 0)) {
    errors.push('Thesis is required');
  }

  if (data.timeframe && !VALID_TIMEFRAMES.includes(data.timeframe)) {
    errors.push(`Timeframe must be one of: ${VALID_TIMEFRAMES.join(', ')}`);
  }

  if (data.sentiment && !VALID_SENTIMENTS.includes(data.sentiment)) {
    errors.push(`Sentiment must be one of: ${VALID_SENTIMENTS.join(', ')}`);
  }

  if (data.entryPrice !== undefined && data.entryPrice !== null) {
    const price = parseFloat(data.entryPrice);
    if (isNaN(price) || price < 0) {
      errors.push('Entry price must be a positive number');
    }
  }

  if (data.targetPrice !== undefined && data.targetPrice !== null) {
    const price = parseFloat(data.targetPrice);
    if (isNaN(price) || price < 0) {
      errors.push('Target price must be a positive number');
    }
  }

  if (data.stopLoss !== undefined && data.stopLoss !== null) {
    const price = parseFloat(data.stopLoss);
    if (isNaN(price) || price < 0) {
      errors.push('Stop loss must be a positive number');
    }
  }

  return errors;
}

/**
 * GET /api/ideas
 * Get user's trading ideas with optional status filter
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;

    if (status && !['open', 'closed', 'stopped_out', 'target_hit'].includes(status)) {
      throw new ApiError(400, 'Invalid status filter');
    }

    const ideas = await tradingIdeas.getByUserId(req.user.id, status || null);

    res.json({
      success: true,
      data: ideas
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ideas/stats
 * Get performance statistics
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await tradingIdeas.getStats(req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ideas/export
 * Export trading ideas as CSV
 */
router.get('/export', authenticate, async (req, res, next) => {
  try {
    const ideas = await tradingIdeas.getByUserId(req.user.id);

    // Generate CSV
    const headers = [
      'ID', 'Ticker', 'Title', 'Sentiment', 'Timeframe', 'Entry Price',
      'Target Price', 'Stop Loss', 'Status', 'Exit Price', 'Created', 'Closed', 'P&L %'
    ];

    const rows = ideas.map(idea => {
      const pnlPercent = idea.status !== 'open' && idea.entry_price && idea.actual_exit_price
        ? ((idea.actual_exit_price - idea.entry_price) / idea.entry_price * 100).toFixed(2)
        : '';

      return [
        idea.id,
        idea.ticker,
        idea.title || '',
        idea.sentiment,
        idea.timeframe,
        idea.entry_price || '',
        idea.target_price || '',
        idea.stop_loss || '',
        idea.status,
        idea.actual_exit_price || '',
        idea.created_at ? new Date(idea.created_at).toISOString().split('T')[0] : '',
        idea.closed_at ? new Date(idea.closed_at).toISOString().split('T')[0] : '',
        pnlPercent
      ];
    });

    const csv = [headers.join(','), ...rows.map(row => row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=trading-ideas.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ideas/export/pdf
 * Export trading ideas as PDF
 */
router.get('/export/pdf', authenticate, async (req, res, next) => {
  try {
    const [ideas, stats] = await Promise.all([
      tradingIdeas.getByUserId(req.user.id),
      tradingIdeas.getStats(req.user.id)
    ]);

    const pdf = await generatePDF(ideas, stats);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=trading-ideas.pdf');
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ideas/:id
 * Get single trading idea
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ApiError(400, 'Invalid idea ID');
    }

    const idea = await tradingIdeas.getById(parseInt(id), req.user.id);

    if (!idea) {
      throw new ApiError(404, 'Trading idea not found');
    }

    res.json({
      success: true,
      data: idea
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ideas
 * Create new trading idea
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { ticker, title, thesis, entryPrice, targetPrice, stopLoss, timeframe, sentiment } = req.body;

    if (!ticker) {
      throw new ApiError(400, 'Ticker is required');
    }

    const tickerValidation = validateTicker(ticker);
    if (!tickerValidation.valid) {
      throw new ApiError(400, tickerValidation.error);
    }

    const validationErrors = validateIdeaInput(req.body);
    if (validationErrors.length > 0) {
      throw new ApiError(400, validationErrors.join('; '));
    }

    const idea = await tradingIdeas.create(req.user.id, {
      ticker: tickerValidation.ticker,
      title: title?.trim() || null,
      thesis: thesis.trim(),
      entryPrice: entryPrice ? parseFloat(entryPrice) : null,
      targetPrice: targetPrice ? parseFloat(targetPrice) : null,
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      timeframe: timeframe || null,
      sentiment: sentiment || null
    });

    res.status(201).json({
      success: true,
      data: idea
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/ideas/:id
 * Update trading idea
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ApiError(400, 'Invalid idea ID');
    }

    const validationErrors = validateIdeaInput(req.body, false);
    if (validationErrors.length > 0) {
      throw new ApiError(400, validationErrors.join('; '));
    }

    const { title, thesis, entryPrice, targetPrice, stopLoss, timeframe, sentiment } = req.body;

    const idea = await tradingIdeas.update(parseInt(id), req.user.id, {
      title: title?.trim(),
      thesis: thesis?.trim(),
      entryPrice: entryPrice !== undefined ? (entryPrice ? parseFloat(entryPrice) : null) : undefined,
      targetPrice: targetPrice !== undefined ? (targetPrice ? parseFloat(targetPrice) : null) : undefined,
      stopLoss: stopLoss !== undefined ? (stopLoss ? parseFloat(stopLoss) : null) : undefined,
      timeframe,
      sentiment
    });

    if (!idea) {
      throw new ApiError(404, 'Trading idea not found or already closed');
    }

    res.json({
      success: true,
      data: idea
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ideas/:id/close
 * Close a trading idea with exit price
 */
router.post('/:id/close', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { exitPrice, status = 'closed' } = req.body;

    if (!id || isNaN(parseInt(id))) {
      throw new ApiError(400, 'Invalid idea ID');
    }

    if (exitPrice === undefined || exitPrice === null) {
      throw new ApiError(400, 'Exit price is required');
    }

    const price = parseFloat(exitPrice);
    if (isNaN(price) || price < 0) {
      throw new ApiError(400, 'Exit price must be a positive number');
    }

    if (!VALID_CLOSE_STATUSES.includes(status)) {
      throw new ApiError(400, `Status must be one of: ${VALID_CLOSE_STATUSES.join(', ')}`);
    }

    const idea = await tradingIdeas.close(parseInt(id), req.user.id, price, status);

    if (!idea) {
      throw new ApiError(404, 'Trading idea not found or already closed');
    }

    res.json({
      success: true,
      data: idea
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/ideas/:id
 * Delete a trading idea
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ApiError(400, 'Invalid idea ID');
    }

    const deleted = await tradingIdeas.delete(parseInt(id), req.user.id);

    if (!deleted) {
      throw new ApiError(404, 'Trading idea not found');
    }

    res.json({
      success: true,
      message: 'Trading idea deleted'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
