import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import http from 'http';

import { config } from './config/env.js';
import { testConnection } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false
}));

// CORS
app.use(cors({
  origin: config.nodeEnv === 'production'
    ? ['http://localhost:3000']
    : true,
  credentials: true
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

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// ROUTES
// ============================================

// Health check (no /api prefix)
app.use('/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);

// Placeholder routes for future implementation
app.get('/api/quotes/:ticker', (req, res) => {
  res.json({ success: true, message: 'Quote endpoint - coming soon', ticker: req.params.ticker });
});

app.get('/api/financials/:ticker', (req, res) => {
  res.json({ success: true, message: 'Financials endpoint - coming soon', ticker: req.params.ticker });
});

app.get('/api/news', (req, res) => {
  res.json({ success: true, message: 'News endpoint - coming soon' });
});

app.get('/api/political/trades', (req, res) => {
  res.json({ success: true, message: 'Political trades endpoint - coming soon' });
});

// ============================================
// WEBSOCKET
// ============================================

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket message:', data);

      // Handle subscription requests
      if (data.type === 'subscribe' && data.ticker) {
        ws.send(JSON.stringify({
          type: 'subscribed',
          ticker: data.ticker,
          message: 'Subscribed to ticker updates'
        }));
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to MarketMint WebSocket'
  }));
});

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.warn('Warning: Database connection failed. Some features may not work.');
  }

  server.listen(config.port, () => {
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
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
