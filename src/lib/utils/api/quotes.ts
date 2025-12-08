import { request } from './request';

export const quotesApi = {
	getQuote: (ticker: string, token?: string) =>
		request<{ ticker: string; price: number; change: number; changePercent: number }>(
			`/api/quotes/${ticker}`,
			{ token }
		),

	getBulkQuotes: (tickers: string[], token?: string) =>
		request<
			Array<{ ticker: string; price: number; change: number; changePercent: number }>
		>(`/api/quotes?tickers=${tickers.join(',')}`, { token }),

	getHistory: (ticker: string, period = '1y', token?: string) =>
		request<{
			ticker: string;
			period: string;
			history: Array<{ date: string; close: number; volume?: number }>;
		}>(`/api/quotes/${ticker}/history?period=${period}`, { token }),

	getMovers: (limit = 10, token?: string) =>
		request<{
			gainers: Array<{ ticker: string; name?: string; price: number; change: number; changePercent: number; volume: number }>;
			losers: Array<{ ticker: string; name?: string; price: number; change: number; changePercent: number; volume: number }>;
			mostActive: Array<{ ticker: string; name?: string; price: number; change: number; changePercent: number; volume: number }>;
			timestamp: string;
		}>(`/api/quotes/movers?limit=${limit}`, { token })
};
