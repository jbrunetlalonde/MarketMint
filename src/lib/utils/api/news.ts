import { request } from './request';

export const newsApi = {
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
		}>('/api/news/summary', { token })
};
