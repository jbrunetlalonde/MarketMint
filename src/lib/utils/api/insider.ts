import { request } from './request';

export const insiderApi = {
	getInsiderTrades: (options?: { ticker?: string; transactionType?: string; limit?: number; page?: number }, token?: string) => {
		const params = new URLSearchParams();
		if (options?.ticker) params.set('ticker', options.ticker);
		if (options?.transactionType) params.set('transactionType', options.transactionType);
		if (options?.limit) params.set('limit', String(options.limit));
		if (options?.page) params.set('page', String(options.page));
		const queryString = params.toString();
		return request<
			Array<{
				id: number;
				symbol: string;
				companyName: string;
				reporterName: string;
				reporterTitle: string;
				transactionType: string;
				transactionDate: string;
				filingDate: string;
				sharesTransacted: number;
				sharePrice: number;
				totalValue: number;
				sharesOwned: number;
				isMock?: boolean;
			}>
		>(`/api/insider/trades${queryString ? `?${queryString}` : ''}`, { token });
	},

	getInsiderTradesByTicker: (ticker: string, limit?: number, token?: string) =>
		request<
			Array<{
				id: number;
				symbol: string;
				companyName: string;
				reporterName: string;
				reporterTitle: string;
				transactionType: string;
				transactionDate: string;
				filingDate: string;
				sharesTransacted: number;
				sharePrice: number;
				totalValue: number;
				sharesOwned: number;
			}>
		>(`/api/insider/trades/${ticker}${limit ? `?limit=${limit}` : ''}`, { token }),

	getInsiderStats: (token?: string) =>
		request<{
			totalTrades: number;
			purchaseCount: number;
			saleCount: number;
			totalValue: number;
			topBuyers: Array<{ name: string; value: number }>;
			topSellers: Array<{ name: string; value: number }>;
		}>('/api/insider/stats', { token })
};
