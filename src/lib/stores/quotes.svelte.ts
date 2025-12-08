import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import api from '$lib/utils/api';

interface Quote {
	ticker: string;
	price: number | null;
	change: number | null;
	changePercent: number | null;
	volume: number | null;
	marketCap: number | null;
	name?: string;
	dayHigh?: number | null;
	dayLow?: number | null;
	previousClose?: number | null;
	lastUpdated?: string;
	isMock?: boolean;
}

interface QuotesState {
	quotes: Map<string, Quote>;
	subscriptions: Set<string>;
	connected: boolean;
	error: string | null;
}

const WS_URL = env.PUBLIC_WS_URL || 'ws://localhost:3001';

function createQuotesStore() {
	let state = $state<QuotesState>({
		quotes: new Map(),
		subscriptions: new Set(),
		connected: false,
		error: null
	});

	let ws: WebSocket | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	let reconnectAttempts = 0;
	const MAX_RECONNECT_ATTEMPTS = 5;

	function connect() {
		if (!browser) return;
		// Don't create new connection if already open or connecting
		if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

		try {
			ws = new WebSocket(`${WS_URL}/ws`);

			ws.onopen = () => {
				state.connected = true;
				state.error = null;
				reconnectAttempts = 0;

				// Resubscribe to all tickers (ws is guaranteed open here)
				for (const ticker of state.subscriptions) {
					if (ws?.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify({ type: 'subscribe', ticker }));
					}
				}
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					handleMessage(data);
				} catch {
					console.error('Failed to parse WebSocket message');
				}
			};

			ws.onclose = () => {
				state.connected = false;
				scheduleReconnect();
			};

			ws.onerror = () => {
				state.error = 'WebSocket connection error';
				state.connected = false;
			};
		} catch (err) {
			state.error = 'Failed to connect to WebSocket';
			scheduleReconnect();
		}
	}

	function scheduleReconnect() {
		if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
			state.error = 'Max reconnection attempts reached';
			return;
		}

		if (reconnectTimeout) clearTimeout(reconnectTimeout);

		const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
		reconnectAttempts++;

		reconnectTimeout = setTimeout(() => {
			connect();
		}, delay);
	}

	function handleMessage(data: { type: string; data?: Quote; ticker?: string }) {
		switch (data.type) {
			case 'quote':
			case 'quote_update':
				if (data.data) {
					state.quotes.set(data.data.ticker, data.data);
				}
				break;
			case 'subscribed':
				if (data.ticker) {
					state.subscriptions.add(data.ticker);
				}
				break;
			case 'unsubscribed':
				if (data.ticker) {
					state.subscriptions.delete(data.ticker);
				}
				break;
			case 'error':
				console.error('WebSocket error:', data);
				break;
		}
	}

	function disconnect() {
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = null;
		}
		if (ws) {
			ws.close();
			ws = null;
		}
		state.connected = false;
	}

	return {
		get quotes() {
			return state.quotes;
		},
		get connected() {
			return state.connected;
		},
		get error() {
			return state.error;
		},

		connect,
		disconnect,

		subscribe(ticker: string) {
			const normalizedTicker = ticker.toUpperCase();
			state.subscriptions.add(normalizedTicker);

			if (ws?.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'subscribe', ticker: normalizedTicker }));
			} else {
				connect();
			}
		},

		unsubscribe(ticker: string) {
			const normalizedTicker = ticker.toUpperCase();
			state.subscriptions.delete(normalizedTicker);

			if (ws?.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'unsubscribe', ticker: normalizedTicker }));
			}
			state.quotes.delete(normalizedTicker);
		},

		subscribeMany(tickers: string[]) {
			for (const ticker of tickers) {
				this.subscribe(ticker);
			}
		},

		unsubscribeAll() {
			if (ws?.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'unsubscribe_all' }));
			}
			state.subscriptions.clear();
			state.quotes.clear();
		},

		getQuote(ticker: string): Quote | undefined {
			return state.quotes.get(ticker.toUpperCase());
		},

		async fetchQuote(ticker: string): Promise<Quote | null> {
			try {
				const response = await api.getQuote(ticker);
				if (response.success && response.data) {
					const quote = response.data as Quote;
					state.quotes.set(quote.ticker, quote);
					return quote;
				}
			} catch (err) {
				console.error(`Failed to fetch quote for ${ticker}:`, err);
			}
			return null;
		},

		async fetchBulkQuotes(tickers: string[]): Promise<Quote[]> {
			try {
				const response = await api.getBulkQuotes(tickers);
				if (response.success && response.data && Array.isArray(response.data)) {
					const fetchedQuotes = response.data as Quote[];
					for (const quote of fetchedQuotes) {
						if (quote && quote.ticker) {
							state.quotes.set(quote.ticker, quote);
						}
					}
					return fetchedQuotes;
				}
			} catch (err) {
				console.error('Failed to fetch bulk quotes:', err);
			}
			return [];
		}
	};
}

export const quotes = createQuotesStore();
