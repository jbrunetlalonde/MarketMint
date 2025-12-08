import { request } from './request';

export interface ScreenerStock {
	symbol: string;
	companyName: string;
	marketCap: number;
	sector: string;
	industry: string;
	beta: number;
	price: number;
	lastAnnualDividend: number;
	volume: number;
	exchange: string;
	country: string;
	isEtf: boolean;
	isFund: boolean;
	isActivelyTrading: boolean;
}

export interface ScreenerFilters {
	sector?: string;
	industry?: string;
	exchange?: string;
	marketCapMin?: number;
	marketCapMax?: number;
	priceMin?: number;
	priceMax?: number;
	volumeMin?: number;
	dividendMin?: number;
	betaMin?: number;
	betaMax?: number;
	isEtf?: boolean;
	limit?: number;
}

export const screenerApi = {
	async screenStocks(filters: ScreenerFilters = {}) {
		const params = new URLSearchParams();

		if (filters.sector) params.append('sector', filters.sector);
		if (filters.industry) params.append('industry', filters.industry);
		if (filters.exchange) params.append('exchange', filters.exchange);
		if (filters.marketCapMin) params.append('marketCapMin', String(filters.marketCapMin));
		if (filters.marketCapMax) params.append('marketCapMax', String(filters.marketCapMax));
		if (filters.priceMin) params.append('priceMin', String(filters.priceMin));
		if (filters.priceMax) params.append('priceMax', String(filters.priceMax));
		if (filters.volumeMin) params.append('volumeMin', String(filters.volumeMin));
		if (filters.dividendMin) params.append('dividendMin', String(filters.dividendMin));
		if (filters.betaMin) params.append('betaMin', String(filters.betaMin));
		if (filters.betaMax) params.append('betaMax', String(filters.betaMax));
		if (filters.isEtf !== undefined) params.append('isEtf', String(filters.isEtf));
		if (filters.limit) params.append('limit', String(filters.limit));

		const queryString = params.toString();
		const endpoint = queryString ? `/api/screener?${queryString}` : '/api/screener';

		return request<ScreenerStock[]>(endpoint);
	},

	async getSectors() {
		return request<string[]>('/api/screener/sectors');
	},

	async getExchanges() {
		return request<string[]>('/api/screener/exchanges');
	}
};
