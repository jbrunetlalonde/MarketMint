<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		createChart,
		LineSeries,
		HistogramSeries,
		type IChartApi,
		type ISeriesApi,
		type LineData,
		type HistogramData,
		ColorType,
		CrosshairMode
	} from 'lightweight-charts';
	import { themeStore } from '$lib/stores/theme.svelte';

	interface IndicatorData {
		time: string;
		rsi?: number | null;
		macd?: number | null;
		macdSignal?: number | null;
		macdHistogram?: number | null;
	}

	// Theme color configurations
	const lightColors = {
		background: '#fafafa',
		textColor: '#666666',
		gridColor: '#f0f0f0',
		gridColorAlt: '#e8e8e8',
		borderColor: '#dddddd',
		crosshairColor: '#999999',
		labelBg: '#333333',
		panelBorder: '#e0e0e0',
		panelLabelBg: '#f5f5f5',
		histogramUp: '#26a69a',
		histogramDown: '#ef5350'
	};

	const darkColors = {
		background: '#1e1e1e',
		textColor: '#a0a0a0',
		gridColor: '#2d2d2d',
		gridColorAlt: '#333333',
		borderColor: '#3d3d3d',
		crosshairColor: '#666666',
		labelBg: '#e8e8e0',
		panelBorder: '#3d3d3d',
		panelLabelBg: '#252525',
		histogramUp: '#4ade80',
		histogramDown: '#f87171'
	};

	interface Props {
		data: IndicatorData[];
		type: 'rsi' | 'macd';
		height?: number;
	}

	let { data, type, height = 120 }: Props = $props();

	// Get current theme colors
	const getColors = () => themeStore.resolvedTheme === 'dark' ? darkColors : lightColors;

	let chartContainer: HTMLDivElement;
	let chart: IChartApi | null = null;

	// RSI series
	let rsiSeries: ISeriesApi<'Line'> | null = null;

	// MACD series
	let macdLineSeries: ISeriesApi<'Line'> | null = null;
	let signalLineSeries: ISeriesApi<'Line'> | null = null;
	let histogramSeries: ISeriesApi<'Histogram'> | null = null;

	function initChart() {
		if (!chartContainer) return;

		// Destroy existing chart if any
		if (chart) {
			chart.remove();
			chart = null;
			rsiSeries = null;
			macdLineSeries = null;
			signalLineSeries = null;
			histogramSeries = null;
		}

		const colors = getColors();

		chart = createChart(chartContainer, {
			width: chartContainer.clientWidth,
			height: height,
			layout: {
				background: { type: ColorType.Solid, color: colors.background },
				textColor: colors.textColor,
				fontFamily: "'IBM Plex Mono', monospace",
				fontSize: 10
			},
			grid: {
				vertLines: { color: colors.gridColor },
				horzLines: { color: colors.gridColorAlt }
			},
			crosshair: {
				mode: CrosshairMode.Normal,
				vertLine: {
					color: colors.crosshairColor,
					width: 1,
					style: 2,
					labelVisible: false
				},
				horzLine: {
					color: colors.crosshairColor,
					width: 1,
					style: 2,
					labelBackgroundColor: colors.labelBg
				}
			},
			rightPriceScale: {
				borderColor: colors.borderColor,
				scaleMargins: {
					top: 0.1,
					bottom: 0.1
				}
			},
			timeScale: {
				borderColor: colors.borderColor,
				visible: false
			},
			handleScroll: false,
			handleScale: false
		});

		if (type === 'rsi') {
			rsiSeries = chart.addSeries(LineSeries, {
				color: '#9c27b0',
				lineWidth: 2,
				title: 'RSI'
			});

			// Add reference lines at 30 and 70
			chart.priceScale('right').applyOptions({
				autoScale: false,
				scaleMargins: { top: 0.05, bottom: 0.05 }
			});
		} else if (type === 'macd') {
			histogramSeries = chart.addSeries(HistogramSeries, {
				color: '#26a69a',
				priceFormat: {
					type: 'price',
					precision: 4
				}
			});

			macdLineSeries = chart.addSeries(LineSeries, {
				color: '#2196f3',
				lineWidth: 1,
				title: 'MACD'
			});

			signalLineSeries = chart.addSeries(LineSeries, {
				color: '#ff9800',
				lineWidth: 1,
				title: 'Signal'
			});
		}

		updateChartData();
	}

	function updateChartData() {
		if (!chart || data.length === 0) return;

		if (type === 'rsi' && rsiSeries) {
			const rsiData: LineData[] = data
				.filter((d) => d.rsi != null)
				.map((d) => ({ time: d.time, value: d.rsi! }));
			rsiSeries.setData(rsiData);
		}

		if (type === 'macd') {
			if (macdLineSeries) {
				const macdData: LineData[] = data
					.filter((d) => d.macd != null)
					.map((d) => ({ time: d.time, value: d.macd! }));
				macdLineSeries.setData(macdData);
			}

			if (signalLineSeries) {
				const signalData: LineData[] = data
					.filter((d) => d.macdSignal != null)
					.map((d) => ({ time: d.time, value: d.macdSignal! }));
				signalLineSeries.setData(signalData);
			}

			if (histogramSeries) {
				const colors = getColors();
				const histogramData: HistogramData[] = data
					.filter((d) => d.macdHistogram != null)
					.map((d) => ({
						time: d.time,
						value: d.macdHistogram!,
						color: d.macdHistogram! >= 0 ? colors.histogramUp : colors.histogramDown
					}));
				histogramSeries.setData(histogramData);
			}
		}

		chart.timeScale().fitContent();
	}

	function handleResize() {
		if (chart && chartContainer) {
			chart.applyOptions({ width: chartContainer.clientWidth });
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
		// Re-initialize chart when data or theme changes
		if (data && chartContainer) {
			const _theme = currentTheme;
			initChart();
		}
	});
</script>

<div class="indicator-panel">
	<div class="indicator-label">
		{#if type === 'rsi'}
			RSI (14)
		{:else}
			MACD (12, 26, 9)
		{/if}
	</div>
	<div class="chart-wrapper" bind:this={chartContainer} style="height: {height}px;"></div>
</div>

<style>
	.indicator-panel {
		border-top: 1px solid var(--color-border);
	}

	.indicator-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		color: var(--color-ink-muted);
		padding: 4px 8px;
		background: var(--color-newsprint-dark);
	}

	.chart-wrapper {
		width: 100%;
		position: relative;
	}
</style>
