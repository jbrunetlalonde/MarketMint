import { request } from './request';

export const portfolioApi = {
	getPortfolio: (token: string) =>
		request<
			Array<{
				id: string;
				ticker: string;
				shares: number;
				costBasis: number;
				purchaseDate: string | null;
				notes: string | null;
				createdAt: string;
				updatedAt: string;
			}>
		>('/api/portfolio', { token }),

	getPortfolioSummary: (token: string) =>
		request<
			Array<{
				ticker: string;
				totalShares: number;
				avgCostBasis: number | null;
			}>
		>('/api/portfolio/summary', { token }),

	addPortfolioHolding: (
		token: string,
		data: {
			ticker: string;
			shares: number;
			costBasis: number;
			purchaseDate?: string;
			notes?: string;
		}
	) =>
		request<{
			id: string;
			ticker: string;
			shares: number;
			costBasis: number;
			purchaseDate: string | null;
			notes: string | null;
			createdAt: string;
		}>('/api/portfolio', {
			method: 'POST',
			token,
			body: JSON.stringify(data)
		}),

	updatePortfolioHolding: (
		token: string,
		id: string,
		data: {
			shares?: number;
			costBasis?: number;
			purchaseDate?: string;
			notes?: string;
		}
	) =>
		request<{
			id: string;
			ticker: string;
			shares: number;
			costBasis: number;
			purchaseDate: string | null;
			notes: string | null;
			updatedAt: string;
		}>(`/api/portfolio/${id}`, {
			method: 'PUT',
			token,
			body: JSON.stringify(data)
		}),

	deletePortfolioHolding: (token: string, id: string) =>
		request<{ message: string }>(`/api/portfolio/${id}`, {
			method: 'DELETE',
			token
		})
};
