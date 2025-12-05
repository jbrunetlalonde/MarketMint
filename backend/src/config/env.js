import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgres://marketmint:marketmint_dev@localhost:5432/marketmint',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: '24h',
  jwtRefreshExpiresIn: '7d',

  // External APIs
  yahooApiKey: process.env.YAHOO_API_KEY || '',
  fmpApiKey: process.env.FMP_API_KEY || '',
  serpApiKey: process.env.SERP_API_KEY || '',
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
  newsApiKey: process.env.NEWS_API_KEY || '',
  replicateApiToken: process.env.REPLICATE_API_TOKEN || '',

  // Rate Limiting
  rateLimitWindowMs: 60 * 1000, // 1 minute
  rateLimitMax: 100, // requests per window

  // Cache TTLs (in seconds)
  cacheTTL: {
    quote: 60,           // 1 minute
    priceHistory: 3600,  // 1 hour
    financials: 86400,   // 24 hours
    news: 1800,          // 30 minutes
    profile: 604800      // 7 days
  }
};

export default config;
