import type { EChartsOption } from 'echarts';

export interface ThemeColors {
	background: string;
	text: string;
	textMuted: string;
	grid: string;
	border: string;
	upColor: string;
	downColor: string;
	volumeUp: string;
	volumeDown: string;
}

export const lightTheme: ThemeColors = {
	background: '#ffffff',
	text: '#1a1a1a',
	textMuted: '#666666',
	grid: '#f0f0f0',
	border: '#cccccc',
	upColor: '#0d7a3e',
	downColor: '#c41e3a',
	volumeUp: 'rgba(13, 122, 62, 0.4)',
	volumeDown: 'rgba(196, 30, 58, 0.4)'
};

export const darkTheme: ThemeColors = {
	background: '#1e1e1e',
	text: '#e8e8e0',
	textMuted: '#a0a0a0',
	grid: '#333333',
	border: '#525252',
	upColor: '#4ade80',
	downColor: '#f87171',
	volumeUp: 'rgba(74, 222, 128, 0.4)',
	volumeDown: 'rgba(248, 113, 113, 0.4)'
};

export function getTheme(isDark: boolean): ThemeColors {
	return isDark ? darkTheme : lightTheme;
}

export interface OHLCData {
	time: string;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

export interface IndicatorData extends OHLCData {
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
}

export function buildCandlestickOptions(
	data: OHLCData[] | IndicatorData[],
	colors: ThemeColors,
	options?: {
		showVolume?: boolean;
		showSMA?: boolean;
		showEMA?: boolean;
		showBollinger?: boolean;
	}
): EChartsOption {
	const { showVolume = true, showSMA = false, showEMA = false, showBollinger = false } = options || {};

	const dates = data.map((d) => d.time);
	const ohlcData = data.map((d) => [d.open, d.close, d.low, d.high]);
	const volumeData = data.map((d, i) => ({
		value: d.volume,
		itemStyle: {
			color: d.close >= d.open ? colors.volumeUp : colors.volumeDown
		}
	}));

	const series: EChartsOption['series'] = [
		{
			name: 'Price',
			type: 'candlestick',
			data: ohlcData,
			itemStyle: {
				color: colors.upColor,
				color0: colors.downColor,
				borderColor: colors.upColor,
				borderColor0: colors.downColor
			}
		}
	];

	if (showVolume) {
		series.push({
			name: 'Volume',
			type: 'bar',
			xAxisIndex: 1,
			yAxisIndex: 1,
			data: volumeData,
			barWidth: '60%'
		});
	}

	if (showSMA) {
		const indicatorData = data as IndicatorData[];
		if (indicatorData[0]?.sma20 !== undefined) {
			series.push({
				name: 'SMA 20',
				type: 'line',
				data: indicatorData.map((d) => d.sma20 ?? null),
				smooth: true,
				lineStyle: { width: 1, color: '#ff9800' },
				symbol: 'none'
			});
		}
		if (indicatorData[0]?.sma50 !== undefined) {
			series.push({
				name: 'SMA 50',
				type: 'line',
				data: indicatorData.map((d) => d.sma50 ?? null),
				smooth: true,
				lineStyle: { width: 1, color: '#2196f3' },
				symbol: 'none'
			});
		}
		if (indicatorData[0]?.sma200 !== undefined) {
			series.push({
				name: 'SMA 200',
				type: 'line',
				data: indicatorData.map((d) => d.sma200 ?? null),
				smooth: true,
				lineStyle: { width: 1, color: '#9c27b0' },
				symbol: 'none'
			});
		}
	}

	if (showEMA) {
		const indicatorData = data as IndicatorData[];
		if (indicatorData[0]?.ema12 !== undefined) {
			series.push({
				name: 'EMA 12',
				type: 'line',
				data: indicatorData.map((d) => d.ema12 ?? null),
				smooth: true,
				lineStyle: { width: 1, color: '#4caf50' },
				symbol: 'none'
			});
		}
		if (indicatorData[0]?.ema26 !== undefined) {
			series.push({
				name: 'EMA 26',
				type: 'line',
				data: indicatorData.map((d) => d.ema26 ?? null),
				smooth: true,
				lineStyle: { width: 1, color: '#f44336' },
				symbol: 'none'
			});
		}
	}

	if (showBollinger) {
		const indicatorData = data as IndicatorData[];
		if (indicatorData[0]?.bollingerUpper !== undefined) {
			series.push(
				{
					name: 'BB Upper',
					type: 'line',
					data: indicatorData.map((d) => d.bollingerUpper ?? null),
					lineStyle: { width: 1, color: '#607d8b', type: 'dashed' },
					symbol: 'none'
				},
				{
					name: 'BB Middle',
					type: 'line',
					data: indicatorData.map((d) => d.bollingerMiddle ?? null),
					lineStyle: { width: 1, color: '#607d8b' },
					symbol: 'none'
				},
				{
					name: 'BB Lower',
					type: 'line',
					data: indicatorData.map((d) => d.bollingerLower ?? null),
					lineStyle: { width: 1, color: '#607d8b', type: 'dashed' },
					symbol: 'none'
				}
			);
		}
	}

	const gridConfig = showVolume
		? [
				{ left: '8%', right: '4%', top: '8%', height: '58%' },
				{ left: '8%', right: '4%', top: '72%', height: '18%' }
			]
		: [{ left: '8%', right: '4%', top: '8%', bottom: '15%' }];

	const xAxisConfig = showVolume
		? [
				{
					type: 'category' as const,
					data: dates,
					boundaryGap: true,
					axisLine: { lineStyle: { color: colors.border } },
					axisLabel: { color: colors.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' },
					splitLine: { show: false }
				},
				{
					type: 'category' as const,
					gridIndex: 1,
					data: dates,
					boundaryGap: true,
					axisLine: { lineStyle: { color: colors.border } },
					axisLabel: { show: false },
					axisTick: { show: false },
					splitLine: { show: false }
				}
			]
		: [
				{
					type: 'category' as const,
					data: dates,
					boundaryGap: true,
					axisLine: { lineStyle: { color: colors.border } },
					axisLabel: { color: colors.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' },
					splitLine: { show: false }
				}
			];

	const yAxisConfig = showVolume
		? [
				{
					scale: true,
					splitArea: { show: false },
					splitLine: { lineStyle: { color: colors.grid } },
					axisLine: { lineStyle: { color: colors.border } },
					axisLabel: {
						color: colors.textMuted,
						fontSize: 10,
						fontFamily: 'IBM Plex Mono',
						formatter: (value: number) => `$${value.toFixed(0)}`
					}
				},
				{
					scale: true,
					gridIndex: 1,
					splitNumber: 2,
					axisLabel: {
						show: true,
						color: colors.textMuted,
						fontSize: 9,
						fontFamily: 'IBM Plex Mono',
						formatter: (value: number) => {
							if (value >= 1e9) return `${(value / 1e9).toFixed(0)}B`;
							if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
							if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
							return value.toString();
						}
					},
					axisLine: { show: false },
					axisTick: { show: false },
					splitLine: { show: false }
				}
			]
		: [
				{
					scale: true,
					splitArea: { show: false },
					splitLine: { lineStyle: { color: colors.grid } },
					axisLine: { lineStyle: { color: colors.border } },
					axisLabel: {
						color: colors.textMuted,
						fontSize: 10,
						fontFamily: 'IBM Plex Mono',
						formatter: (value: number) => `$${value.toFixed(0)}`
					}
				}
			];

	return {
		backgroundColor: colors.background,
		animation: true,
		animationDuration: 300,
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'cross',
				crossStyle: { color: colors.textMuted }
			},
			backgroundColor: colors.background,
			borderColor: colors.border,
			textStyle: {
				color: colors.text,
				fontSize: 11,
				fontFamily: 'IBM Plex Mono'
			},
			formatter: (params: any) => {
				if (!Array.isArray(params) || params.length === 0) return '';
				const date = params[0].axisValue;
				let html = `<div style="font-weight:600;margin-bottom:4px">${date}</div>`;
				const candleData = params.find((p: any) => p.seriesName === 'Price');
				if (candleData) {
					const [open, close, low, high] = candleData.data;
					const change = close - open;
					const changePercent = ((change / open) * 100).toFixed(2);
					const color = change >= 0 ? colors.upColor : colors.downColor;
					html += `<div>O: $${open.toFixed(2)} H: $${high.toFixed(2)}</div>`;
					html += `<div>L: $${low.toFixed(2)} C: <span style="color:${color};font-weight:600">$${close.toFixed(2)}</span></div>`;
					html += `<div style="color:${color}">${change >= 0 ? '+' : ''}${change.toFixed(2)} (${change >= 0 ? '+' : ''}${changePercent}%)</div>`;
				}
				const volumeData = params.find((p: any) => p.seriesName === 'Volume');
				if (volumeData) {
					const vol = volumeData.data.value || volumeData.data;
					html += `<div style="margin-top:4px">Vol: ${formatVolume(vol)}</div>`;
				}
				return html;
			}
		},
		legend: {
			show: showSMA || showEMA || showBollinger,
			data: [
				...(showSMA ? ['SMA 20', 'SMA 50', 'SMA 200'] : []),
				...(showEMA ? ['EMA 12', 'EMA 26'] : []),
				...(showBollinger ? ['BB Upper', 'BB Middle', 'BB Lower'] : [])
			],
			top: 0,
			right: '4%',
			textStyle: { color: colors.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' }
		},
		grid: gridConfig,
		xAxis: xAxisConfig,
		yAxis: yAxisConfig,
		dataZoom: [
			{
				type: 'inside',
				xAxisIndex: showVolume ? [0, 1] : [0],
				start: 0,
				end: 100
			},
			{
				show: true,
				xAxisIndex: showVolume ? [0, 1] : [0],
				type: 'slider',
				bottom: '2%',
				height: 20,
				start: 0,
				end: 100,
				borderColor: colors.border,
				backgroundColor: colors.grid,
				fillerColor: 'rgba(100, 100, 100, 0.2)',
				handleStyle: { color: colors.textMuted },
				textStyle: { color: colors.textMuted, fontSize: 9 }
			}
		],
		series
	};
}

function formatVolume(value: number): string {
	if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
	if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
	if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
	return value.toString();
}

export function buildRSIOptions(
	data: IndicatorData[],
	colors: ThemeColors
): EChartsOption {
	const dates = data.map((d) => d.time);
	const rsiData = data.map((d) => d.rsi ?? null);

	return {
		backgroundColor: colors.background,
		animation: true,
		grid: { left: '8%', right: '4%', top: '15%', bottom: '15%' },
		xAxis: {
			type: 'category',
			data: dates,
			axisLine: { show: false },
			axisLabel: { show: false },
			axisTick: { show: false }
		},
		yAxis: {
			type: 'value',
			min: 0,
			max: 100,
			splitNumber: 4,
			axisLine: { lineStyle: { color: colors.border } },
			axisLabel: { color: colors.textMuted, fontSize: 9, fontFamily: 'IBM Plex Mono' },
			splitLine: { lineStyle: { color: colors.grid } }
		},
		series: [
			{
				name: 'RSI',
				type: 'line',
				data: rsiData,
				smooth: true,
				lineStyle: { width: 2, color: '#9c27b0' },
				symbol: 'none',
				markLine: {
					silent: true,
					symbol: 'none',
					lineStyle: { type: 'dashed', color: colors.textMuted },
					data: [{ yAxis: 30 }, { yAxis: 70 }],
					label: { show: false }
				}
			}
		],
		tooltip: {
			trigger: 'axis',
			backgroundColor: colors.background,
			borderColor: colors.border,
			textStyle: { color: colors.text, fontSize: 10, fontFamily: 'IBM Plex Mono' },
			formatter: (params: any) => {
				if (!Array.isArray(params) || params.length === 0) return '';
				const rsi = params[0].data;
				return `RSI: ${rsi !== null ? rsi.toFixed(2) : 'N/A'}`;
			}
		}
	};
}

export function buildMACDOptions(
	data: IndicatorData[],
	colors: ThemeColors
): EChartsOption {
	const dates = data.map((d) => d.time);
	const macdData = data.map((d) => d.macd ?? null);
	const signalData = data.map((d) => d.macdSignal ?? null);
	const histogramData = data.map((d) => ({
		value: d.macdHistogram ?? 0,
		itemStyle: {
			color: (d.macdHistogram ?? 0) >= 0 ? colors.upColor : colors.downColor
		}
	}));

	return {
		backgroundColor: colors.background,
		animation: true,
		grid: { left: '8%', right: '4%', top: '15%', bottom: '15%' },
		xAxis: {
			type: 'category',
			data: dates,
			axisLine: { show: false },
			axisLabel: { show: false },
			axisTick: { show: false }
		},
		yAxis: {
			type: 'value',
			axisLine: { lineStyle: { color: colors.border } },
			axisLabel: { color: colors.textMuted, fontSize: 9, fontFamily: 'IBM Plex Mono' },
			splitLine: { lineStyle: { color: colors.grid } }
		},
		series: [
			{
				name: 'Histogram',
				type: 'bar',
				data: histogramData,
				barWidth: '60%'
			},
			{
				name: 'MACD',
				type: 'line',
				data: macdData,
				smooth: true,
				lineStyle: { width: 1.5, color: '#2196f3' },
				symbol: 'none'
			},
			{
				name: 'Signal',
				type: 'line',
				data: signalData,
				smooth: true,
				lineStyle: { width: 1.5, color: '#ff9800' },
				symbol: 'none'
			}
		],
		tooltip: {
			trigger: 'axis',
			backgroundColor: colors.background,
			borderColor: colors.border,
			textStyle: { color: colors.text, fontSize: 10, fontFamily: 'IBM Plex Mono' }
		}
	};
}

export interface FinancialDataPoint {
	date: string;
	period: string;
	[key: string]: number | string | null | undefined;
}

export function buildFinancialBarOptions(
	data: FinancialDataPoint[],
	config: {
		title: string;
		series: Array<{ key: string; name: string; color: string }>;
		formatValue?: (value: number) => string;
	},
	colors: ThemeColors
): EChartsOption {
	const reversed = [...data].reverse();
	const labels = reversed.map((d) => {
		const date = new Date(d.date);
		if (d.period === 'FY') return date.getFullYear().toString();
		const quarter = Math.ceil((date.getMonth() + 1) / 3);
		return `Q${quarter} ${date.getFullYear().toString().slice(-2)}`;
	});

	const formatValue = config.formatValue || formatBillions;

	return {
		backgroundColor: colors.background,
		animation: true,
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			backgroundColor: colors.background,
			borderColor: colors.border,
			textStyle: { color: colors.text, fontSize: 11, fontFamily: 'IBM Plex Mono' },
			formatter: (params: any) => {
				if (!Array.isArray(params)) return '';
				let html = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`;
				params.forEach((p: any) => {
					html += `<div>${p.marker} ${p.seriesName}: ${formatValue(p.value)}</div>`;
				});
				return html;
			}
		},
		legend: {
			show: config.series.length > 1,
			top: 0,
			right: '4%',
			textStyle: { color: colors.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' }
		},
		grid: {
			left: '10%',
			right: '4%',
			top: config.series.length > 1 ? '15%' : '10%',
			bottom: '12%'
		},
		xAxis: {
			type: 'category',
			data: labels,
			axisLine: { lineStyle: { color: colors.border } },
			axisLabel: { color: colors.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' },
			axisTick: { show: false }
		},
		yAxis: {
			type: 'value',
			axisLine: { show: false },
			axisLabel: {
				color: colors.textMuted,
				fontSize: 10,
				fontFamily: 'IBM Plex Mono',
				formatter: (value: number) => formatValue(value)
			},
			splitLine: { lineStyle: { color: colors.grid } }
		},
		series: config.series.map((s) => ({
			name: s.name,
			type: 'bar',
			data: reversed.map((d) => (d[s.key] as number) || 0),
			itemStyle: { color: s.color, borderRadius: [3, 3, 0, 0] },
			barMaxWidth: 40
		}))
	};
}

export function buildLineAreaOptions(
	data: FinancialDataPoint[],
	config: {
		title: string;
		series: Array<{ key: string; name: string; color: string }>;
		formatValue?: (value: number) => string;
	},
	colors: ThemeColors
): EChartsOption {
	const reversed = [...data].reverse();
	const labels = reversed.map((d) => {
		const date = new Date(d.date);
		if (d.period === 'FY') return date.getFullYear().toString();
		const quarter = Math.ceil((date.getMonth() + 1) / 3);
		return `Q${quarter} ${date.getFullYear().toString().slice(-2)}`;
	});

	const formatValue = config.formatValue || formatBillions;

	return {
		backgroundColor: colors.background,
		animation: true,
		tooltip: {
			trigger: 'axis',
			backgroundColor: colors.background,
			borderColor: colors.border,
			textStyle: { color: colors.text, fontSize: 11, fontFamily: 'IBM Plex Mono' }
		},
		legend: {
			show: config.series.length > 1,
			top: 0,
			right: '4%',
			textStyle: { color: colors.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' }
		},
		grid: {
			left: '10%',
			right: '4%',
			top: config.series.length > 1 ? '15%' : '10%',
			bottom: '12%'
		},
		xAxis: {
			type: 'category',
			data: labels,
			boundaryGap: false,
			axisLine: { lineStyle: { color: colors.border } },
			axisLabel: { color: colors.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' }
		},
		yAxis: {
			type: 'value',
			axisLine: { show: false },
			axisLabel: {
				color: colors.textMuted,
				fontSize: 10,
				fontFamily: 'IBM Plex Mono',
				formatter: (value: number) => formatValue(value)
			},
			splitLine: { lineStyle: { color: colors.grid } }
		},
		series: config.series.map((s) => ({
			name: s.name,
			type: 'line',
			data: reversed.map((d) => (d[s.key] as number) || 0),
			smooth: true,
			lineStyle: { width: 2, color: s.color },
			areaStyle: { color: `${s.color}20` },
			symbol: 'circle',
			symbolSize: 6,
			itemStyle: { color: s.color }
		}))
	};
}

export function buildSimpleLineOptions(
	data: Array<{ date: string; close: number }>,
	colors: ThemeColors,
	config?: { label?: string; color?: string }
): EChartsOption {
	const { label = 'Price', color = '#0066cc' } = config || {};
	const labels = data.map((d) => {
		const date = new Date(d.date);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	});

	return {
		backgroundColor: colors.background,
		animation: true,
		tooltip: {
			trigger: 'axis',
			backgroundColor: colors.background,
			borderColor: colors.border,
			textStyle: { color: colors.text, fontSize: 11, fontFamily: 'IBM Plex Mono' },
			formatter: (params: any) => {
				if (!Array.isArray(params)) return '';
				const p = params[0];
				return `${p.axisValue}<br/>${label}: $${p.value.toFixed(2)}`;
			}
		},
		grid: {
			left: '8%',
			right: '4%',
			top: '8%',
			bottom: '12%'
		},
		xAxis: {
			type: 'category',
			data: labels,
			boundaryGap: false,
			axisLine: { lineStyle: { color: colors.border } },
			axisLabel: { color: colors.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' }
		},
		yAxis: {
			type: 'value',
			axisLine: { show: false },
			axisLabel: {
				color: colors.textMuted,
				fontSize: 10,
				fontFamily: 'IBM Plex Mono',
				formatter: (value: number) => `$${value}`
			},
			splitLine: { lineStyle: { color: colors.grid } }
		},
		series: [
			{
				name: label,
				type: 'line',
				data: data.map((d) => d.close),
				smooth: true,
				lineStyle: { width: 2, color },
				areaStyle: { color: `${color}20` },
				symbol: 'none'
			}
		]
	};
}

export function buildSimpleBarOptions(
	data: Array<{ label: string; value: number }>,
	colors: ThemeColors,
	config?: { label?: string; horizontal?: boolean; formatValue?: (value: number) => string }
): EChartsOption {
	const { label = 'Value', horizontal = false, formatValue = (v: number) => v.toLocaleString() } =
		config || {};

	const labels = data.map((d) => d.label);
	const values = data.map((d) => ({
		value: d.value,
		itemStyle: { color: d.value >= 0 ? '#0066cc' : '#cc0000' }
	}));

	return {
		backgroundColor: colors.background,
		animation: true,
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			backgroundColor: colors.background,
			borderColor: colors.border,
			textStyle: { color: colors.text, fontSize: 11, fontFamily: 'IBM Plex Mono' },
			formatter: (params: any) => {
				if (!Array.isArray(params)) return '';
				const p = params[0];
				return `${p.axisValue}<br/>${formatValue(p.value)}`;
			}
		},
		grid: {
			left: horizontal ? '25%' : '10%',
			right: '4%',
			top: '8%',
			bottom: '12%'
		},
		xAxis: horizontal
			? {
					type: 'value',
					axisLine: { show: false },
					axisLabel: {
						color: colors.textMuted,
						fontSize: 10,
						fontFamily: 'IBM Plex Mono',
						formatter: (value: number) => formatValue(value)
					},
					splitLine: { lineStyle: { color: colors.grid } }
				}
			: {
					type: 'category',
					data: labels,
					axisLine: { lineStyle: { color: colors.border } },
					axisLabel: { color: colors.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' },
					axisTick: { show: false }
				},
		yAxis: horizontal
			? {
					type: 'category',
					data: labels,
					axisLine: { lineStyle: { color: colors.border } },
					axisLabel: { color: colors.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' }
				}
			: {
					type: 'value',
					axisLine: { show: false },
					axisLabel: {
						color: colors.textMuted,
						fontSize: 10,
						fontFamily: 'IBM Plex Mono',
						formatter: (value: number) => formatValue(value)
					},
					splitLine: { lineStyle: { color: colors.grid } }
				},
		series: [
			{
				name: label,
				type: 'bar',
				data: values,
				barMaxWidth: 40,
				itemStyle: { borderRadius: horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0] }
			}
		]
	};
}

function formatBillions(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
	if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
	if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
	return `$${value.toFixed(0)}`;
}
