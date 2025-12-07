import api from '$lib/utils/api';
import { auth } from './auth.svelte';
import { quotes } from './quotes.svelte';

export interface TradingIdea {
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
}

export interface TradingIdeaWithPnL extends TradingIdea {
	currentPrice: number | null;
	unrealizedPnl: number | null;
	unrealizedPnlPercent: number | null;
	realizedPnl: number | null;
	realizedPnlPercent: number | null;
}

interface TradingIdeasStats {
	totalIdeas: number;
	openIdeas: number;
	closedIdeas: number;
	targetHitCount: number;
	stoppedOutCount: number;
	winRate: number;
	avgPnlPercent: number;
}

interface TradingIdeasState {
	ideas: TradingIdea[];
	stats: TradingIdeasStats | null;
	isLoading: boolean;
	error: string | null;
	statusFilter: 'all' | 'open' | 'closed' | 'stopped_out' | 'target_hit';
}

function createTradingIdeasStore() {
	let state = $state<TradingIdeasState>({
		ideas: [],
		stats: null,
		isLoading: false,
		error: null,
		statusFilter: 'all'
	});

	// Compute ideas with P&L based on current quotes
	function getIdeasWithPnL(): TradingIdeaWithPnL[] {
		return state.ideas.map((idea) => {
			const quote = quotes.getQuote(idea.ticker);
			const currentPrice = quote?.price ?? null;

			let unrealizedPnl: number | null = null;
			let unrealizedPnlPercent: number | null = null;
			let realizedPnl: number | null = null;
			let realizedPnlPercent: number | null = null;

			if (idea.status === 'open' && idea.entry_price && currentPrice) {
				if (idea.sentiment === 'bullish') {
					unrealizedPnl = currentPrice - idea.entry_price;
				} else if (idea.sentiment === 'bearish') {
					unrealizedPnl = idea.entry_price - currentPrice;
				} else {
					unrealizedPnl = currentPrice - idea.entry_price;
				}
				unrealizedPnlPercent = (unrealizedPnl / idea.entry_price) * 100;
			}

			if (idea.status !== 'open' && idea.entry_price && idea.actual_exit_price) {
				if (idea.sentiment === 'bullish') {
					realizedPnl = idea.actual_exit_price - idea.entry_price;
				} else if (idea.sentiment === 'bearish') {
					realizedPnl = idea.entry_price - idea.actual_exit_price;
				} else {
					realizedPnl = idea.actual_exit_price - idea.entry_price;
				}
				realizedPnlPercent = (realizedPnl / idea.entry_price) * 100;
			}

			return {
				...idea,
				currentPrice,
				unrealizedPnl,
				unrealizedPnlPercent,
				realizedPnl,
				realizedPnlPercent
			};
		});
	}

	// Get filtered ideas based on status
	function getFilteredIdeas(): TradingIdeaWithPnL[] {
		const ideasWithPnL = getIdeasWithPnL();
		if (state.statusFilter === 'all') {
			return ideasWithPnL;
		}
		return ideasWithPnL.filter((idea) => idea.status === state.statusFilter);
	}

	// Subscribe to quotes for all open ideas
	function subscribeToQuotes() {
		const openTickers = state.ideas
			.filter((idea) => idea.status === 'open')
			.map((idea) => idea.ticker);

		const uniqueTickers = [...new Set(openTickers)];
		if (uniqueTickers.length > 0) {
			quotes.subscribeMany(uniqueTickers);
		}
	}

	return {
		get ideas() {
			return getFilteredIdeas();
		},
		get allIdeas() {
			return getIdeasWithPnL();
		},
		get stats() {
			return state.stats;
		},
		get isLoading() {
			return state.isLoading;
		},
		get error() {
			return state.error;
		},
		get statusFilter() {
			return state.statusFilter;
		},

		setStatusFilter(filter: 'all' | 'open' | 'closed' | 'stopped_out' | 'target_hit') {
			state.statusFilter = filter;
		},

		async fetch(status?: string) {
			const token = auth.accessToken;
			if (!token) {
				state.error = 'Not authenticated';
				return;
			}

			state.isLoading = true;
			state.error = null;

			try {
				const response = await api.getTradingIdeas(status, token);

				if (response.success && response.data) {
					state.ideas = response.data;
					subscribeToQuotes();
				} else {
					state.error = response.error?.message || 'Failed to fetch trading ideas';
				}
			} catch (err) {
				state.error = err instanceof Error ? err.message : 'Network error';
			} finally {
				state.isLoading = false;
			}
		},

		async fetchStats() {
			const token = auth.accessToken;
			if (!token) return;

			try {
				const response = await api.getTradingIdeasStats(token);

				if (response.success && response.data) {
					state.stats = response.data;
				}
			} catch (err) {
				console.error('Failed to fetch stats:', err);
			}
		},

		async create(data: {
			ticker: string;
			title?: string;
			thesis: string;
			entryPrice?: number;
			targetPrice?: number;
			stopLoss?: number;
			timeframe?: 'intraday' | 'swing' | 'position' | 'long_term';
			sentiment?: 'bullish' | 'bearish' | 'neutral';
		}) {
			const token = auth.accessToken;
			if (!token) {
				return { success: false, error: 'Not authenticated' };
			}

			state.isLoading = true;

			try {
				const response = await api.createTradingIdea(token, data);

				if (response.success && response.data) {
					// Refetch to get full data
					await this.fetch();
					await this.fetchStats();
					return { success: true, data: response.data };
				}

				return { success: false, error: response.error?.message || 'Failed to create idea' };
			} catch (err) {
				return { success: false, error: err instanceof Error ? err.message : 'Network error' };
			} finally {
				state.isLoading = false;
			}
		},

		async update(
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
		) {
			const token = auth.accessToken;
			if (!token) {
				return { success: false, error: 'Not authenticated' };
			}

			try {
				const response = await api.updateTradingIdea(token, id, data);

				if (response.success && response.data) {
					// Update local state
					const index = state.ideas.findIndex((idea) => idea.id === id);
					if (index !== -1) {
						state.ideas[index] = { ...state.ideas[index], ...response.data };
					}
					return { success: true, data: response.data };
				}

				return { success: false, error: response.error?.message || 'Failed to update idea' };
			} catch (err) {
				return { success: false, error: err instanceof Error ? err.message : 'Network error' };
			}
		},

		async close(
			id: number,
			exitPrice: number,
			status: 'closed' | 'stopped_out' | 'target_hit' = 'closed'
		) {
			const token = auth.accessToken;
			if (!token) {
				return { success: false, error: 'Not authenticated' };
			}

			try {
				const response = await api.closeTradingIdea(token, id, exitPrice, status);

				if (response.success && response.data) {
					// Refetch to get updated data
					await this.fetch();
					await this.fetchStats();
					return { success: true, data: response.data };
				}

				return { success: false, error: response.error?.message || 'Failed to close idea' };
			} catch (err) {
				return { success: false, error: err instanceof Error ? err.message : 'Network error' };
			}
		},

		async delete(id: number) {
			const token = auth.accessToken;
			if (!token) {
				return { success: false, error: 'Not authenticated' };
			}

			try {
				const response = await api.deleteTradingIdea(token, id);

				if (response.success) {
					// Remove from local state
					state.ideas = state.ideas.filter((idea) => idea.id !== id);
					await this.fetchStats();
					return { success: true };
				}

				return { success: false, error: response.error?.message || 'Failed to delete idea' };
			} catch (err) {
				return { success: false, error: err instanceof Error ? err.message : 'Network error' };
			}
		},

		async exportCSV() {
			const token = auth.accessToken;
			if (!token) {
				return { success: false, error: 'Not authenticated' };
			}

			try {
				const blob = await api.exportTradingIdeas(token);
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'trading-ideas.csv';
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
				return { success: true };
			} catch (err) {
				return { success: false, error: err instanceof Error ? err.message : 'Export failed' };
			}
		},

		async exportPDF() {
			const token = auth.accessToken;
			if (!token) {
				return { success: false, error: 'Not authenticated' };
			}

			try {
				const blob = await api.exportTradingIdeasPDF(token);
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'trading-ideas.pdf';
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
				return { success: true };
			} catch (err) {
				return { success: false, error: err instanceof Error ? err.message : 'PDF export failed' };
			}
		},

		clearError() {
			state.error = null;
		}
	};
}

export const tradingIdeas = createTradingIdeasStore();
