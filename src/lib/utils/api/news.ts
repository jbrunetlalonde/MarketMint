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
		}>('/api/news/summary', { token }),

	getArticle: (id: number, token?: string) =>
		request<{
			article: ExtractedArticle;
			related: RelatedArticle[];
			extractionStatus: 'success' | 'failed' | 'blocked';
		}>(`/api/news/article/${id}`, { token }),

	getArticleByUrl: (url: string, ticker?: string, token?: string) =>
		request<{
			article: ExtractedArticle;
			related: RelatedArticle[];
			extractionStatus: 'success' | 'failed' | 'blocked';
		}>(`/api/news/article/url?url=${encodeURIComponent(url)}${ticker ? `&ticker=${ticker}` : ''}`, {
			token
		}),

	extractArticle: (
		data: { url: string; ticker?: string; title?: string; content?: string },
		token?: string
	) =>
		request<{
			article: ExtractedArticle;
			related: RelatedArticle[];
			extractionStatus: 'success' | 'failed' | 'blocked';
		}>('/api/news/extract', {
			method: 'POST',
			body: JSON.stringify(data),
			token
		}),

	getRelatedArticles: (id: number, limit?: number, token?: string) =>
		request<RelatedArticle[]>(
			`/api/news/article/${id}/related${limit ? `?limit=${limit}` : ''}`,
			{ token }
		)
};

export interface ExtractedArticle {
	id: number;
	originalUrl: string;
	title: string;
	content: string | null;
	excerpt: string | null;
	author: string | null;
	siteName: string | null;
	publishedDate: string | null;
	wordCount: number;
	readingTimeMinutes: number;
	ticker: string | null;
	keywords: string[];
	extractionStatus: 'success' | 'failed' | 'blocked' | 'pending';
	extractionError: string | null;
	extractedAt: string;
}

export interface RelatedArticle {
	id: number;
	url: string;
	title: string;
	excerpt: string | null;
	siteName: string | null;
	ticker: string | null;
	readingTime: number;
	relevanceScore: number;
}
