import { request } from './request';

export const financialsApi = {
	getFinancials: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			companyName: string;
			sector: string;
			industry: string;
			description?: string;
			ceo?: string;
			employees?: number;
			website?: string;
			logo?: string;
			peRatio?: number;
			pbRatio?: number;
			debtToEquity?: number;
			roe?: number;
			dividendYield?: number;
			isMock?: boolean;
		}>(`/api/financials/${ticker}`, { token }),

	getProfile: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			name: string;
			exchange?: string;
			industry?: string;
			sector?: string;
			website?: string;
			description?: string;
			ceo?: string;
			employees?: number;
			headquarters?: string;
			image?: string;
		}>(`/api/financials/${ticker}/profile`, { token }),

	getIncomeStatement: (ticker: string, period = 'annual', limit = 5, token?: string) =>
		request<
			Array<{
				date: string;
				period: string;
				revenue: number;
				netIncome: number;
				grossProfit: number;
				operatingIncome: number;
				eps: number;
			}>
		>(`/api/financials/${ticker}/income?period=${period}&limit=${limit}`, { token }),

	getBalanceSheet: (ticker: string, period = 'annual', limit = 5, token?: string) =>
		request<
			Array<{
				date: string;
				period: string;
				cashAndCashEquivalents: number;
				totalAssets: number;
				totalLiabilities: number;
				totalEquity: number;
				totalDebt: number;
				netDebt: number;
			}>
		>(`/api/financials/${ticker}/balance?period=${period}&limit=${limit}`, { token }),

	getCashFlow: (ticker: string, period = 'annual', limit = 5, token?: string) =>
		request<
			Array<{
				date: string;
				period: string;
				netIncome: number;
				operatingCashFlow: number;
				investingCashFlow: number;
				financingCashFlow: number;
				freeCashFlow: number;
				capitalExpenditure: number;
			}>
		>(`/api/financials/${ticker}/cashflow?period=${period}&limit=${limit}`, { token }),

	getRevenueSegments: (ticker: string, period = 'annual', token?: string) =>
		request<
			Array<{
				date: string;
				segments: Array<{
					name: string;
					revenue: number;
				}>;
			}>
		>(`/api/financials/${ticker}/segments?period=${period}`, { token }),

	getInstitutionalHolders: (ticker: string, token?: string) =>
		request<
			Array<{
				holder: string;
				shares: number;
				dateReported: string;
				change: number;
				changePercentage: number;
			}>
		>(`/api/financials/${ticker}/institutional`, { token }),

	getHistoricalPrices: (ticker: string, period = '1y', token?: string) =>
		request<{
			ticker: string;
			period: string;
			history: Array<{ date: string; close: number }>;
		}>(`/api/financials/${ticker}/history?period=${period}`, { token }),

	getExecutives: (ticker: string, token?: string) =>
		request<
			Array<{
				name: string;
				title: string;
				pay: number | null;
				currencyPay: string;
				gender: string;
				yearBorn: number;
				titleSince: number;
			}>
		>(`/api/financials/${ticker}/executives`, { token }),

	getRating: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			date: string;
			rating: string;
			ratingScore: number;
			ratingRecommendation: string;
		}>(`/api/financials/${ticker}/rating`, { token }),

	getDCF: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			date: string;
			dcf: number;
			stockPrice: number;
		}>(`/api/financials/${ticker}/dcf`, { token }),

	getPriceTarget: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			targetHigh: number;
			targetLow: number;
			targetConsensus: number;
			targetMedian: number;
		}>(`/api/financials/${ticker}/price-target`, { token }),

	getPeers: (ticker: string, token?: string) =>
		request<string[]>(`/api/financials/${ticker}/peers`, { token }),

	getDividends: (ticker: string, token?: string) =>
		request<
			Array<{
				date: string;
				dividend: number;
				paymentDate: string;
			}>
		>(`/api/financials/${ticker}/dividends`, { token }),

	getSplits: (ticker: string, token?: string) =>
		request<
			Array<{
				date: string;
				label: string;
				numerator: number;
				denominator: number;
			}>
		>(`/api/financials/${ticker}/splits`, { token }),

	getFullFinancials: (ticker: string, token?: string) =>
		request<{
			profile: {
				ticker: string;
				name: string;
				sector: string;
				industry: string;
				description: string;
				ceo: string;
				employees: number;
				website: string;
				ipoDate: string;
				image: string;
			} | null;
			executives: Array<{
				name: string;
				title: string;
				pay: number | null;
			}>;
			metrics: {
				peRatio: number;
				pbRatio: number;
				debtToEquity: number;
				roe: number;
				dividendYield: number;
			} | null;
			rating: {
				rating: string;
				ratingScore: number;
				ratingRecommendation: string;
			} | null;
			dcf: {
				dcf: number;
				stockPrice: number;
			} | null;
			priceTarget: {
				targetHigh: number;
				targetLow: number;
				targetConsensus: number;
			} | null;
			peers: string[];
		}>(`/api/financials/${ticker}/full`, { token }),

	getEarningsCalendar: (days = 7) =>
		request<
			Array<{
				symbol: string;
				date: string;
				time: string;
				epsEstimate: number | null;
				revenue: number | null;
				revenueEstimate: number | null;
			}>
		>(`/api/financials/earnings/calendar?days=${days}`),

	getEarningsHistory: (ticker: string, limit = 8, token?: string) =>
		request<
			Array<{
				date: string;
				symbol: string;
				actualEarningsResult: number | null;
				estimatedEarning: number | null;
				revenue: number | null;
				revenueEstimated: number | null;
				surprisePercent: number | null;
				revenueSurprisePercent: number | null;
			}>
		>(`/api/financials/${ticker}/earnings-history?limit=${limit}`, { token }),

	getSecFilings: (ticker: string, limit = 20, token?: string) =>
		request<
			Array<{
				symbol: string;
				cik: string;
				formType: string;
				filingDate: string;
				acceptedDate: string;
				link: string;
				finalLink: string;
			}>
		>(`/api/financials/${ticker}/sec-filings?limit=${limit}`, { token }),

	getAnalystGrades: (ticker: string, limit = 20, token?: string) =>
		request<
			Array<{
				symbol: string;
				publishedDate: string;
				gradingCompany: string;
				newGrade: string;
				previousGrade: string;
				action: string;
			}>
		>(`/api/financials/${ticker}/analyst-grades?limit=${limit}`, { token }),

	getStockNews: (ticker: string, limit = 10, token?: string) =>
		request<
			Array<{
				title: string;
				url: string;
				publishedDate: string;
				site: string;
				text?: string;
				image?: string;
			}>
		>(`/api/financials/${ticker}/news?limit=${limit}`, { token }),

	getInsiderTrades: (ticker: string, limit = 20, token?: string) =>
		request<
			Array<{
				filingDate: string;
				transactionDate: string;
				reportingName: string;
				transactionType: string;
				securitiesTransacted: number;
				price: number | null;
				securityName: string;
				typeOfOwner: string;
			}>
		>(`/api/financials/${ticker}/insider-trades?limit=${limit}`, { token }),

	getKeyMetrics: (ticker: string, token?: string) =>
		request<{
			peRatio?: number | null;
			pbRatio?: number | null;
			debtToEquity?: number | null;
			currentRatio?: number | null;
			roe?: number | null;
			roa?: number | null;
			dividendYield?: number | null;
			grossProfitMargin?: number | null;
			operatingProfitMargin?: number | null;
			netProfitMargin?: number | null;
		}>(`/api/financials/${ticker}/key-metrics`, { token }),

	getRevenueSegmentsV2: (ticker: string, token?: string) =>
		request<{
			productSegments: Array<{ segment: string; revenue: number; year: number }>;
			geographicSegments: Array<{ segment: string; revenue: number; year: number }>;
		}>(`/api/financials/${ticker}/revenue-segments`, { token })
};
