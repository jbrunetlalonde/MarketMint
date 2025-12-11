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

// Apply AI rate limiter to all AI endpoints
router.use(aiLimiter);

/**
 * GET /analysis/:ticker/swot
 * Get SWOT analysis for a stock
 */
router.get('/:ticker/swot', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    if (!ticker || !/^[A-Za-z]{1,5}$/.test(ticker)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid ticker symbol' }
      });
    }

    if (!aiAnalysis.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI analysis is not available' }
      });
    }

    const swot = await aiAnalysis.generateSWOT(ticker);

    res.json({
      success: true,
      data: swot
    });
  } catch (err) {
    console.error('SWOT analysis error:', err);
    res.status(err.message.includes('Could not find') ? 404 : 500).json({
      success: false,
      error: { message: err.message || 'Failed to generate SWOT analysis' }
    });
  }
});

/**
 * POST /analysis/:ticker/swot/refresh
 * Force refresh SWOT analysis
 */
router.post('/:ticker/swot/refresh', async (req, res, next) => {
  try {
    const { ticker } = req.params;

    if (!ticker || !/^[A-Za-z]{1,5}$/.test(ticker)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid ticker symbol' }
      });
    }

    if (!aiAnalysis.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI analysis is not available' }
      });
    }

    const swot = await aiAnalysis.generateSWOT(ticker, true);

    res.json({
      success: true,
      data: swot
    });
  } catch (err) {
    console.error('SWOT refresh error:', err);
    res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to refresh SWOT analysis' }
    });
  }
});

/**
 * POST /analysis/explain
 * Explain a financial metric
 */
router.post('/explain', async (req, res, next) => {
  try {
    const { metric, value, ticker, industry } = req.body;

    if (!metric || value === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'metric and value are required' }
      });
    }

    if (!aiAnalysis.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI analysis is not available' }
      });
    }

    const explanation = await aiAnalysis.explainMetric(metric, value, { ticker, industry });

    res.json({
      success: true,
      data: explanation
    });
  } catch (err) {
    console.error('Explain metric error:', err);
    res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to explain metric' }
    });
  }
});

/**
 * POST /analysis/:ticker/explain-section
 * Get AI explanation for a financial section
 */
router.post('/:ticker/explain-section', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { sectionType, data } = req.body;

    if (!ticker || !/^[A-Za-z]{1,5}$/.test(ticker)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid ticker symbol' }
      });
    }

    const validSections = ['cashflow', 'income', 'balance', 'grades', 'ratings', 'insider', 'congress'];
    if (!sectionType || !validSections.includes(sectionType)) {
      return res.status(400).json({
        success: false,
        error: { message: `Invalid section type. Must be one of: ${validSections.join(', ')}` }
      });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: { message: 'Data object is required' }
      });
    }

    if (!aiAnalysis.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI analysis is not available' }
      });
    }

    const explanation = await aiAnalysis.explainSection(ticker, sectionType, data);

    res.json({
      success: true,
      data: explanation
    });
  } catch (err) {
    console.error('Explain section error:', err);
    res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to generate explanation' }
    });
  }
});

/**
 * GET /analysis/status
 * Check if AI analysis is available
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
