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
  fredApiKey: process.env.FRED_API_KEY || '',
  finnhubApiKey: process.env.FINNHUB_API_KEY || '',

  // Monitoring
  sentryDsn: process.env.SENTRY_DSN || '',

  // Email Configuration
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  newsletterFromEmail: process.env.NEWSLETTER_FROM_EMAIL || 'newsletter@marketmint.com',
  newsletterFromName: process.env.NEWSLETTER_FROM_NAME || 'MarketMint Daily',

  // Rate Limiting
  rateLimitWindowMs: 60 * 1000, // 1 minute
  rateLimitMax: 100, // requests per window

  // Cache TTLs (in seconds)
  cacheTTL: {
    quote: 60,              // 1 minute (real-time data)
    priceHistory: 3600,     // 1 hour
    financials: 604800,     // 7 days (quarterly data, rarely changes)
    news: 1800,             // 30 minutes
    profile: 2592000,       // 30 days (company info rarely changes)
    valuation: 604800,      // 7 days (DCF, ratings, price targets)
    executives: 2592000,    // 30 days (executives rarely change)
    peers: 2592000,         // 30 days (peer list rarely changes)
    economic: 86400,        // 24 hours (FRED data updates daily)
    politicalTrades: 21600  // 6 hours (congressional trades refresh)
  }
};

export default config;
