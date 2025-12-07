import { request } from './request';

export const watchlistApi = {
	getWatchlist: (token: string) =>
		request<Array<{ id: string; ticker: string; notes: string; added_at: string }>>(
			'/api/watchlist',
			{ token }
		),

	addToWatchlist: (token: string, ticker: string, notes?: string) =>
		request('/api/watchlist/add', {
			method: 'POST',
			token,
			body: JSON.stringify({ ticker, notes })
		}),

	removeFromWatchlist: (token: string, ticker: string) =>
		request(`/api/watchlist/${ticker}`, {
			method: 'DELETE',
			token
		}),

	updateWatchlistNotes: (token: string, ticker: string, notes: string) =>
		request<{ id: string; ticker: string; notes: string; added_at: string }>(
			`/api/watchlist/${ticker}`,
			{
				method: 'PUT',
				token,
				body: JSON.stringify({ notes })
			}
		)
};
