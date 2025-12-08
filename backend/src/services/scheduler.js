import cron from 'node-cron';
import newsletterGenerator from './newsletterGenerator.js';
import emailService from './emailService.js';
import fmp from './financialModelPrep.js';
import { query } from '../config/database.js';
import { tradingIdeas } from '../models/tradingIdeas.js';
import { createIdeaAlert, cleanupOldAlerts } from './alerts.js';
import { refreshCommonTickers } from './politicalTracker.js';

// Track scheduled jobs
const jobs = new Map();

export function initializeScheduler() {
  console.log('Initializing scheduler...');

  // Daily newsletter at 4:00 PM ET (21:00 UTC during EST, 20:00 UTC during EDT)
  // Using 21:00 UTC to cover EST; adjust if needed
  const newsletterJob = cron.schedule('0 21 * * 1-5', async () => {
    console.log('Running daily newsletter job...');
    await runNewsletterJob();
  }, {
    timezone: 'America/New_York'
  });
  jobs.set('newsletter', newsletterJob);

  // Weekly data refresh - Sunday 8:00 PM ET
  const refreshJob = cron.schedule('0 20 * * 0', async () => {
    console.log('Running weekly data refresh...');
    await runWeeklyRefresh();
  }, {
    timezone: 'America/New_York'
  });
  jobs.set('weekly-refresh', refreshJob);

  // Cache cleanup - Daily at 3:00 AM ET
  const cleanupJob = cron.schedule('0 3 * * *', async () => {
    console.log('Running cache cleanup...');
    await runCacheCleanup();
  }, {
    timezone: 'America/New_York'
  });
  jobs.set('cache-cleanup', cleanupJob);

  // Trading idea price alerts - Every 5 min during market hours (9:30 AM - 4:00 PM ET, weekdays)
  const priceAlertJob = cron.schedule('*/5 9-16 * * 1-5', async () => {
    await runPriceAlertCheck();
  }, {
    timezone: 'America/New_York'
  });
  jobs.set('price-alerts', priceAlertJob);

  // Trending stocks materialized view refresh - Every 2 hours during market hours
  const trendingRefreshJob = cron.schedule('0 10,12,14,16 * * 1-5', async () => {
    console.log('Running trending stocks refresh...');
    await runTrendingStocksRefresh();
  }, {
    timezone: 'America/New_York'
  });
  jobs.set('trending-refresh', trendingRefreshJob);

  // Watchlist quote cache refresh - Every 15 min during market hours
  const watchlistQuoteJob = cron.schedule('*/15 9-16 * * 1-5', async () => {
    await runWatchlistQuoteRefresh();
  }, {
    timezone: 'America/New_York'
  });
  jobs.set('watchlist-quotes', watchlistQuoteJob);

  // Political trades refresh - Daily at 1 PM ET
  const politicalRefreshJob = cron.schedule('0 13 * * 1-5', async () => {
    console.log('Running political trades refresh...');
    await runPoliticalTradesRefresh();
  }, {
    timezone: 'America/New_York'
  });
  jobs.set('political-refresh', politicalRefreshJob);

  // Old alerts cleanup - Weekly Sunday 2 AM ET
  const alertsCleanupJob = cron.schedule('0 2 * * 0', async () => {
    console.log('Running alerts cleanup...');
    await runAlertsCleanup();
  }, {
    timezone: 'America/New_York'
  });
  jobs.set('alerts-cleanup', alertsCleanupJob);

  console.log('Scheduler initialized with jobs:', Array.from(jobs.keys()));
}

export async function runNewsletterJob() {
  const startTime = Date.now();

  try {
    // Check if email is configured
    const emailStatus = await emailService.verifyConnection();
    if (!emailStatus.configured) {
      console.log('Email not configured, skipping newsletter');
      return { success: false, reason: 'Email not configured' };
    }

    // Check if there are subscribers
    const subscriberCount = await emailService.getSubscriberCount();
    if (subscriberCount === 0) {
      console.log('No subscribers, skipping newsletter');
      return { success: false, reason: 'No subscribers' };
    }

    // Generate newsletter
    const { subject, html } = await newsletterGenerator.generateDailyNewsletter();

    // Send to all subscribers
    const result = await emailService.sendBulkEmail({ subject, html });

    // Log the send
    await emailService.logNewsletterSend(
      subject,
      result.sent,
      result.success ? 'completed' : 'partial',
      result.errors ? JSON.stringify(result.errors) : null
    );

    const duration = Date.now() - startTime;
    console.log(`Newsletter job completed in ${duration}ms. Sent: ${result.sent}, Failed: ${result.failed}`);

    return {
      success: true,
      sent: result.sent,
      failed: result.failed,
      duration
    };
  } catch (error) {
    console.error('Newsletter job failed:', error.message);

    await emailService.logNewsletterSend(
      'Daily Newsletter',
      0,
      'failed',
      error.message
    );

    return { success: false, error: error.message };
  }
}

