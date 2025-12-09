import { request } from './request';

interface QuoteResponse {
	ticker: string;
	name?: string;
	price: number;
	change: number;
	changePercent: number;
	volume?: number;
	marketCap?: number;
	dayHigh?: number;
	dayLow?: number;
	open?: number;
	previousClose?: number;
	avgVolume?: number;
	peRatio?: number;
	eps?: number;
	fiftyTwoWeekHigh?: number;
	fiftyTwoWeekLow?: number;
	exchange?: string;
	sharesOutstanding?: number;
	dividendYield?: number;
}

export const quotesApi = {
	getQuote: (ticker: string, token?: string) =>
		request<QuoteResponse>(`/api/quotes/${ticker}`, { token }),

	getBulkQuotes: (tickers: string[], token?: string) =>
		request<QuoteResponse[]>(`/api/quotes?tickers=${tickers.join(',')}`, { token }),

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
		}>(`/api/quotes/movers?limit=${limit}`, { token }),

	getSectorPerformance: (token?: string) =>
		request<Array<{ sector: string; changePercent: number }>>(
			'/api/quotes/sector-performance',
			{ token }
		),

	getMarketStatus: (token?: string) =>
		request<{
			isOpen: boolean | null;
			timestamp: string;
		}>('/api/quotes/market-status', { token })
};
