import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (config.nodeEnv === 'development') {
    console.log('Query executed:', { text: text.slice(0, 100), duration, rows: result.rowCount });
  }

  return result;
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<pg.PoolClient>}
 */
export async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  // Track query timeout
  const timeout = setTimeout(() => {
    console.error('Client has been checked out for more than 5 seconds!');
  }, 5000);

  client.query = (...args) => {
    return originalQuery(...args);
  };

  client.release = () => {
    clearTimeout(timeout);
    return originalRelease();
  };

  return client;
}

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connected:', result.rows[0].now);
    return true;
  } catch (err) {
    console.error('Database connection failed:', err.message);
    return false;
  }
}

/**
 * Close the pool
 */
export async function closePool() {
  await pool.end();
}

export default { query, getClient, testConnection, closePool };
