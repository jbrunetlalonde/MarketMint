import { request } from './request';

export const searchApi = {
	searchSymbols: (query: string, limit = 8) =>
		request<Array<{ symbol: string; name: string; exchange: string }>>(
			`/api/search/symbols?q=${encodeURIComponent(query)}&limit=${limit}`
		)
};
