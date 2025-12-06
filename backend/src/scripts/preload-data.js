/**
 * Data Preloader Script
 *
 * This script runs on container startup to preload historical price data
 * for common tickers into PostgreSQL. This ensures fast loading times
 * by serving data from DB instead of external APIs.
 *
 * Usage:
 *   node src/scripts/preload-data.js
 *   docker-compose --profile preload up preloader
 */

import priceHistory from '../services/priceHistory.js';
import { testConnection, query } from '../config/database.js';

// Common tickers to preload (major indices, popular stocks)
const TICKERS_TO_PRELOAD = [
  // Major ETFs
  'SPY', 'QQQ', 'DIA', 'IWM', 'VTI',
  // Tech giants
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  // Finance
  'JPM', 'BAC', 'GS', 'V', 'MA',
  // Healthcare
  'JNJ', 'UNH', 'PFE',
  // Consumer
  'WMT', 'HD', 'DIS', 'NKE',
  // Energy
  'XOM', 'CVX',
  // Industrial
  'BA', 'CAT'
];

// Historical periods to preload
const PERIODS = ['5y'];

async function preloadTicker(ticker, period) {
  try {
    console.log(`  Loading ${ticker} (${period})...`);
    const data = await priceHistory.getHistoricalOHLC(ticker, period);
    console.log(`  ${ticker}: ${data.length} data points cached`);
    return { ticker, success: true, count: data.length };
  } catch (err) {
    console.error(`  ${ticker}: Failed - ${err.message}`);
    return { ticker, success: false, error: err.message };
  }
}

async function getExistingDataStats() {
  const result = await query(`
    SELECT
      ticker,
      COUNT(*) as record_count,
      MIN(date) as earliest_date,
      MAX(date) as latest_date
    FROM price_history
    GROUP BY ticker
    ORDER BY ticker
  `);
  return result.rows;
}

async function main() {
  console.log('='.repeat(60));
  console.log('MarketMint Data Preloader');
  console.log('='.repeat(60));
  console.log('');

  // Test database connection
  const connected = await testConnection();
  if (!connected) {
    console.error('Failed to connect to database. Exiting.');
    process.exit(1);
  }
  console.log('Database connection established.\n');

  // Show existing data stats
  console.log('Existing data in database:');
  const existingStats = await getExistingDataStats();
  if (existingStats.length === 0) {
    console.log('  No historical data found. Starting fresh.\n');
  } else {
    console.log(`  ${existingStats.length} tickers with data:`);
    for (const stat of existingStats.slice(0, 10)) {
      console.log(`    ${stat.ticker}: ${stat.record_count} records (${stat.earliest_date} to ${stat.latest_date})`);
    }
    if (existingStats.length > 10) {
      console.log(`    ... and ${existingStats.length - 10} more\n`);
    }
  }

  // Determine what to preload
  const existingTickers = new Set(existingStats.map(s => s.ticker));
  const tickersToLoad = TICKERS_TO_PRELOAD.filter(t => !existingTickers.has(t));

  if (tickersToLoad.length === 0) {
    console.log('All tickers already have data. Checking for stale data...\n');

    // Check for stale data (older than 1 day)
    const staleResult = await query(`
      SELECT DISTINCT ticker
      FROM price_history
      WHERE ticker = ANY($1)
      GROUP BY ticker
      HAVING MAX(date) < CURRENT_DATE - INTERVAL '1 day'
    `, [TICKERS_TO_PRELOAD]);

    if (staleResult.rows.length > 0) {
      console.log(`Found ${staleResult.rows.length} tickers with stale data. Refreshing...`);
      for (const row of staleResult.rows) {
        await preloadTicker(row.ticker, '1m'); // Just refresh last month
      }
    } else {
      console.log('All data is up to date. Exiting.');
      process.exit(0);
    }
  }

  // Preload data
  console.log(`\nPreloading ${tickersToLoad.length} tickers...`);
  console.log('-'.repeat(40));

  const results = [];
  for (const ticker of tickersToLoad) {
    for (const period of PERIODS) {
      const result = await preloadTicker(ticker, period);
      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Preload Summary');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed tickers:');
    for (const f of failed) {
      console.log(`  ${f.ticker}: ${f.error}`);
    }
  }

  const totalRecords = successful.reduce((sum, r) => sum + r.count, 0);
  console.log(`\nTotal records cached: ${totalRecords.toLocaleString()}`);

  // Final stats
  const finalStats = await getExistingDataStats();
  const totalInDb = finalStats.reduce((sum, s) => sum + parseInt(s.record_count), 0);
  console.log(`Total records in database: ${totalInDb.toLocaleString()}`);

  console.log('\nPreload complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Preload failed:', err);
  process.exit(1);
});
