#!/usr/bin/env node

/**
 * Load Testing Script for MarketMint API
 *
 * Usage:
 *   node scripts/load-test.js [endpoint] [options]
 *
 * Examples:
 *   node scripts/load-test.js                    # Run all tests
 *   node scripts/load-test.js health             # Test health endpoint only
 *   node scripts/load-test.js --duration 30      # 30 second tests
 *   node scripts/load-test.js --connections 10   # 10 concurrent connections
 */

import autocannon from 'autocannon';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const DEFAULT_DURATION = 10; // seconds
const DEFAULT_CONNECTIONS = 5;

// Parse command line args
const args = process.argv.slice(2);
const targetEndpoint = args.find(a => !a.startsWith('--'));
const duration = parseInt(args.find(a => a.startsWith('--duration='))?.split('=')[1] || DEFAULT_DURATION);
const connections = parseInt(args.find(a => a.startsWith('--connections='))?.split('=')[1] || DEFAULT_CONNECTIONS);

// Test configurations
const tests = [
  {
    name: 'health',
    title: 'Health Check',
    url: '/health',
    method: 'GET'
  },
  {
    name: 'quotes',
    title: 'Stock Quote',
    url: '/api/quotes/AAPL',
    method: 'GET'
  },
  {
    name: 'bulk-quotes',
    title: 'Bulk Quotes',
    url: '/api/quotes/bulk?tickers=AAPL,MSFT,GOOGL',
    method: 'GET'
  },
  {
    name: 'news',
    title: 'Market News',
    url: '/api/news',
    method: 'GET'
  },
  {
    name: 'political',
    title: 'Political Trades',
    url: '/api/political/trades?limit=10',
    method: 'GET'
  }
];

async function runTest(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${test.title}`);
  console.log(`URL: ${BASE_URL}${test.url}`);
  console.log(`Duration: ${duration}s, Connections: ${connections}`);
  console.log('='.repeat(60));

  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url: `${BASE_URL}${test.url}`,
      method: test.method,
      connections,
      duration,
      headers: test.headers || {}
    }, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });

    autocannon.track(instance, { renderProgressBar: true });
  });
}

function formatResult(result) {
  return {
    latency: {
      avg: `${result.latency.average.toFixed(2)}ms`,
      p50: `${result.latency.p50.toFixed(2)}ms`,
      p99: `${result.latency.p99.toFixed(2)}ms`,
      max: `${result.latency.max.toFixed(2)}ms`
    },
    throughput: {
      avg: `${(result.throughput.average / 1024).toFixed(2)} KB/s`,
      total: `${(result.throughput.total / 1024 / 1024).toFixed(2)} MB`
    },
    requests: {
      total: result.requests.total,
      perSecond: result.requests.average.toFixed(2)
    },
    errors: result.errors + result.timeouts,
    statusCodes: result.statusCodeStats
  };
}

async function main() {
  console.log('\n');
  console.log('  MarketMint Load Testing');
  console.log('  ' + '='.repeat(40));
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Duration: ${duration}s per test`);
  console.log(`  Connections: ${connections} concurrent`);
  console.log('\n');

  const testsToRun = targetEndpoint
    ? tests.filter(t => t.name === targetEndpoint)
    : tests;

  if (testsToRun.length === 0) {
    console.error(`Unknown endpoint: ${targetEndpoint}`);
    console.log('\nAvailable endpoints:');
    tests.forEach(t => console.log(`  - ${t.name}: ${t.title}`));
    process.exit(1);
  }

  const results = [];

  for (const test of testsToRun) {
    try {
      const result = await runTest(test);
      results.push({
        name: test.name,
        title: test.title,
        ...formatResult(result)
      });
    } catch (err) {
      console.error(`Test failed for ${test.name}:`, err.message);
      results.push({
        name: test.name,
        title: test.title,
        error: err.message
      });
    }
  }

  // Summary
  console.log('\n\n');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  results.forEach(r => {
    console.log(`\n${r.title} (${r.name}):`);
    if (r.error) {
      console.log(`  ERROR: ${r.error}`);
    } else {
      console.log(`  Requests/sec: ${r.requests.perSecond}`);
      console.log(`  Latency avg:  ${r.latency.avg}`);
      console.log(`  Latency p99:  ${r.latency.p99}`);
      console.log(`  Errors:       ${r.errors}`);
    }
  });

  console.log('\n');
}

main().catch(console.error);
