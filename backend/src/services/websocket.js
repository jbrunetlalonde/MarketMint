import yahooFinance from './yahooFinance.js';

// Track client subscriptions: Map<WebSocket, Set<ticker>>
const clientSubscriptions = new Map();

// Track ticker subscribers: Map<ticker, Set<WebSocket>>
const tickerSubscribers = new Map();

// Update interval (15 seconds during market hours)
const UPDATE_INTERVAL = 15000;
let updateInterval = null;

/**
 * Initialize WebSocket handling
 */
export function initializeWebSocket(wss) {
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Initialize client subscription set
    clientSubscriptions.set(ws, new Set());

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to MarketMint WebSocket',
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        await handleMessage(ws, data);
      } catch (err) {
        console.error('WebSocket message error:', err);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      handleDisconnect(ws);
      console.log('WebSocket client disconnected');
    });

    // Handle errors
    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      handleDisconnect(ws);
    });

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);
  });

  // Start quote update loop
  startUpdateLoop(wss);
}

/**
 * Handle incoming WebSocket messages
 */
async function handleMessage(ws, data) {
  const { type, ticker, tickers } = data;

  switch (type) {
    case 'subscribe':
      if (ticker) {
        subscribe(ws, ticker.toUpperCase());
      } else if (tickers && Array.isArray(tickers)) {
        tickers.forEach(t => subscribe(ws, t.toUpperCase()));
      }
      break;

    case 'unsubscribe':
      if (ticker) {
        unsubscribe(ws, ticker.toUpperCase());
      } else if (tickers && Array.isArray(tickers)) {
        tickers.forEach(t => unsubscribe(ws, t.toUpperCase()));
      }
      break;

    case 'unsubscribe_all':
      unsubscribeAll(ws);
      break;

    case 'get_quote':
      if (ticker) {
        await sendQuote(ws, ticker.toUpperCase());
      }
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${type}`
      }));
  }
}

/**
 * Subscribe client to ticker updates
 */
function subscribe(ws, ticker) {
  if (!/^[A-Z]{1,5}$/.test(ticker)) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Invalid ticker: ${ticker}`
    }));
    return;
  }

  // Add to client subscriptions
  const clientTickers = clientSubscriptions.get(ws);
  if (clientTickers) {
    clientTickers.add(ticker);
  }

  // Add to ticker subscribers
  if (!tickerSubscribers.has(ticker)) {
    tickerSubscribers.set(ticker, new Set());
  }
  tickerSubscribers.get(ticker).add(ws);

  ws.send(JSON.stringify({
    type: 'subscribed',
    ticker,
    message: `Subscribed to ${ticker} updates`
  }));

  // Send immediate quote
  sendQuote(ws, ticker);
}

/**
 * Unsubscribe client from ticker updates
 */
function unsubscribe(ws, ticker) {
  const clientTickers = clientSubscriptions.get(ws);
  if (clientTickers) {
    clientTickers.delete(ticker);
  }

  const subscribers = tickerSubscribers.get(ticker);
  if (subscribers) {
    subscribers.delete(ws);
    if (subscribers.size === 0) {
      tickerSubscribers.delete(ticker);
    }
  }

  ws.send(JSON.stringify({
    type: 'unsubscribed',
    ticker,
    message: `Unsubscribed from ${ticker} updates`
  }));
}

/**
 * Unsubscribe client from all tickers
 */
function unsubscribeAll(ws) {
  const clientTickers = clientSubscriptions.get(ws);
  if (clientTickers) {
    for (const ticker of clientTickers) {
      const subscribers = tickerSubscribers.get(ticker);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          tickerSubscribers.delete(ticker);
        }
      }
    }
    clientTickers.clear();
  }

  ws.send(JSON.stringify({
    type: 'unsubscribed_all',
    message: 'Unsubscribed from all tickers'
  }));
}

/**
 * Handle client disconnect
 */
function handleDisconnect(ws) {
  unsubscribeAll(ws);
  clientSubscriptions.delete(ws);
}

/**
 * Send quote to specific client
 */
async function sendQuote(ws, ticker) {
  try {
    const quote = await yahooFinance.getQuote(ticker);
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'quote',
        data: quote,
        timestamp: new Date().toISOString()
      }));
    }
  } catch (err) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        ticker,
        message: `Failed to fetch quote for ${ticker}`
      }));
    }
  }
}

/**
 * Broadcast quote update to all subscribers
 */
async function broadcastQuote(ticker) {
  const subscribers = tickerSubscribers.get(ticker);
  if (!subscribers || subscribers.size === 0) return;

  try {
    const quote = await yahooFinance.getQuote(ticker);
    const message = JSON.stringify({
      type: 'quote_update',
      data: quote,
      timestamp: new Date().toISOString()
    });

    for (const ws of subscribers) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    }
  } catch (err) {
    console.error(`Failed to broadcast quote for ${ticker}:`, err.message);
  }
}

/**
 * Start periodic quote update loop
 */
function startUpdateLoop(wss) {
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  updateInterval = setInterval(async () => {
    const tickers = Array.from(tickerSubscribers.keys());
    if (tickers.length === 0) return;

    // Update quotes in batches of 10
    for (let i = 0; i < tickers.length; i += 10) {
      const batch = tickers.slice(i, i + 10);
      await Promise.all(batch.map(broadcastQuote));
    }
  }, UPDATE_INTERVAL);
}

/**
 * Get subscription stats
 */
export function getStats() {
  return {
    connectedClients: clientSubscriptions.size,
    subscribedTickers: tickerSubscribers.size,
    tickers: Array.from(tickerSubscribers.keys())
  };
}

export default {
  initializeWebSocket,
  getStats
};
