import fmp from './financialModelPrep.js';
import logger from '../config/logger.js';

const POPULAR_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
  'JPM', 'V', 'JNJ', 'UNH', 'HD', 'PG', 'MA', 'DIS'
];

export async function warmCaches() {
  logger.info('Starting cache warming...');
  const results = {
    sectorPerformance: false,
    earningsCalendar: false,
    popularQuotes: 0
  };

  try {
    // Warm sector performance cache
    const sectorData = await fmp.getSectorPerformance();
    results.sectorPerformance = sectorData && sectorData.length > 0;
    logger.info('Sector performance cache warmed', { sectors: sectorData?.length || 0 });
  } catch (err) {
    logger.warn('Failed to warm sector performance cache', { error: err.message });
  }

  try {
    // Warm earnings calendar cache (next 7 days)
    const today = new Date();
    const from = today.toISOString().split('T')[0];
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 7);
    const to = toDate.toISOString().split('T')[0];

    const earnings = await fmp.getEarningsCalendar(from, to);
    results.earningsCalendar = earnings && earnings.length >= 0;
    logger.info('Earnings calendar cache warmed', { events: earnings?.length || 0 });
  } catch (err) {
    logger.warn('Failed to warm earnings calendar cache', { error: err.message });
  }

  try {
    // Warm popular ticker quotes in parallel
    const quotePromises = POPULAR_TICKERS.map(ticker =>
      fmp.getQuote(ticker).catch(() => null)
    );
    const quotes = await Promise.all(quotePromises);
    results.popularQuotes = quotes.filter(Boolean).length;
    logger.info('Popular quotes cache warmed', { count: results.popularQuotes });
  } catch (err) {
    logger.warn('Failed to warm popular quotes cache', { error: err.message });
  }

  logger.info('Cache warming complete', results);
  return results;
}

export async function warmCachesWithDelay(delayMs = 2000) {
  // Wait for server to fully start before warming caches
  await new Promise(resolve => setTimeout(resolve, delayMs));
  return warmCaches();
}

export default { warmCaches, warmCachesWithDelay };
