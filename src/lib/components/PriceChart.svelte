<script lang="ts">
	import { echart } from '$lib/actions/echarts';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { getTheme } from '$lib/utils/chart-options';
	import type { EChartsOption } from 'echarts';

	interface DataPoint {
		date: string;
		close: number;
		label?: string;
	}

	interface Props {
		data: DataPoint[];
		height?: number;
		color?: string;
	}

	let { data, height = 300, color }: Props = $props();

	const isDark = $derived(themeStore.resolvedTheme === 'dark');
	const colors = $derived(getTheme(isDark));

	// Determine chart color based on trend (first vs last price)
	const trendColor = $derived.by(() => {
		if (color) return color; // Use explicit color if provided
		if (data.length < 2) return '#6b7280'; // Gray for insufficient data
		const firstPrice = data[0].close;
		const lastPrice = data[data.length - 1].close;
		return lastPrice >= firstPrice ? '#0d7a3e' : '#c41e3a'; // Green for up, red for down
	});

	const chartOptions = $derived.by((): EChartsOption | null => {
		if (data.length === 0) return null;

		const labels = data.map((d) => d.label || d.date);
		const values = data.map((d) => d.close);

		const minValue = Math.min(...values);
		const maxValue = Math.max(...values);
		const padding = (maxValue - minValue) * 0.1;

		return {
			backgroundColor: 'transparent',
			animation: true,
			animationDuration: 400,
			tooltip: {
				trigger: 'axis',
				backgroundColor: colors.background,
				borderColor: colors.border,
				textStyle: {
					color: colors.text,
					fontSize: 11,
					fontFamily: 'IBM Plex Mono'
				},
				axisPointer: {
					type: 'cross',
					crossStyle: { color: colors.textMuted }
				},
				formatter: (params: any) => {
					if (!Array.isArray(params) || params.length === 0) return '';
					const p = params[0];
					return `<div style="font-weight:600">${p.axisValue}</div>
					<div style="margin-top:4px">$${p.value.toFixed(2)}</div>`;
				}
			},
			grid: {
				left: 60,
				right: 20,
				top: 20,
				bottom: 40,
				containLabel: false
			},
			xAxis: {
				type: 'category',
				data: labels,
				boundaryGap: false,
				axisLine: { lineStyle: { color: colors.border } },
				axisLabel: {
					color: colors.textMuted,
					fontSize: 10,
					fontFamily: 'IBM Plex Mono',
					interval: 'auto',
					rotate: 0
				},
				axisTick: { show: false }
			},
			yAxis: {
				type: 'value',
				min: minValue - padding,
				max: maxValue + padding,
				axisLine: { show: false },
				axisLabel: {
					color: colors.textMuted,
					fontSize: 10,
					fontFamily: 'IBM Plex Mono',
					formatter: (value: number) => `$${value.toFixed(0)}`
				},
				splitLine: { lineStyle: { color: colors.grid } }
			},
			series: [
				{
					type: 'line',
					data: values,
					smooth: 0.3,
					symbol: 'none',
					lineStyle: {
						width: 2,
						color: trendColor
					},
					areaStyle: {
						color: {
							type: 'linear',
							x: 0,
							y: 0,
							x2: 0,
							y2: 1,
							colorStops: [
								{ offset: 0, color: `${trendColor}40` },
								{ offset: 1, color: `${trendColor}05` }
							]
						}
					}
				}
			]
		};
	});
</script>

<div class="chart-container" style:height="{height}px">
	{#if chartOptions}
		<div
			class="chart"
			use:echart={{ options: chartOptions, theme: isDark ? 'dark' : 'light' }}
		></div>
	{:else}
		<div class="no-data">No data available</div>
	{/if}
</div>

<style>
	.chart-container {
		position: relative;
		width: 100%;
	}

	.chart {
		width: 100%;
		height: 100%;
	}

	.no-data {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--color-ink-muted);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
	}
</style>
