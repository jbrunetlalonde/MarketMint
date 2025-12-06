import { Router } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import emailService from '../services/emailService.js';
import newsletterGenerator from '../services/newsletterGenerator.js';
import scheduler from '../services/scheduler.js';

const router = Router();

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/newsletter/subscribe
 * Subscribe to the newsletter
 */
router.post('/subscribe', async (req, res, next) => {
  try {
    const { email, name } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      throw new ApiError(400, 'Valid email address is required');
    }

    const result = await emailService.addSubscriber(email, name);

    if (!result.success) {
      throw new ApiError(400, result.error);
    }

    res.json({
      success: true,
      message: 'Successfully subscribed to the newsletter'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/newsletter/unsubscribe
 * Unsubscribe from the newsletter
 */
router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ApiError(400, 'Unsubscribe token is required');
    }

    const result = await emailService.removeSubscriber(token);

    if (!result.success) {
      throw new ApiError(400, result.error);
    }

    res.json({
      success: true,
      message: 'Successfully unsubscribed from the newsletter'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/newsletter/unsubscribe/:token
 * Unsubscribe via GET request (for email links)
 */
router.get('/unsubscribe/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await emailService.removeSubscriber(token);

    if (!result.success) {
      throw new ApiError(400, result.error);
    }

    res.json({
      success: true,
      message: 'Successfully unsubscribed from the newsletter'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/newsletter/preview
 * Preview today's newsletter (admin only)
 */
router.get('/preview', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const newsletter = await newsletterGenerator.previewNewsletter();

    res.json({
      success: true,
      data: newsletter
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/newsletter/send
 * Manually trigger newsletter send (admin only)
 */
router.post('/send', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await scheduler.runNewsletterJob();

    if (!result.success) {
      throw new ApiError(500, result.error || result.reason);
    }

    res.json({
      success: true,
      message: `Newsletter sent to ${result.sent} subscribers`,
      data: {
        sent: result.sent,
        failed: result.failed,
        duration: result.duration
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/newsletter/history
 * Get newsletter send history (admin only)
 */
router.get('/history', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const history = await emailService.getSendHistory(Math.min(parseInt(limit) || 20, 100));

    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/newsletter/subscribers
 * Get subscriber list (admin only)
 */
router.get('/subscribers', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const subscribers = await emailService.getSubscribers(
      Math.min(parseInt(limit) || 100, 500),
      parseInt(offset) || 0
    );
    const count = await emailService.getSubscriberCount();

    res.json({
      success: true,
      data: {
        subscribers,
        total: count
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/newsletter/status
 * Get newsletter system status (admin only)
 */
router.get('/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [emailStatus, subscriberCount, schedulerStatus] = await Promise.all([
      emailService.verifyConnection(),
      emailService.getSubscriberCount(),
      scheduler.getSchedulerStatus()
    ]);

    res.json({
      success: true,
      data: {
        email: emailStatus,
        subscribers: subscriberCount,
        scheduler: schedulerStatus
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
