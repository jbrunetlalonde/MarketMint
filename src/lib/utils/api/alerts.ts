import { request } from './request';

export const alertsApi = {
	getAlerts: (options?: { unreadOnly?: boolean; limit?: number }, token?: string) => {
		const params = new URLSearchParams();
		if (options?.unreadOnly) params.set('unreadOnly', 'true');
		if (options?.limit) params.set('limit', String(options.limit));
		const queryString = params.toString();
		return request<{
			alerts: Array<{
				id: number;
				ticker: string;
				officialName: string;
				transactionType: string;
				amountDisplay: string;
				createdAt: string;
				readAt: string | null;
				assetDescription: string | null;
				transactionDate: string | null;
				reportedDate: string | null;
				party: string | null;
				title: string | null;
				state: string | null;
				portraitUrl: string | null;
			}>;
			unreadCount: number;
		}>(`/api/alerts${queryString ? `?${queryString}` : ''}`, { token });
	},

	getUnreadAlertCount: (token?: string) =>
		request<{ count: number }>('/api/alerts/count', { token }),

	markAlertRead: (alertId: number, token?: string) =>
		request<{ message: string }>(`/api/alerts/${alertId}/read`, {
			method: 'POST',
			token
		}),

	markAllAlertsRead: (token?: string) =>
		request<{ message: string }>('/api/alerts/read-all', {
			method: 'POST',
			token
		}),

	getIdeaAlerts: (options?: { unreadOnly?: boolean; limit?: number }, token?: string) => {
		const params = new URLSearchParams();
		if (options?.unreadOnly) params.set('unreadOnly', 'true');
		if (options?.limit) params.set('limit', String(options.limit));
		const queryString = params.toString();
		return request<{
			alerts: Array<{
				id: number;
				ideaId: number;
				ticker: string;
				alertType: 'target_hit' | 'stopped_out';
				triggerPrice: number;
				entryPrice: number | null;
				targetPrice: number | null;
				stopLoss: number | null;
				pnlPercent: number | null;
				ideaTitle: string | null;
				createdAt: string;
				readAt: string | null;
			}>;
			unreadCount: number;
		}>(`/api/alerts/ideas${queryString ? `?${queryString}` : ''}`, { token });
	},

	getUnreadIdeaAlertCount: (token?: string) =>
		request<{ count: number }>('/api/alerts/ideas/count', { token }),

	markIdeaAlertRead: (alertId: number, token?: string) =>
		request<{ message: string }>(`/api/alerts/ideas/${alertId}/read`, {
			method: 'POST',
			token
		})
};
