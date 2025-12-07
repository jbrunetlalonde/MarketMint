import { request } from './request';

export const chartsApi = {
	getOHLC: (ticker: string, period = '1y', token?: string) =>
		request<{
			ticker: string;
			period: string;
			count: number;
			ohlc: Array<{
				time: string;
				open: number;
				high: number;
				low: number;
				close: number;
				volume: number;
			}>;
		}>(`/api/charts/${ticker}/ohlc?period=${period}`, { token }),

	getIndicators: (
		ticker: string,
		options: {
			period?: string;
			sma?: string;
			ema?: string;
			rsi?: boolean;
			macd?: boolean;
			bollinger?: boolean;
		} = {},
		token?: string
	) => {
		const params = new URLSearchParams();
		if (options.period) params.set('period', options.period);
		if (options.sma) params.set('sma', options.sma);
		if (options.ema) params.set('ema', options.ema);
		if (options.rsi !== undefined) params.set('rsi', String(options.rsi));
		if (options.macd !== undefined) params.set('macd', String(options.macd));
		if (options.bollinger !== undefined) params.set('bollinger', String(options.bollinger));

		return request<{
			ticker: string;
			period: string;
			count: number;
			indicators: Array<{
				time: string;
				open: number;
				high: number;
				low: number;
				close: number;
				volume: number;
				sma20?: number | null;
				sma50?: number | null;
				sma200?: number | null;
				ema12?: number | null;
				ema26?: number | null;
				rsi?: number | null;
				macd?: number | null;
				macdSignal?: number | null;
				macdHistogram?: number | null;
				bollingerUpper?: number | null;
				bollingerMiddle?: number | null;
				bollingerLower?: number | null;
			}>;
		}>(`/api/charts/${ticker}/indicators?${params.toString()}`, { token });
	},

	getDataFreshness: (ticker: string, token?: string) =>
		request<{
			ticker: string;
			earliestDate: string | null;
			latestDate: string | null;
			recordCount: number;
		}>(`/api/charts/${ticker}/freshness`, { token })
};
