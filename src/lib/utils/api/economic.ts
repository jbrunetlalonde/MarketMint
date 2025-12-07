import { request } from './request';

export const economicApi = {
	getEconomicIndicators: (token?: string) =>
		request<Record<string, {
			seriesId: string;
			name: string;
			unit: string;
			frequency: string;
			latest: { date: string; value: number } | null;
			change: number | null;
			changePercent: number | null;
			history: Array<{ date: string; value: number }>;
		}>>('/api/economic/indicators', { token }),

	getEconomicDashboard: (token?: string) =>
		request<{
			fedFundsRate: { latest: { date: string; value: number } | null } | null;
			treasury10Y: { latest: { date: string; value: number } | null } | null;
			treasury2Y: { latest: { date: string; value: number } | null } | null;
			yieldSpread: { latest: { date: string; value: number } | null } | null;
			unemployment: { latest: { date: string; value: number } | null } | null;
			cpi: { latest: { date: string; value: number } | null } | null;
			vix: { latest: { date: string; value: number } | null } | null;
			oilPrice: { latest: { date: string; value: number } | null } | null;
			mortgageRate: { latest: { date: string; value: number } | null } | null;
			gdp: { latest: { date: string; value: number } | null } | null;
		}>('/api/economic/dashboard', { token }),

	getEconomicSeries: (seriesId: string, limit?: number, token?: string) =>
		request<{
			seriesId: string;
			name: string;
			unit: string;
			frequency: string;
			latest: { date: string; value: number } | null;
			change: number | null;
			changePercent: number | null;
			history: Array<{ date: string; value: number }>;
		}>(`/api/economic/series/${seriesId}${limit ? `?limit=${limit}` : ''}`, { token }),

	getAvailableEconomicSeries: (token?: string) =>
		request<
			Array<{
				seriesId: string;
				name: string;
				unit: string;
				frequency: string;
			}>
		>('/api/economic/available', { token })
};
