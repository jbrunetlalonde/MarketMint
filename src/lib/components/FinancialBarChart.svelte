<script lang="ts">
	import { echart } from '$lib/actions/echarts';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { getTheme } from '$lib/utils/chart-options';
	import type { EChartsOption } from 'echarts';

	interface DataPoint {
		label: string;
		value: number;
	}

	interface Props {
		data: DataPoint[];
		height?: number;
		color?: string;
		title?: string;
		formatValue?: (value: number) => string;
	}

	let {
		data,
		height = 180,
		color = '#059669',
		title,
		formatValue = (v: number) => `$${v.toFixed(1)}B`
	}: Props = $props();

	const isDark = $derived(themeStore.resolvedTheme === 'dark');
	const colors = $derived(getTheme(isDark));

	const chartOptions = $derived.by((): EChartsOption | null => {
		if (data.length === 0) return null;

		return {
			backgroundColor: 'transparent',
			animation: true,
			animationDuration: 600,
			animationEasing: 'cubicOut',
			tooltip: {
				trigger: 'axis',
				axisPointer: {
					type: 'shadow',
					shadowStyle: {
						color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
					}
				},
				backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
				borderColor: colors.border,
				borderWidth: 1,
				padding: [10, 14],
				textStyle: {
					color: colors.text,
					fontSize: 12,
					fontFamily: 'IBM Plex Mono'
				},
				formatter: (params: any) => {
					if (!Array.isArray(params)) return '';
					const p = params[0];
					return `<div style="font-weight:600;margin-bottom:4px">${p.axisValue}</div>
					<div style="font-size:14px">${formatValue(p.value)}</div>`;
				}
			},
			grid: {
				left: '12%',
				right: '6%',
				top: '12%',
				bottom: '18%',
				containLabel: false
			},
			xAxis: {
				type: 'category',
				data: data.map((d) => d.label),
				axisLine: {
					show: true,
					lineStyle: { color: colors.border, width: 1 }
				},
				axisLabel: {
					color: colors.textMuted,
					fontSize: 11,
					fontFamily: 'IBM Plex Mono',
					fontWeight: 500,
					margin: 12
				},
				axisTick: { show: false },
				splitLine: { show: false }
			},
			yAxis: {
				type: 'value',
				axisLine: { show: false },
				axisLabel: {
					color: colors.textMuted,
					fontSize: 10,
					fontFamily: 'IBM Plex Mono',
					formatter: (value: number) => formatValue(value),
					margin: 8
				},
				splitLine: {
					lineStyle: {
						color: colors.grid,
						type: 'dashed',
						width: 1
					}
				},
				splitNumber: 4
			},
			series: [
				{
					type: 'bar',
					data: data.map((d) => ({
						value: d.value,
						itemStyle: {
							color: {
								type: 'linear',
								x: 0,
								y: 0,
								x2: 0,
								y2: 1,
								colorStops: [
									{ offset: 0, color: color },
									{ offset: 1, color: `${color}99` }
								]
							},
							borderRadius: [4, 4, 0, 0],
							shadowColor: `${color}40`,
							shadowBlur: 8,
							shadowOffsetY: 4
						},
						emphasis: {
							itemStyle: {
								color: {
									type: 'linear',
									x: 0,
									y: 0,
									x2: 0,
									y2: 1,
									colorStops: [
										{ offset: 0, color: color },
										{ offset: 1, color: `${color}cc` }
									]
								},
								shadowBlur: 12,
								shadowOffsetY: 6
							}
						}
					})),
					barWidth: '55%',
					barMaxWidth: 50,
					barMinWidth: 20
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
