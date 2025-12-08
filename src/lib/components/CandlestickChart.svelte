<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		createChart,
		CandlestickSeries,
		HistogramSeries,
		LineSeries,
		type IChartApi,
		type ISeriesApi,
		type CandlestickData,
		type LineData,
		type HistogramData,
		ColorType,
		CrosshairMode
	} from 'lightweight-charts';
	import { themeStore } from '$lib/stores/theme.svelte';

	interface OHLCData {
		time: string;
		open: number;
		high: number;
		low: number;
		close: number;
		volume: number;
	}

	interface IndicatorData extends OHLCData {
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

	// Theme color configurations
	const lightColors = {
		background: '#ffffff',
		textColor: '#1a1a1a',
		gridColor: '#f0f0f0',
		borderColor: '#cccccc',
		crosshairColor: '#666666',
		upColor: '#0d7a3e',
		downColor: '#c41e3a',
		volumeUpColor: 'rgba(13, 122, 62, 0.3)',
		volumeDownColor: 'rgba(196, 30, 58, 0.3)'
	};

	const darkColors = {
		background: '#1e1e1e',
		textColor: '#e8e8e0',
		gridColor: '#3d3d3d',
		borderColor: '#525252',
		crosshairColor: '#a0a0a0',
		upColor: '#4ade80',
		downColor: '#f87171',
		volumeUpColor: 'rgba(74, 222, 128, 0.3)',
		volumeDownColor: 'rgba(248, 113, 113, 0.3)'
	};

	interface Props {
		data: OHLCData[] | IndicatorData[];
		height?: number;
		showVolume?: boolean;
		showSMA?: boolean;
		showEMA?: boolean;
		showBollinger?: boolean;
	}

	let {
		data,
		height = 400,
		showVolume = true,
		showSMA = false,
		showEMA = false,
		showBollinger = false
	}: Props = $props();

	// Get current theme colors
	const getColors = () => themeStore.resolvedTheme === 'dark' ? darkColors : lightColors;

	let chartContainer: HTMLDivElement;
	let chart: IChartApi | null = null;
	let candlestickSeries: ISeriesApi<'Candlestick'> | null = null;
	let volumeSeries: ISeriesApi<'Histogram'> | null = null;
	let sma20Series: ISeriesApi<'Line'> | null = null;
	let sma50Series: ISeriesApi<'Line'> | null = null;
	let sma200Series: ISeriesApi<'Line'> | null = null;
	let ema12Series: ISeriesApi<'Line'> | null = null;
	let ema26Series: ISeriesApi<'Line'> | null = null;
	let bollingerUpperSeries: ISeriesApi<'Line'> | null = null;
	let bollingerMiddleSeries: ISeriesApi<'Line'> | null = null;
	let bollingerLowerSeries: ISeriesApi<'Line'> | null = null;

	function initChart() {
		if (!chartContainer) return;

		// Destroy existing chart if any
		if (chart) {
			chart.remove();
			chart = null;
			candlestickSeries = null;
			volumeSeries = null;
			sma20Series = null;
			sma50Series = null;
			sma200Series = null;
			ema12Series = null;
			ema26Series = null;
			bollingerUpperSeries = null;
			bollingerMiddleSeries = null;
			bollingerLowerSeries = null;
		}

		// Wait for container to have width
		if (chartContainer.clientWidth === 0) {
			requestAnimationFrame(() => initChart());
			return;
		}

		const colors = getColors();

		// Use container's computed height from CSS, fallback to prop
		const computedHeight = chartContainer.clientHeight || height;

		chart = createChart(chartContainer, {
			width: chartContainer.clientWidth,
			height: computedHeight,
			layout: {
				background: { type: ColorType.Solid, color: colors.background },
				textColor: colors.textColor,
				fontFamily: "'IBM Plex Mono', monospace"
			},
			grid: {
				vertLines: { color: colors.gridColor },
				horzLines: { color: colors.gridColor }
			},
			crosshair: {
				mode: CrosshairMode.Normal,
				vertLine: {
					color: colors.crosshairColor,
					width: 1,
					style: 2,
					labelBackgroundColor: colors.textColor
				},
				horzLine: {
					color: colors.crosshairColor,
					width: 1,
					style: 2,
					labelBackgroundColor: colors.textColor
				}
			},
			rightPriceScale: {
				borderColor: colors.borderColor,
				scaleMargins: {
					top: 0.1,
					bottom: showVolume ? 0.2 : 0.1
				}
			},
			timeScale: {
				borderColor: colors.borderColor,
				timeVisible: true,
				secondsVisible: false
			},
			handleScroll: {
				mouseWheel: true,
				pressedMouseMove: true
			},
			handleScale: {
				axisPressedMouseMove: true,
				mouseWheel: true,
				pinch: true
			}
		});

		// Create candlestick series (v5 API)
		candlestickSeries = chart.addSeries(CandlestickSeries, {
			upColor: colors.upColor,
			downColor: colors.downColor,
			borderUpColor: colors.upColor,
			borderDownColor: colors.downColor,
			wickUpColor: colors.upColor,
			wickDownColor: colors.downColor
		});

		// Create volume series
		if (showVolume) {
			volumeSeries = chart.addSeries(HistogramSeries, {
				priceFormat: {
					type: 'volume'
				},
				priceScaleId: 'volume'
			});

			chart.priceScale('volume').applyOptions({
				scaleMargins: {
					top: 0.85,
					bottom: 0
				}
			});
		}

		// Create indicator series
		if (showSMA) {
			sma20Series = chart.addSeries(LineSeries, {
				color: '#ff9800',
				lineWidth: 1,
				title: 'SMA 20'
			});
			sma50Series = chart.addSeries(LineSeries, {
				color: '#2196f3',
				lineWidth: 1,
				title: 'SMA 50'
			});
			sma200Series = chart.addSeries(LineSeries, {
				color: '#9c27b0',
				lineWidth: 1,
				title: 'SMA 200'
			});
		}

		if (showEMA) {
			ema12Series = chart.addSeries(LineSeries, {
				color: '#4caf50',
				lineWidth: 1,
				title: 'EMA 12'
			});
			ema26Series = chart.addSeries(LineSeries, {
				color: '#f44336',
				lineWidth: 1,
				title: 'EMA 26'
			});
		}

		if (showBollinger) {
			bollingerUpperSeries = chart.addSeries(LineSeries, {
				color: '#607d8b',
				lineWidth: 1,
				lineStyle: 2,
				title: 'BB Upper'
			});
			bollingerMiddleSeries = chart.addSeries(LineSeries, {
				color: '#607d8b',
				lineWidth: 1,
				title: 'BB Middle'
			});
			bollingerLowerSeries = chart.addSeries(LineSeries, {
				color: '#607d8b',
				lineWidth: 1,
				lineStyle: 2,
				title: 'BB Lower'
			});
		}

		updateChartData();
	}

	function updateChartData() {
		if (!chart || !candlestickSeries || data.length === 0) return;

		// Format candlestick data
		const candleData: CandlestickData[] = data.map((d) => ({
			time: d.time,
			open: d.open,
			high: d.high,
			low: d.low,
			close: d.close
		}));

		candlestickSeries.setData(candleData);

		// Format volume data
		if (volumeSeries && showVolume) {
			const colors = getColors();
			const volumeData: HistogramData[] = data.map((d) => ({
				time: d.time,
				value: d.volume,
				color: d.close >= d.open ? colors.volumeUpColor : colors.volumeDownColor
			}));
			volumeSeries.setData(volumeData);
		}

		// Update indicator series
		const indicatorData = data as IndicatorData[];

		if (sma20Series && showSMA) {
			const sma20Data: LineData[] = indicatorData
				.filter((d) => d.sma20 != null)
				.map((d) => ({ time: d.time, value: d.sma20! }));
			sma20Series.setData(sma20Data);
		}

		if (sma50Series && showSMA) {
			const sma50Data: LineData[] = indicatorData
				.filter((d) => d.sma50 != null)
				.map((d) => ({ time: d.time, value: d.sma50! }));
			sma50Series.setData(sma50Data);
		}

		if (sma200Series && showSMA) {
			const sma200Data: LineData[] = indicatorData
				.filter((d) => d.sma200 != null)
				.map((d) => ({ time: d.time, value: d.sma200! }));
			sma200Series.setData(sma200Data);
		}

		if (ema12Series && showEMA) {
			const ema12Data: LineData[] = indicatorData
				.filter((d) => d.ema12 != null)
				.map((d) => ({ time: d.time, value: d.ema12! }));
			ema12Series.setData(ema12Data);
		}

		if (ema26Series && showEMA) {
			const ema26Data: LineData[] = indicatorData
				.filter((d) => d.ema26 != null)
				.map((d) => ({ time: d.time, value: d.ema26! }));
			ema26Series.setData(ema26Data);
		}

		if (bollingerUpperSeries && showBollinger) {
			const upperData: LineData[] = indicatorData
				.filter((d) => d.bollingerUpper != null)
				.map((d) => ({ time: d.time, value: d.bollingerUpper! }));
			bollingerUpperSeries.setData(upperData);
		}

		if (bollingerMiddleSeries && showBollinger) {
			const middleData: LineData[] = indicatorData
				.filter((d) => d.bollingerMiddle != null)
				.map((d) => ({ time: d.time, value: d.bollingerMiddle! }));
			bollingerMiddleSeries.setData(middleData);
		}

		if (bollingerLowerSeries && showBollinger) {
			const lowerData: LineData[] = indicatorData
				.filter((d) => d.bollingerLower != null)
				.map((d) => ({ time: d.time, value: d.bollingerLower! }));
			bollingerLowerSeries.setData(lowerData);
		}

		// Fit content
		chart.timeScale().fitContent();
	}

	function handleResize() {
		if (chart && chartContainer) {
			const computedHeight = chartContainer.clientHeight || height;
			chart.applyOptions({
				width: chartContainer.clientWidth,
				height: computedHeight
			});
		}
	}

	onMount(() => {
		initChart();
		window.addEventListener('resize', handleResize);
	});

	onDestroy(() => {
		window.removeEventListener('resize', handleResize);
		if (chart) {
			chart.remove();
			chart = null;
		}
	});

	// Track theme for reactivity
	let currentTheme = $derived(themeStore.resolvedTheme);

	$effect(() => {
		// Re-initialize chart when data, indicator options, or theme change
		if (data && data.length > 0 && chartContainer) {
			// Access currentTheme to create reactive dependency
			const _theme = currentTheme;
			initChart();
		}
	});
</script>

<div class="chart-wrapper" bind:this={chartContainer}></div>

<style>
	.chart-wrapper {
		width: 100%;
		position: relative;
		min-height: 300px;
		height: clamp(300px, 40vh, 500px);
	}

	@media (min-width: 768px) {
		.chart-wrapper {
			min-height: 350px;
			height: clamp(350px, 42vh, 550px);
		}
	}

	@media (min-width: 1200px) {
		.chart-wrapper {
			min-height: 400px;
			height: clamp(400px, 45vh, 600px);
		}
	}
</style>
