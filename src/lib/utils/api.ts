import { env } from '$env/dynamic/public';

const API_BASE = env.PUBLIC_API_URL || 'http://localhost:5001';

interface ApiOptions extends RequestInit {
	token?: string;
}

interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: {
		message: string;
		details?: unknown;
	};
}

/**
 * Make an API request
 */
async function request<T>(
	endpoint: string,
	options: ApiOptions = {}
): Promise<ApiResponse<T>> {
	const { token, ...fetchOptions } = options;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	try {
		const response = await fetch(`${API_BASE}${endpoint}`, {
			...fetchOptions,
			headers
		});

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.error || { message: 'Request failed' }
			};
		}

		return data;
	} catch (err) {
		return {
			success: false,
			error: {
				message: err instanceof Error ? err.message : 'Network error'
			}
		};
	}
}

/**
 * API client methods
 */
export const api = {
	// Auth
	login: (email: string, password: string) =>
		request<{
			user: { id: string; username: string; email: string; role: string };
			accessToken: string;
			refreshToken: string;
		}>('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password })
		}),

	register: (username: string, email: string, password: string) =>
		request<{
			user: { id: string; username: string; email: string; role: string };
			accessToken: string;
			refreshToken: string;
		}>('/api/auth/register', {
			method: 'POST',
			body: JSON.stringify({ username, email, password })
		}),

	refresh: (refreshToken: string) =>
		request<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
			method: 'POST',
			body: JSON.stringify({ refreshToken })
		}),

	logout: (token: string, refreshToken: string) =>
		request('/api/auth/logout', {
			method: 'POST',
			token,
			body: JSON.stringify({ refreshToken })
		}),

	getMe: (token: string) =>
		request<{ user: { id: string; username: string; email: string; role: string } }>(
			'/api/auth/me',
			{ token }
		),

	// Quotes
	getQuote: (ticker: string, token?: string) =>
		request<{ ticker: string; price: number; change: number; changePercent: number }>(
			`/api/quotes/${ticker}`,
			{ token }
		),

	getBulkQuotes: (tickers: string[], token?: string) =>
		request<
			Array<{ ticker: string; price: number; change: number; changePercent: number }>
		>(`/api/quotes?tickers=${tickers.join(',')}`, { token }),

	// Watchlist
	getWatchlist: (token: string) =>
		request<Array<{ id: string; ticker: string; notes: string; added_at: string }>>(
			'/api/watchlist',
			{ token }
		),

	addToWatchlist: (token: string, ticker: string, notes?: string) =>
		request('/api/watchlist/add', {
			method: 'POST',
			token,
			body: JSON.stringify({ ticker, notes })
		}),

	removeFromWatchlist: (token: string, ticker: string) =>
		request(`/api/watchlist/${ticker}`, {
			method: 'DELETE',
			token
		}),

	// History
	getHistory: (ticker: string, period = '1y', token?: string) =>
		request<{
			ticker: string;
			period: string;
			history: Array<{ date: string; close: number; volume?: number }>;
		}>(`/api/quotes/${ticker}/history?period=${period}`, { token }),

	// Financials
	getFinancials: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			companyName: string;
			sector: string;
			industry: string;
			description?: string;
			ceo?: string;
			employees?: number;
			website?: string;
			logo?: string;
			peRatio?: number;
			pbRatio?: number;
			debtToEquity?: number;
			roe?: number;
			dividendYield?: number;
			isMock?: boolean;
		}>(`/api/financials/${ticker}`, { token }),

	getProfile: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			name: string;
			exchange?: string;
			industry?: string;
			sector?: string;
			website?: string;
			description?: string;
			ceo?: string;
			employees?: number;
			headquarters?: string;
			image?: string;
		}>(`/api/financials/${ticker}/profile`, { token }),

	getIncomeStatement: (ticker: string, period = 'annual', limit = 5, token?: string) =>
		request<
			Array<{
				date: string;
				period: string;
				revenue: number;
				netIncome: number;
				grossProfit: number;
				operatingIncome: number;
				eps: number;
			}>
		>(`/api/financials/${ticker}/income?period=${period}&limit=${limit}`, { token }),

	getHistoricalPrices: (ticker: string, period = '1y', token?: string) =>
		request<{
			ticker: string;
			period: string;
			history: Array<{ date: string; close: number }>;
		}>(`/api/financials/${ticker}/history?period=${period}`, { token }),

	// News
	getNews: (limit?: number, token?: string) =>
		request<
			Array<{
				id: string;
				ticker: string | null;
				title: string;
				content: string | null;
				url: string;
				imageUrl: string | null;
				source: string | null;
				publishedAt: string;
				sentiment: string | null;
			}>
		>(`/api/news${limit ? `?limit=${limit}` : ''}`, { token }),

	getNewsTrending: (limit?: number, token?: string) =>
		request<
			Array<{
				id: string;
				ticker: string | null;
				title: string;
				content: string | null;
				url: string;
				imageUrl: string | null;
				source: string | null;
				publishedAt: string;
				sentiment: string | null;
			}>
		>(`/api/news/trending${limit ? `?limit=${limit}` : ''}`, { token }),

	getTickerNews: (ticker: string, limit?: number, token?: string) =>
		request<
			Array<{
				id: string;
				ticker: string | null;
				title: string;
				content: string | null;
				url: string;
				imageUrl: string | null;
				source: string | null;
				publishedAt: string;
				sentiment: string | null;
			}>
		>(`/api/news/${ticker}${limit ? `?limit=${limit}` : ''}`, { token }),

	getNewsSummary: (token?: string) =>
		request<{
			headlines: Array<{
				id: string;
				title: string;
				url: string;
				source: string | null;
				publishedAt: string;
			}>;
			latestNews: Array<{
				id: string;
				title: string;
				url: string;
				source: string | null;
				publishedAt: string;
			}>;
			generatedAt: string;
		}>('/api/news/summary', { token }),

	// Political trades
	getPoliticalTrades: (
		options?: { party?: string; chamber?: string; transactionType?: string; ticker?: string; limit?: number },
		token?: string
	) => {
		const params = new URLSearchParams();
		if (options?.party) params.set('party', options.party);
		if (options?.chamber) params.set('chamber', options.chamber);
		if (options?.transactionType) params.set('transactionType', options.transactionType);
		if (options?.ticker) params.set('ticker', options.ticker);
		if (options?.limit) params.set('limit', String(options.limit));
		const queryString = params.toString();
		return request<
			Array<{
				id: number;
				officialName: string;
				ticker: string;
				assetDescription: string;
				transactionType: string;
				transactionDate: string;
				reportedDate: string;
				amountMin: number | null;
				amountMax: number | null;
				amountDisplay: string;
				party: string | null;
				title: string | null;
				state: string | null;
				portraitUrl: string | null;
				chamber: string;
				isMock?: boolean;
			}>
		>(`/api/political/trades${queryString ? `?${queryString}` : ''}`, { token });
	},

	getPoliticalTradesByTicker: (ticker: string, limit?: number, token?: string) =>
		request<
			Array<{
				id: number;
				officialName: string;
				ticker: string;
				assetDescription: string;
				transactionType: string;
				transactionDate: string;
				reportedDate: string;
				amountDisplay: string;
				party: string | null;
				title: string | null;
				state: string | null;
				chamber: string;
			}>
		>(`/api/political/trades/${ticker}${limit ? `?limit=${limit}` : ''}`, { token }),

	getPoliticalOfficials: (options?: { party?: string; chamber?: string; limit?: number }, token?: string) => {
		const params = new URLSearchParams();
		if (options?.party) params.set('party', options.party);
		if (options?.chamber) params.set('chamber', options.chamber);
		if (options?.limit) params.set('limit', String(options.limit));
		const queryString = params.toString();
		return request<
			Array<{
				id: string;
				name: string;
				title: string | null;
				party: string | null;
				state: string | null;
				district: string | null;
				portraitUrl: string | null;
				chamber: string;
			}>
		>(`/api/political/officials${queryString ? `?${queryString}` : ''}`, { token });
	},

	// Newsletter
	subscribeNewsletter: (email: string, name?: string) =>
		request<{ message: string }>('/api/newsletter/subscribe', {
			method: 'POST',
			body: JSON.stringify({ email, name })
		}),

	unsubscribeNewsletter: (token: string) =>
		request<{ message: string }>('/api/newsletter/unsubscribe', {
			method: 'POST',
			body: JSON.stringify({ token })
		}),

	// Economic Data (FRED)
	getEconomicIndicators: (token?: string) =>
		request<Record<string, {
			seriesId: string;
			name: string;
			unit: string;
			frequency: string;
			latest: { date: string; value: number } | null;
			change: number | null;
			changePercent: number | null;
			history: Array<{ date: string; value: number }>;
		}>>('/api/economic/indicators', { token }),

	getEconomicDashboard: (token?: string) =>
		request<{
			fedFundsRate: { latest: { date: string; value: number } | null } | null;
			treasury10Y: { latest: { date: string; value: number } | null } | null;
			treasury2Y: { latest: { date: string; value: number } | null } | null;
			yieldSpread: { latest: { date: string; value: number } | null } | null;
			unemployment: { latest: { date: string; value: number } | null } | null;
			cpi: { latest: { date: string; value: number } | null } | null;
			vix: { latest: { date: string; value: number } | null } | null;
			oilPrice: { latest: { date: string; value: number } | null } | null;
			mortgageRate: { latest: { date: string; value: number } | null } | null;
			gdp: { latest: { date: string; value: number } | null } | null;
		}>('/api/economic/dashboard', { token }),

	getEconomicSeries: (seriesId: string, limit?: number, token?: string) =>
		request<{
			seriesId: string;
			name: string;
			unit: string;
			frequency: string;
			latest: { date: string; value: number } | null;
			change: number | null;
			changePercent: number | null;
			history: Array<{ date: string; value: number }>;
		}>(`/api/economic/series/${seriesId}${limit ? `?limit=${limit}` : ''}`, { token }),

	getAvailableEconomicSeries: (token?: string) =>
		request<
			Array<{
				seriesId: string;
				name: string;
				unit: string;
				frequency: string;
			}>
		>('/api/economic/available', { token }),

	// Charts (OHLC with DB-first caching)
	getOHLC: (ticker: string, period = '1y', token?: string) =>
		request<{
			ticker: string;
			period: string;
			count: number;
			ohlc: Array<{
				time: string;
				open: number;
				high: number;
				low: number;
				close: number;
				volume: number;
			}>;
		}>(`/api/charts/${ticker}/ohlc?period=${period}`, { token }),

	getIndicators: (
		ticker: string,
		options: {
			period?: string;
			sma?: string;
			ema?: string;
			rsi?: boolean;
			macd?: boolean;
			bollinger?: boolean;
		} = {},
		token?: string
	) => {
		const params = new URLSearchParams();
		if (options.period) params.set('period', options.period);
		if (options.sma) params.set('sma', options.sma);
		if (options.ema) params.set('ema', options.ema);
		if (options.rsi !== undefined) params.set('rsi', String(options.rsi));
		if (options.macd !== undefined) params.set('macd', String(options.macd));
		if (options.bollinger !== undefined) params.set('bollinger', String(options.bollinger));

		return request<{
			ticker: string;
			period: string;
			count: number;
			indicators: Array<{
				time: string;
				open: number;
				high: number;
				low: number;
				close: number;
				volume: number;
				sma20?: number | null;
				sma50?: number | null;
				sma200?: number | null;
				ema12?: number | null;
				ema26?: number | null;
				rsi?: number | null;
				macd?: number | null;
				macdSignal?: number | null;
				macdHistogram?: number | null;
				bollingerUpper?: number | null;
				bollingerMiddle?: number | null;
				bollingerLower?: number | null;
			}>;
		}>(`/api/charts/${ticker}/indicators?${params.toString()}`, { token });
	},

	getDataFreshness: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			earliestDate: string | null;
			latestDate: string | null;
			recordCount: number;
		}>(`/api/charts/${ticker}/freshness`, { token }),

	// Executives
	getExecutives: (ticker: string, token?: string) =>
		request<
			Array<{
				name: string;
				title: string;
				pay: number | null;
				currencyPay: string;
				gender: string;
				yearBorn: number;
				titleSince: number;
			}>
		>(`/api/financials/${ticker}/executives`, { token }),

	// Analyst Rating
	getRating: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			date: string;
			rating: string;
			ratingScore: number;
			ratingRecommendation: string;
		}>(`/api/financials/${ticker}/rating`, { token }),

	// DCF Intrinsic Value
	getDCF: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			date: string;
			dcf: number;
			stockPrice: number;
		}>(`/api/financials/${ticker}/dcf`, { token }),

	// Price Target
	getPriceTarget: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			targetHigh: number;
			targetLow: number;
			targetConsensus: number;
			targetMedian: number;
		}>(`/api/financials/${ticker}/price-target`, { token }),

	// Peers/Competitors
	getPeers: (ticker: string, token?: string) =>
		request<string[]>(`/api/financials/${ticker}/peers`, { token }),

	// Stock Dividends
	getDividends: (ticker: string, token?: string) =>
		request<
			Array<{
				date: string;
				dividend: number;
				paymentDate: string;
			}>
		>(`/api/financials/${ticker}/dividends`, { token }),

	// Stock Splits
	getSplits: (ticker: string, token?: string) =>
		request<
			Array<{
				date: string;
				label: string;
				numerator: number;
				denominator: number;
			}>
		>(`/api/financials/${ticker}/splits`, { token }),

	// Full financial data (single call for page load)
	getFullFinancials: (ticker: string, token?: string) =>
		request<{
			profile: {
				ticker: string;
				name: string;
				sector: string;
				industry: string;
				description: string;
				ceo: string;
				employees: number;
				website: string;
				ipoDate: string;
				image: string;
			} | null;
			executives: Array<{
				name: string;
				title: string;
				pay: number | null;
			}>;
			metrics: {
				peRatio: number;
				pbRatio: number;
				debtToEquity: number;
				roe: number;
				dividendYield: number;
			} | null;
			rating: {
				rating: string;
				ratingScore: number;
				ratingRecommendation: string;
			} | null;
			dcf: {
				dcf: number;
				stockPrice: number;
			} | null;
			priceTarget: {
				targetHigh: number;
				targetLow: number;
				targetConsensus: number;
			} | null;
			peers: string[];
		}>(`/api/financials/${ticker}/full`, { token }),

	// Alerts
	getAlerts: (options?: { unreadOnly?: boolean; limit?: number }, token?: string) => {
		const params = new URLSearchParams();
		if (options?.unreadOnly) params.set('unreadOnly', 'true');
		if (options?.limit) params.set('limit', String(options.limit));
		const queryString = params.toString();
		return request<{
			alerts: Array<{
				id: number;
				ticker: string;
				officialName: string;
				transactionType: string;
				amountDisplay: string;
				createdAt: string;
				readAt: string | null;
				assetDescription: string | null;
				transactionDate: string | null;
				reportedDate: string | null;
				party: string | null;
				title: string | null;
				state: string | null;
				portraitUrl: string | null;
			}>;
			unreadCount: number;
		}>(`/api/alerts${queryString ? `?${queryString}` : ''}`, { token });
	},

	getUnreadAlertCount: (token?: string) =>
		request<{ count: number }>('/api/alerts/count', { token }),

	markAlertRead: (alertId: number, token?: string) =>
		request<{ message: string }>(`/api/alerts/${alertId}/read`, {
			method: 'POST',
			token
		}),

	markAllAlertsRead: (token?: string) =>
		request<{ message: string }>('/api/alerts/read-all', {
			method: 'POST',
			token
		}),

	// Trading Ideas
	getTradingIdeas: (status?: string, token?: string) =>
		request<
			Array<{
				id: number;
				user_id: string;
				ticker: string;
				title: string | null;
				thesis: string;
				entry_price: number | null;
				target_price: number | null;
				stop_loss: number | null;
				timeframe: 'intraday' | 'swing' | 'position' | 'long_term' | null;
				sentiment: 'bullish' | 'bearish' | 'neutral' | null;
				status: 'open' | 'closed' | 'stopped_out' | 'target_hit';
				actual_exit_price: number | null;
				closed_at: string | null;
				created_at: string;
				updated_at: string;
			}>
		>(`/api/ideas${status ? `?status=${status}` : ''}`, { token }),

	getTradingIdea: (id: number, token: string) =>
		request<{
			id: number;
			user_id: string;
			ticker: string;
			title: string | null;
			thesis: string;
			entry_price: number | null;
			target_price: number | null;
			stop_loss: number | null;
			timeframe: 'intraday' | 'swing' | 'position' | 'long_term' | null;
			sentiment: 'bullish' | 'bearish' | 'neutral' | null;
			status: 'open' | 'closed' | 'stopped_out' | 'target_hit';
			actual_exit_price: number | null;
			closed_at: string | null;
			created_at: string;
			updated_at: string;
		}>(`/api/ideas/${id}`, { token }),

	createTradingIdea: (
		token: string,
		data: {
			ticker: string;
			title?: string;
			thesis: string;
			entryPrice?: number;
			targetPrice?: number;
			stopLoss?: number;
			timeframe?: 'intraday' | 'swing' | 'position' | 'long_term';
			sentiment?: 'bullish' | 'bearish' | 'neutral';
		}
	) =>
		request<{
			id: number;
			ticker: string;
			title: string | null;
			thesis: string;
			entry_price: number | null;
			target_price: number | null;
			stop_loss: number | null;
			timeframe: string | null;
			sentiment: string | null;
			status: string;
			created_at: string;
		}>('/api/ideas', {
			method: 'POST',
			token,
			body: JSON.stringify(data)
		}),

	updateTradingIdea: (
		token: string,
		id: number,
		data: {
			title?: string;
			thesis?: string;
			entryPrice?: number;
			targetPrice?: number;
			stopLoss?: number;
			timeframe?: 'intraday' | 'swing' | 'position' | 'long_term';
			sentiment?: 'bullish' | 'bearish' | 'neutral';
		}
	) =>
		request<{
			id: number;
			ticker: string;
			thesis: string;
			status: string;
			updated_at: string;
		}>(`/api/ideas/${id}`, {
			method: 'PUT',
			token,
			body: JSON.stringify(data)
		}),

	closeTradingIdea: (
		token: string,
		id: number,
		exitPrice: number,
		status: 'closed' | 'stopped_out' | 'target_hit' = 'closed'
	) =>
		request<{
			id: number;
			ticker: string;
			status: string;
			actual_exit_price: number;
			closed_at: string;
		}>(`/api/ideas/${id}/close`, {
			method: 'POST',
			token,
			body: JSON.stringify({ exitPrice, status })
		}),

	deleteTradingIdea: (token: string, id: number) =>
		request<{ message: string }>(`/api/ideas/${id}`, {
			method: 'DELETE',
			token
		}),

	getTradingIdeasStats: (token: string) =>
		request<{
			totalIdeas: number;
			openIdeas: number;
			closedIdeas: number;
			targetHitCount: number;
			stoppedOutCount: number;
			winRate: number;
			avgPnlPercent: number;
		}>('/api/ideas/stats', { token }),

	exportTradingIdeas: async (token: string): Promise<Blob> => {
		const response = await fetch(`${API_BASE}/api/ideas/export`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		return response.blob();
	},

	exportTradingIdeasPDF: async (token: string): Promise<Blob> => {
		const response = await fetch(`${API_BASE}/api/ideas/export/pdf`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		return response.blob();
	},

	// Search
	searchSymbols: (query: string, limit = 8) =>
		request<Array<{ symbol: string; name: string; exchange: string }>>(
			`/api/search/symbols?q=${encodeURIComponent(query)}&limit=${limit}`
		)
};

export default api;
