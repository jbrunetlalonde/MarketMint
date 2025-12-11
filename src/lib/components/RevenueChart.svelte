<script lang="ts">
	import { echart } from '$lib/actions/echarts';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { getTheme } from '$lib/utils/chart-options';
	import type { EChartsOption } from 'echarts';

	interface DataPoint {
		label: string;
		revenue: number;
		netIncome: number;
	}

	interface Props {
		data: DataPoint[];
		height?: number;
	}

	let { data, height = 200 }: Props = $props();

	const isDark = $derived(themeStore.resolvedTheme === 'dark');
	const colors = $derived(getTheme(isDark));

	// Smart formatter: show M for values < 1B, B for >= 1B
	function formatValue(v: number): string {
		const abs = Math.abs(v);
		if (abs >= 1) return `$${v.toFixed(1)}B`;
		if (abs >= 0.001) return `$${(v * 1000).toFixed(0)}M`;
		return `$${(v * 1000).toFixed(1)}M`;
	}

	const chartOptions = $derived.by((): EChartsOption | null => {
		if (data.length === 0) return null;

		const margins = data.map(d => d.revenue > 0 ? (d.netIncome / d.revenue) * 100 : 0);
		const maxRevenue = Math.max(...data.map(d => d.revenue));
		const minMargin = Math.min(...margins);
		const maxMargin = Math.max(...margins);

		return {
			backgroundColor: 'transparent',
			animation: true,
			animationDuration: 600,
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
				borderColor: colors.border,
				borderWidth: 1,
				padding: [12, 16],
				textStyle: {
					color: colors.text,
					fontSize: 12,
					fontFamily: 'IBM Plex Mono'
				},
				formatter: (params: any) => {
					if (!Array.isArray(params)) return '';
					const rev = params.find((p: any) => p.seriesName === 'Revenue');
					const margin = params.find((p: any) => p.seriesName === 'Net Margin');
					return `<div style="font-weight:600;margin-bottom:8px">${rev?.axisValue}</div>
						<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:4px">
							<span style="color:${colors.textMuted}">Revenue</span>
							<span style="font-weight:600">${formatValue(rev?.value || 0)}</span>
						</div>
						<div style="display:flex;justify-content:space-between;gap:24px">
							<span style="color:${colors.textMuted}">Net Margin</span>
							<span style="font-weight:600;color:${margin?.value >= 0 ? '#10b981' : '#ef4444'}">${margin?.value?.toFixed(1)}%</span>
						</div>`;
				}
			},
			legend: {
				show: true,
				bottom: 0,
				left: 'center',
				itemWidth: 12,
				itemHeight: 12,
				itemGap: 20,
				textStyle: {
					color: colors.textMuted,
					fontSize: 10,
					fontFamily: 'IBM Plex Mono'
				}
			},
			grid: {
				left: 60,
				right: 50,
				top: 15,
				bottom: 55
			},
			xAxis: {
				type: 'category',
				data: data.map(d => d.label),
				axisLine: { lineStyle: { color: colors.border } },
				axisLabel: {
					color: colors.textMuted,
					fontSize: 10,
					fontFamily: 'IBM Plex Mono'
				},
				axisTick: { show: false }
			},
			yAxis: [
				{
					type: 'value',
					position: 'left',
					axisLine: { show: false },
					axisLabel: {
						color: colors.textMuted,
						fontSize: 10,
						fontFamily: 'IBM Plex Mono',
						formatter: (v: number) => formatValue(v)
					},
					splitLine: {
						lineStyle: { color: colors.grid, type: 'dashed' }
					}
				},
				{
					type: 'value',
					position: 'right',
					min: Math.floor(Math.min(minMargin, -10) / 10) * 10,
					max: Math.ceil(Math.max(maxMargin, 30) / 10) * 10,
					axisLine: { show: false },
					axisLabel: {
						color: colors.textMuted,
						fontSize: 10,
						fontFamily: 'IBM Plex Mono',
						formatter: (v: number) => `${v}%`
					},
					splitLine: { show: false }
				}
			],
			series: [
				{
					name: 'Revenue',
					type: 'bar',
					data: data.map(d => d.revenue),
					barWidth: '50%',
					itemStyle: {
						color: {
							type: 'linear',
							x: 0, y: 0, x2: 0, y2: 1,
							colorStops: [
								{ offset: 0, color: '#3b82f6' },
								{ offset: 1, color: '#1d4ed8' }
							]
						},
						borderRadius: [4, 4, 0, 0]
					}
				},
				{
					name: 'Net Margin',
					type: 'line',
					yAxisIndex: 1,
					data: margins,
					smooth: true,
					symbol: 'circle',
					symbolSize: 6,
					lineStyle: {
						color: '#10b981',
						width: 2
					},
					itemStyle: {
						color: '#10b981',
						borderColor: isDark ? '#1a1a1a' : '#fff',
						borderWidth: 2
					}
				}
			]
		};
	});
</script>

<div class="chart-container" style:height="{height}px">
	{#if chartOptions}
		<div class="chart" use:echart={{ options: chartOptions, theme: isDark ? 'dark' : 'light' }}></div>
	{:else}
		<div class="no-data">No data</div>
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
		font-size: 0.75rem;
	}
</style>
