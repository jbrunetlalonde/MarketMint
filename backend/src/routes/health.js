import { Router } from 'express';
import { testConnection } from '../config/database.js';

const router = Router();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  const dbHealthy = await testConnection();

  const status = dbHealthy ? 'healthy' : 'degraded';
  const statusCode = dbHealthy ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'connected' : 'disconnected'
    }
  });
});

export default router;
