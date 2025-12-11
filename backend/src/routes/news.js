import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { validateTicker } from '../models/index.js';
import newsAggregator from '../services/newsAggregator.js';
import articleExtractor from '../services/articleExtractor.js';

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
 * GET /api/news/article/url
 * Get extracted article by URL
 */
router.get('/article/url', async (req, res, next) => {
  try {
    const { url, ticker } = req.query;

    if (!url) {
      throw new ApiError(400, 'URL is required');
    }

    const article = await articleExtractor.extractArticle(url, { ticker });

    if (!article) {
      throw new ApiError(404, 'Could not extract article');
    }

    const related = article.id
      ? await articleExtractor.getRelatedArticles(article.id, 5)
      : [];

    res.json({
      success: true,
      data: {
        article,
        related,
        extractionStatus: article.extractionStatus
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/news/article/:id
 * Get extracted article by ID
 */
router.get('/article/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const articleId = parseInt(id);

    if (isNaN(articleId)) {
      throw new ApiError(400, 'Invalid article ID');
    }

    const article = await articleExtractor.getArticleById(articleId);

    if (!article) {
      throw new ApiError(404, 'Article not found');
    }

    const related = await articleExtractor.getRelatedArticles(articleId, 5);

    res.json({
      success: true,
      data: {
        article,
        related,
        extractionStatus: article.extractionStatus
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/news/article/:id/related
 * Get related articles only
 */
router.get('/article/:id/related', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;
    const articleId = parseInt(id);

    if (isNaN(articleId)) {
      throw new ApiError(400, 'Invalid article ID');
    }

    const related = await articleExtractor.getRelatedArticles(
      articleId,
      Math.min(parseInt(limit) || 5, 10)
    );

    res.json({
      success: true,
      data: related
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/news/extract
 * Extract article from news item (by news cache ID)
 */
router.post('/extract', async (req, res, next) => {
  try {
    const { newsId, url, ticker, title, content } = req.body;

    let article;

    if (newsId) {
      article = await articleExtractor.getArticleByNewsId(newsId);
    } else if (url) {
      article = await articleExtractor.extractArticle(url, {
        ticker,
        originalTitle: title,
        fallbackContent: content
      });
    } else {
      throw new ApiError(400, 'Either newsId or url is required');
    }

    if (!article) {
      throw new ApiError(404, 'Could not extract article');
    }

    const related = article.id
      ? await articleExtractor.getRelatedArticles(article.id, 5)
      : [];

    res.json({
      success: true,
      data: {
        article,
        related,
        extractionStatus: article.extractionStatus
      }
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