export async function runWeeklyRefresh() {
  try {
    // Get all tickers from watchlists
    const result = await query('SELECT DISTINCT ticker FROM watchlists');
    const tickers = result.rows.map(r => r.ticker);

    if (tickers.length === 0) {
      console.log('No tickers to refresh');
      return { success: true, refreshed: 0 };
    }

    // Refresh in batches
    const batchSize = 20;
    let refreshed = 0;

    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      await fmp.bulkRefreshProfiles(batch);
      refreshed += batch.length;

      // Small delay between batches to avoid rate limits
      if (i + batchSize < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`Weekly refresh completed: ${refreshed} tickers`);
    return { success: true, refreshed };
  } catch (error) {
    console.error('Weekly refresh failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function runCacheCleanup() {
  try {
    // Clean up expired cache entries
    await query('SELECT cleanup_fmp_cache()');
    await query('SELECT cleanup_phase5_cache()');

    console.log('Cache cleanup completed');
    return { success: true };
  } catch (error) {
    console.error('Cache cleanup failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function runPriceAlertCheck() {
  try {
    // Check if we're in market hours (9:30 AM - 4:00 PM ET)
    const now = new Date();
    const etHour = parseInt(now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }));
    const etMinute = parseInt(now.toLocaleString('en-US', { timeZone: 'America/New_York', minute: 'numeric' }));
    const etTime = etHour * 60 + etMinute;

    // Market hours: 9:30 (570 min) to 16:00 (960 min)
    if (etTime < 570 || etTime > 960) {
      return { success: true, skipped: true, reason: 'Outside market hours' };
    }

    // Get open ideas that need price checking
    const openIdeas = await tradingIdeas.getOpenIdeasForAlertCheck();

    if (openIdeas.length === 0) {
      return { success: true, checked: 0, alerts: 0 };
    }

    // Get unique tickers
    const tickers = [...new Set(openIdeas.map(idea => idea.ticker))];

    // Fetch current quotes using FMP
    const quotes = await fmp.getBatchQuotes(tickers);

    let alertsCreated = 0;

    for (const idea of openIdeas) {
      const quote = quotes.find(q => q.ticker === idea.ticker);
      if (!quote?.price) continue;

      const currentPrice = quote.price;

      // Check for target hit (bullish ideas)
      if (idea.sentiment === 'bullish' && idea.target_price && currentPrice >= idea.target_price) {
        const success = await createIdeaAlert(idea, 'target_hit', currentPrice);
        if (success) alertsCreated++;
      }

      // Check for target hit (bearish ideas - price goes down to target)
      if (idea.sentiment === 'bearish' && idea.target_price && currentPrice <= idea.target_price) {
        const success = await createIdeaAlert(idea, 'target_hit', currentPrice);
        if (success) alertsCreated++;
      }

      // Check for stop loss (bullish ideas - price drops below stop)
      if (idea.sentiment === 'bullish' && idea.stop_loss && currentPrice <= idea.stop_loss) {
        const success = await createIdeaAlert(idea, 'stopped_out', currentPrice);
        if (success) alertsCreated++;
      }

      // Check for stop loss (bearish ideas - price rises above stop)
      if (idea.sentiment === 'bearish' && idea.stop_loss && currentPrice >= idea.stop_loss) {
        const success = await createIdeaAlert(idea, 'stopped_out', currentPrice);
        if (success) alertsCreated++;
      }
    }

    if (alertsCreated > 0) {
      console.log(`Price alert check: ${alertsCreated} alerts created for ${openIdeas.length} ideas`);
    }

    return { success: true, checked: openIdeas.length, alerts: alertsCreated };
  } catch (error) {
    console.error('Price alert check failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function runTrendingStocksRefresh() {
  try {
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY trending_stocks');
    console.log('Trending stocks materialized view refreshed');
    return { success: true };
  } catch (error) {
    console.error('Trending stocks refresh failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function runWatchlistQuoteRefresh() {
  try {
    // Check market hours
    const now = new Date();
    const etHour = parseInt(now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }));
    const etMinute = parseInt(now.toLocaleString('en-US', { timeZone: 'America/New_York', minute: 'numeric' }));
    const etTime = etHour * 60 + etMinute;

    if (etTime < 570 || etTime > 960) {
      return { success: true, skipped: true, reason: 'Outside market hours' };
    }

    // Get all unique tickers from watchlists
    const result = await query('SELECT DISTINCT ticker FROM watchlists');
    const tickers = result.rows.map(r => r.ticker);

    if (tickers.length === 0) {
      return { success: true, refreshed: 0 };
    }

    // Fetch quotes in batches
    const batchSize = 50;
    let refreshed = 0;

    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      await fmp.getBatchQuotes(batch);
      refreshed += batch.length;
    }

    return { success: true, refreshed };
  } catch (error) {
    console.error('Watchlist quote refresh failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function runPoliticalTradesRefresh() {
  try {
    await refreshCommonTickers();
    console.log('Political trades refreshed');
    return { success: true };
  } catch (error) {
    console.error('Political trades refresh failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function runAlertsCleanup() {
  try {
    const deleted = await cleanupOldAlerts(30);
    console.log(`Alerts cleanup completed: ${deleted} old alerts deleted`);
    return { success: true, deleted };
  } catch (error) {
    console.error('Alerts cleanup failed:', error.message);
    return { success: false, error: error.message };
  }
}

export function getSchedulerStatus() {
  const status = {};

  for (const [name, job] of jobs) {
    status[name] = {
      running: job.running || false
    };
  }

  return status;
}

export function stopScheduler() {
  for (const [name, job] of jobs) {
    job.stop();
    console.log(`Stopped job: ${name}`);
  }
  jobs.clear();
}

export default {
  initializeScheduler,
  runNewsletterJob,
  runWeeklyRefresh,
  runCacheCleanup,
  runPriceAlertCheck,
  runTrendingStocksRefresh,
  runWatchlistQuoteRefresh,
  runPoliticalTradesRefresh,
  runAlertsCleanup,
  getSchedulerStatus,
  stopScheduler
};
