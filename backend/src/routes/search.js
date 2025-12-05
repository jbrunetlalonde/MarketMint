import { Router } from 'express';
import { searchSymbols } from '../services/financialModelPrep.js';

const router = Router();

/**
 * GET /api/search/symbols
 * Search for stock symbols with autocomplete
 */
router.get('/symbols', async (req, res, next) => {
  try {
    const { q, limit = 8 } = req.query;

    if (!q || q.length < 1) {
      return res.json({
        success: true,
        data: []
      });
    }

    const results = await searchSymbols(q, Math.min(parseInt(limit) || 8, 20));

    res.json({
      success: true,
      data: results
    });
  } catch (err) {
    next(err);
  }
});

export default router;
