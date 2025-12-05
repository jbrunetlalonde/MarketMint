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
		>(`/api/quotes/bulk?tickers=${tickers.join(',')}`, { token }),

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

	// Financials
	getFinancials: (ticker: string, token?: string) =>
		request(`/api/financials/${ticker}`, { token }),

	// News
	getNews: (category?: string, token?: string) =>
		request(`/api/news${category ? `?category=${category}` : ''}`, { token }),

	// Political trades
	getPoliticalTrades: (token?: string) => request('/api/political/trades', { token }),

	// Newsletter
	getLatestNewsletter: (token?: string) => request('/api/newsletter/latest', { token }),

	getNewsletterArchive: (token?: string) => request('/api/newsletter/archive', { token })
};

export default api;
