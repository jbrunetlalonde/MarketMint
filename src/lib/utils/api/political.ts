import { request } from './request';

export const politicalApi = {
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

	getPoliticalOfficial: (name: string, token?: string) =>
		request<{
			id: string;
			name: string;
			title: string | null;
			party: string | null;
			state: string | null;
			district: string | null;
			portraitUrl: string | null;
			chamber: string;
			recentTrades: Array<{
				id: number;
				officialName: string;
				ticker: string;
				assetDescription: string | null;
				transactionType: string;
				transactionDate: string;
				reportedDate: string;
				amountDisplay: string;
				party: string | null;
				title: string | null;
				state: string | null;
				chamber: string;
			}>;
		}>(`/api/political/officials/${encodeURIComponent(name)}`, { token }),

	getSenateStats: (token?: string) =>
		request<{
			totalTrades: number;
			buyCount: number;
			sellCount: number;
			uniqueTraders: number;
			uniqueStocks: number;
			topTraders: Array<{ name: string; count: number }>;
			topStocks: Array<{ ticker: string; count: number }>;
		}>('/api/political/senate/stats', { token }),

	getHouseStats: (token?: string) =>
		request<{
			totalTrades: number;
			buyCount: number;
			sellCount: number;
			uniqueTraders: number;
			uniqueStocks: number;
			topTraders: Array<{ name: string; count: number }>;
			topStocks: Array<{ ticker: string; count: number }>;
		}>('/api/political/house/stats', { token }),

	getOfficialStats: (name: string, token?: string) =>
		request<{
			totalTrades: number;
			buyCount: number;
			sellCount: number;
			uniqueStocks: number;
			topStocks: Array<{ ticker: string; count: number }>;
			avgReportingDelay: number | null;
			latestTrade: string | null;
		}>(`/api/political/officials/${encodeURIComponent(name)}/stats`, { token })
};
