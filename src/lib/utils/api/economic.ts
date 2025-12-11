import { request } from './request';

export const economicApi = {
	getEconomicIndicators: (token?: string) =>
		request<{
			treasury: {
				date: string;
				month3: number | null;
				year2: number | null;
				year10: number | null;
				year30: number | null;
			} | null;
			gdp: { date: string; value: number } | null;
			cpi: { date: string; value: number } | null;
			unemployment: { date: string; value: number } | null;
		}>('/api/economic/indicators', { token }),

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

	getTreasuryRates: (token?: string) =>
		request<{
			date: string;
			month1: number | null;
			month3: number | null;
			year2: number | null;
			year5: number | null;
			year10: number | null;
			year30: number | null;
		}>('/api/economic/treasury', { token }),

	getEconomicCalendar: (from?: string, to?: string, token?: string) => {
		const params = new URLSearchParams();
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		return request<
			Array<{
				date: string;
				event: string;
				country: string;
				actual: number | null;
				previous: number | null;
				estimate: number | null;
				impact: string;
			}>
		>(`/api/economic/calendar?${params.toString()}`, { token });
	},

	getIPOCalendar: (from?: string, to?: string, token?: string) => {
		const params = new URLSearchParams();
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		return request<
			Array<{
				symbol: string;
				company: string;
				exchange: string;
				date: string;
				priceRange: string;
				shares: number;
				expectedPrice: number;
				marketCap: number;
			}>
		>(`/api/economic/ipo-calendar?${params.toString()}`, { token });
	},

	getDividendCalendar: (from?: string, to?: string, token?: string) => {
		const params = new URLSearchParams();
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		return request<
			Array<{
				symbol: string;
				date: string;
				dividend: number;
				adjDividend: number;
				recordDate: string;
				paymentDate: string;
				declarationDate: string;
			}>
		>(`/api/economic/dividend-calendar?${params.toString()}`, { token });
	},

	getSplitCalendar: (from?: string, to?: string, token?: string) => {
		const params = new URLSearchParams();
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		return request<
			Array<{
				symbol: string;
				date: string;
				label: string;
				numerator: number;
				denominator: number;
			}>
		>(`/api/economic/split-calendar?${params.toString()}`, { token });
	},

	getEarningsCalendar: (from?: string, to?: string, token?: string) => {
		const params = new URLSearchParams();
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		return request<
			Array<{
				symbol: string;
				date: string;
				time: string;
				epsEstimate: number | null;
				revenue: number | null;
				revenueEstimate: number | null;
			}>
		>(`/api/economic/earnings-calendar?${params.toString()}`, { token });
	},

	getIPOProspectus: (from?: string, to?: string, token?: string) => {
		const params = new URLSearchParams();
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		return request<
			Array<{
				symbol: string;
				cik: string;
				form: string;
				filingDate: string;
				acceptedDate: string;
				effectivenessDate: string;
				url: string;
				publicOfferingPrice: number | null;
				discountOrCommission: number | null;
				proceedsBeforeExpenses: number | null;
				sharesOffered: number | null;
				ipoDate: string;
				company: string;
			}>
		>(`/api/economic/ipo-prospectus?${params.toString()}`, { token });
	},

	getIPODisclosure: (from?: string, to?: string, token?: string) => {
		const params = new URLSearchParams();
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		return request<
			Array<{
				symbol: string;
				cik: string;
				form: string;
				filingDate: string;
				acceptedDate: string;
				effectivenessDate: string;
				url: string;
				company: string;
				exchange: string;
				ipoDate: string;
			}>
		>(`/api/economic/ipo-disclosure?${params.toString()}`, { token });
	}
};
