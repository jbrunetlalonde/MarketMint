import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import { testConnection } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initializeWebSocket, getStats as getWsStats } from './services/websocket.js';
import logger, { requestLogger } from './config/logger.js';
import { initializeSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry.js';

// Routes
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import watchlistRoutes from './routes/watchlist.js';
import quotesRoutes from './routes/quotes.js';
import financialsRoutes from './routes/financials.js';
import newsRoutes from './routes/news.js';
import politicalRoutes from './routes/political.js';
import newsletterRoutes from './routes/newsletter.js';
import portraitsRoutes from './routes/portraits.js';
import chartsRoutes from './routes/charts.js';
import adminRoutes from './routes/admin.js';
import economicRoutes from './routes/economic.js';
import alertsRoutes from './routes/alerts.js';
import tradingIdeasRoutes from './routes/tradingIdeas.js';
import searchRoutes from './routes/search.js';
import portfolioRoutes from './routes/portfolio.js';
import insiderRoutes from './routes/insider.js';
import screenerRoutes from './routes/screener.js';
import { initializeScheduler } from './services/scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize Sentry (must be before other middleware)
initializeSentry(app);

// ============================================
// MIDDLEWARE
// ============================================

// Sentry request handler (must be first)
app.use(sentryRequestHandler());

// Security headers
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false
}));

// CORS - explicit origin whitelist for security
const allowedOrigins = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',  // Production/preview
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (config.nodeEnv === 'development') {
      // In development, log but allow unknown origins
      logger.warn('CORS: Allowing unknown origin in dev mode', { origin });
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: {
    success: false,
    error: { message: 'Too many requests, please try again later' }
  }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// ============================================
// ROUTES
// ============================================

// Health check (no /api prefix)
app.use('/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/financials', financialsRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/political', politicalRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/portraits', portraitsRoutes);
app.use('/api/charts', chartsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/economic', economicRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/ideas', tradingIdeasRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/insider', insiderRoutes);
app.use('/api/screener', screenerRoutes);

// Serve portraits with aggressive caching (1 year) - images are pre-generated and static
app.use('/portraits', express.static(path.join(__dirname, '../portraits'), {
  maxAge: '1y',
  immutable: true,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set cache headers for maximum performance
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Allow cross-origin requests for images (frontend on different port)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// ============================================
// WEBSOCKET
// ============================================

initializeWebSocket(wss);

// WebSocket stats endpoint
app.get('/api/ws/stats', (req, res) => {
  res.json({ success: true, data: getWsStats() });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFoundHandler);
app.use(sentryErrorHandler());
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    logger.warn('Database connection failed. Some features may not work.');
  }

  // Initialize scheduler for newsletter and data refresh jobs
  if (config.nodeEnv !== 'test') {
    initializeScheduler();
  }

  server.listen(config.port, () => {
    logger.info(`MarketMint API started`, {
      server: `http://localhost:${config.port}`,
      websocket: `ws://localhost:${config.port}/ws`,
      health: `http://localhost:${config.port}/health`,
      mode: config.nodeEnv,
      database: dbConnected ? 'Connected' : 'Disconnected'
    });

    // Keep nice startup banner for console in development
    if (config.nodeEnv === 'development') {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                     MARKETMINT API                         ║
╠════════════════════════════════════════════════════════════╣
║  Server:     http://localhost:${config.port}                       ║
║  WebSocket:  ws://localhost:${config.port}/ws                      ║
║  Health:     http://localhost:${config.port}/health                ║
║  Mode:       ${config.nodeEnv.padEnd(43)}║
║  Database:   ${(dbConnected ? 'Connected' : 'Disconnected').padEnd(43)}║
╚════════════════════════════════════════════════════════════╝
      `);
    }
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
