<script lang="ts">
	import { echart } from '$lib/actions/echarts';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { getTheme } from '$lib/utils/chart-options';
	import type { EChartsOption } from 'echarts';

	interface DataPoint {
		label: string;
		assets: number;
		liabilities: number;
		equity: number;
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
		if (abs === 0) return '$0';
		return `$${(v * 1000).toFixed(1)}M`;
	}

	const chartOptions = $derived.by((): EChartsOption | null => {
		if (data.length === 0) return null;

		// Find max absolute value for symmetric scale
		const maxAssets = Math.max(...data.map(d => d.assets));
		const maxLiab = Math.max(...data.map(d => d.liabilities));
		const maxVal = Math.max(maxAssets, maxLiab);

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
					const assets = params.find((p: any) => p.seriesName === 'Assets');
					const liab = params.find((p: any) => p.seriesName === 'Liabilities');
					const equity = params.find((p: any) => p.seriesName === 'Equity');
					const debtRatio = assets?.value > 0 ? ((Math.abs(liab?.value || 0) / assets?.value) * 100) : 0;
					return `<div style="font-weight:600;margin-bottom:8px">${assets?.axisValue}</div>
						<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:4px">
							<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#3b82f6;margin-right:6px"></span>Assets</span>
							<span style="font-weight:600">${formatValue(assets?.value || 0)}</span>
						</div>
						<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:4px">
							<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#ef4444;margin-right:6px"></span>Liabilities</span>
							<span style="font-weight:600">${formatValue(Math.abs(liab?.value || 0))}</span>
						</div>
						<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:6px">
							<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#10b981;margin-right:6px"></span>Equity</span>
							<span style="font-weight:600">${formatValue(equity?.value || 0)}</span>
						</div>
						<div style="border-top:1px solid ${colors.border};padding-top:6px;display:flex;justify-content:space-between;gap:24px">
							<span style="color:${colors.textMuted}">Debt Ratio</span>
							<span style="font-weight:600">${debtRatio.toFixed(1)}%</span>
						</div>`;
				}
			},
			legend: {
				show: true,
				bottom: 0,
				left: 'center',
				itemWidth: 12,
				itemHeight: 12,
				itemGap: 16,
				textStyle: {
					color: colors.textMuted,
					fontSize: 10,
					fontFamily: 'IBM Plex Mono'
				}
			},
			grid: {
				left: 60,
				right: 15,
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
			yAxis: {
				type: 'value',
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
			series: [
				{
					name: 'Assets',
					type: 'bar',
					stack: 'positive',
					data: data.map(d => d.assets),
					barWidth: '35%',
					itemStyle: {
						color: '#3b82f6',
						borderRadius: [4, 4, 0, 0]
					}
				},
				{
					name: 'Liabilities',
					type: 'bar',
					data: data.map(d => -d.liabilities),
					barWidth: '35%',
					barGap: '10%',
					itemStyle: {
						color: '#ef4444',
						borderRadius: [0, 0, 4, 4]
					}
				},
				{
					name: 'Equity',
					type: 'line',
					data: data.map(d => d.equity),
					smooth: true,
					symbol: 'circle',
					symbolSize: 6,
					lineStyle: {
						color: '#10b981',
						width: 2.5
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
