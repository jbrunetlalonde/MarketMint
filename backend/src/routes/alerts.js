import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import alerts from '../services/alerts.js';

const router = Router();

/**
 * GET /api/alerts
 * Get user's trade alerts
 * Query params: unreadOnly (boolean), limit (number)
 */
router.get('/', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { unreadOnly, limit = 50 } = req.query;

    const userAlerts = await alerts.getUserAlerts(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: parseInt(limit)
    });

    const unreadCount = await alerts.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: {
        alerts: userAlerts,
        unreadCount
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/alerts/count
 * Get unread alerts count
 */
router.get('/count', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const count = await alerts.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: { count }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/alerts/:id/read
 * Mark a single alert as read
 */
router.post('/:id/read', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { id } = req.params;
    const success = await alerts.markAlertRead(id, req.user.id);

    if (!success) {
      throw new ApiError(404, 'Alert not found or already read');
    }

    res.json({
      success: true,
      message: 'Alert marked as read'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/alerts/read-all
 * Mark all alerts as read
 */
router.post('/read-all', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const count = await alerts.markAllRead(req.user.id);

    res.json({
      success: true,
      message: `Marked ${count} alerts as read`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/alerts/ideas
 * Get user's trading idea alerts
 */
router.get('/ideas', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { unreadOnly, limit = 50 } = req.query;

    const ideaAlerts = await alerts.getIdeaAlerts(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: parseInt(limit)
    });

    const unreadCount = await alerts.getUnreadIdeaAlertCount(req.user.id);

    res.json({
      success: true,
      data: {
        alerts: ideaAlerts,
        unreadCount
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/alerts/ideas/count
 * Get unread idea alerts count
 */
router.get('/ideas/count', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const count = await alerts.getUnreadIdeaAlertCount(req.user.id);

    res.json({
      success: true,
      data: { count }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/alerts/ideas/:id/read
 * Mark an idea alert as read
 */
router.post('/ideas/:id/read', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { id } = req.params;
    const success = await alerts.markIdeaAlertRead(id, req.user.id);

    if (!success) {
      throw new ApiError(404, 'Idea alert not found or already read');
    }

    res.json({
      success: true,
      message: 'Idea alert marked as read'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
