import { request, API_BASE } from './request';

export const ideasApi = {
	getTradingIdeas: (status?: string, token?: string) =>
		request<
			Array<{
				id: number;
				user_id: string;
				ticker: string;
				title: string | null;
				thesis: string;
				entry_price: number | null;
				target_price: number | null;
				stop_loss: number | null;
				timeframe: 'intraday' | 'swing' | 'position' | 'long_term' | null;
				sentiment: 'bullish' | 'bearish' | 'neutral' | null;
				status: 'open' | 'closed' | 'stopped_out' | 'target_hit';
				actual_exit_price: number | null;
				closed_at: string | null;
				created_at: string;
				updated_at: string;
			}>
		>(`/api/ideas${status ? `?status=${status}` : ''}`, { token }),

	getTradingIdea: (id: number, token: string) =>
		request<{
			id: number;
			user_id: string;
			ticker: string;
			title: string | null;
			thesis: string;
			entry_price: number | null;
			target_price: number | null;
			stop_loss: number | null;
			timeframe: 'intraday' | 'swing' | 'position' | 'long_term' | null;
			sentiment: 'bullish' | 'bearish' | 'neutral' | null;
			status: 'open' | 'closed' | 'stopped_out' | 'target_hit';
			actual_exit_price: number | null;
			closed_at: string | null;
			created_at: string;
			updated_at: string;
		}>(`/api/ideas/${id}`, { token }),

	createTradingIdea: (
		token: string,
		data: {
			ticker: string;
			title?: string;
			thesis: string;
			entryPrice?: number;
			targetPrice?: number;
			stopLoss?: number;
			timeframe?: 'intraday' | 'swing' | 'position' | 'long_term';
			sentiment?: 'bullish' | 'bearish' | 'neutral';
		}
	) =>
		request<{
			id: number;
			ticker: string;
			title: string | null;
			thesis: string;
			entry_price: number | null;
			target_price: number | null;
			stop_loss: number | null;
			timeframe: string | null;
			sentiment: string | null;
			status: string;
			created_at: string;
		}>('/api/ideas', {
			method: 'POST',
			token,
			body: JSON.stringify(data)
		}),

	updateTradingIdea: (
		token: string,
		id: number,
		data: {
			title?: string;
			thesis?: string;
			entryPrice?: number;
			targetPrice?: number;
			stopLoss?: number;
			timeframe?: 'intraday' | 'swing' | 'position' | 'long_term';
			sentiment?: 'bullish' | 'bearish' | 'neutral';
		}
	) =>
		request<{
			id: number;
			ticker: string;
			thesis: string;
			status: string;
			updated_at: string;
		}>(`/api/ideas/${id}`, {
			method: 'PUT',
			token,
			body: JSON.stringify(data)
		}),

	closeTradingIdea: (
		token: string,
		id: number,
		exitPrice: number,
		status: 'closed' | 'stopped_out' | 'target_hit' = 'closed'
	) =>
		request<{
			id: number;
			ticker: string;
			status: string;
			actual_exit_price: number;
			closed_at: string;
		}>(`/api/ideas/${id}/close`, {
			method: 'POST',
			token,
			body: JSON.stringify({ exitPrice, status })
		}),

	deleteTradingIdea: (token: string, id: number) =>
		request<{ message: string }>(`/api/ideas/${id}`, {
			method: 'DELETE',
			token
		}),

	getTradingIdeasStats: (token: string) =>
		request<{
			totalIdeas: number;
			openIdeas: number;
			closedIdeas: number;
			targetHitCount: number;
			stoppedOutCount: number;
			winRate: number;
			avgPnlPercent: number;
		}>('/api/ideas/stats', { token }),

	exportTradingIdeas: async (token: string): Promise<Blob> => {
		const response = await fetch(`${API_BASE}/api/ideas/export`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		return response.blob();
	},

	exportTradingIdeasPDF: async (token: string): Promise<Blob> => {
		const response = await fetch(`${API_BASE}/api/ideas/export/pdf`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		return response.blob();
	}
};
