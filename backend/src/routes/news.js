import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { validateTicker } from '../models/index.js';
import newsAggregator from '../services/newsAggregator.js';

const router = Router();

/**
 * GET /api/news
 * Get latest market news
 */
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const news = await newsAggregator.getLatestNews(Math.min(parseInt(limit) || 20, 50));

    res.json({
      success: true,
      data: news
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/news/trending
 * Get trending/top news stories
 */
router.get('/trending', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const news = await newsAggregator.getTrendingNews(Math.min(parseInt(limit) || 10, 20));

    res.json({
      success: true,
      data: news
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/news/summary
 * Get market news summary for dashboard/newsletter
 */
router.get('/summary', async (req, res, next) => {
  try {
    const summary = await newsAggregator.getMarketSummary();

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/news/:ticker
 * Get news for specific ticker
 */
router.get('/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { limit = 10 } = req.query;

    const validation = validateTicker(ticker);
    if (!validation.valid) {
      throw new ApiError(400, validation.error);
    }

    const news = await newsAggregator.getTickerNews(
      validation.ticker,
      Math.min(parseInt(limit) || 10, 30)
    );

    res.json({
      success: true,
      data: news
    });
  } catch (err) {
    next(err);
  }
});

export default router;
