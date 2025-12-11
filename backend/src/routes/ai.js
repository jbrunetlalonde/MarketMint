import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import aiAnalysis from '../services/aiAnalysis.js';

const router = Router();

// AI-specific rate limiter: 10 requests per minute per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { message: 'AI rate limit exceeded. Please try again in a minute.' }
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.use(aiLimiter);

/**
 * POST /api/ai/summarize
 * Summarize article content (with caching by URL)
 */
router.post('/summarize', async (req, res) => {
  try {
    const { text, title, url } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'Article text is required' }
      });
    }

    if (!aiAnalysis.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI service is not available' }
      });
    }

    const result = await aiAnalysis.summarizeArticle(text, title, url);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Summarize error:', err);
    res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to summarize article' }
    });
  }
});

/**
 * GET /api/ai/status
 * Check if AI service is available
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      available: aiAnalysis.isConfigured()
    }
  });
});

export default router;
