<script lang="ts">
	import { echart } from '$lib/actions/echarts';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { getTheme } from '$lib/utils/chart-options';
	import type { EChartsOption } from 'echarts';

	interface DataPoint {
		label: string;
		operating: number;
		investing: number;
		financing: number;
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
		const sign = v < 0 ? '-' : '';
		if (abs >= 1) return `${sign}$${abs.toFixed(1)}B`;
		if (abs >= 0.001) return `${sign}$${(abs * 1000).toFixed(0)}M`;
		if (abs === 0) return '$0';
		return `${sign}$${(abs * 1000).toFixed(1)}M`;
	}

	const chartOptions = $derived.by((): EChartsOption | null => {
		if (data.length === 0) return null;

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
					const op = params.find((p: any) => p.seriesName === 'Operating');
					const inv = params.find((p: any) => p.seriesName === 'Investing');
					const fin = params.find((p: any) => p.seriesName === 'Financing');
					const net = (op?.value || 0) + (inv?.value || 0) + (fin?.value || 0);
					return `<div style="font-weight:600;margin-bottom:8px">${op?.axisValue}</div>
						<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:4px">
							<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#f59e0b;margin-right:6px"></span>Operating</span>
							<span style="font-weight:600;color:${op?.value >= 0 ? '#10b981' : '#ef4444'}">${formatValue(op?.value || 0)}</span>
						</div>
						<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:4px">
							<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#8b5cf6;margin-right:6px"></span>Investing</span>
							<span style="font-weight:600;color:${inv?.value >= 0 ? '#10b981' : '#ef4444'}">${formatValue(inv?.value || 0)}</span>
						</div>
						<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:6px">
							<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#06b6d4;margin-right:6px"></span>Financing</span>
							<span style="font-weight:600;color:${fin?.value >= 0 ? '#10b981' : '#ef4444'}">${formatValue(fin?.value || 0)}</span>
						</div>
						<div style="border-top:1px solid ${colors.border};padding-top:6px;display:flex;justify-content:space-between;gap:24px">
							<span style="color:${colors.textMuted}">Net Change</span>
							<span style="font-weight:600;color:${net >= 0 ? '#10b981' : '#ef4444'}">${formatValue(net)}</span>
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
					name: 'Operating',
					type: 'bar',
					data: data.map(d => d.operating),
					barWidth: '22%',
					itemStyle: {
						color: {
							type: 'linear',
							x: 0, y: 0, x2: 0, y2: 1,
							colorStops: [
								{ offset: 0, color: '#f59e0b' },
								{ offset: 1, color: '#d97706' }
							]
						},
						borderRadius: [3, 3, 0, 0]
					}
				},
				{
					name: 'Investing',
					type: 'bar',
					data: data.map(d => d.investing),
					barWidth: '22%',
					itemStyle: {
						color: {
							type: 'linear',
							x: 0, y: 0, x2: 0, y2: 1,
							colorStops: [
								{ offset: 0, color: '#8b5cf6' },
								{ offset: 1, color: '#7c3aed' }
							]
						},
						borderRadius: [3, 3, 0, 0]
					}
				},
				{
					name: 'Financing',
					type: 'bar',
					data: data.map(d => d.financing),
					barWidth: '22%',
					itemStyle: {
						color: {
							type: 'linear',
							x: 0, y: 0, x2: 0, y2: 1,
							colorStops: [
								{ offset: 0, color: '#06b6d4' },
								{ offset: 1, color: '#0891b2' }
							]
						},
						borderRadius: [3, 3, 0, 0]
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
