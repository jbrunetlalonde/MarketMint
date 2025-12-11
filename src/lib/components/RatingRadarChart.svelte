<script lang="ts">
	import { echart } from '$lib/actions/echarts';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { getTheme } from '$lib/utils/chart-options';
	import type { EChartsOption } from 'echarts';

	interface RatingData {
		ratingDetailsDCFScore?: number;
		ratingDetailsROEScore?: number;
		ratingDetailsROAScore?: number;
		ratingDetailsDEScore?: number;
		ratingDetailsPEScore?: number;
		ratingDetailsPBScore?: number;
	}

	interface Props {
		rating: RatingData;
		height?: number;
	}

	let { rating, height = 200 }: Props = $props();

	const isDark = $derived(themeStore.resolvedTheme === 'dark');
	const colors = $derived(getTheme(isDark));

	const chartOptions = $derived.by((): EChartsOption | null => {
		// Check if we have any valid scores
		const scores = [
			rating.ratingDetailsDCFScore,
			rating.ratingDetailsROEScore,
			rating.ratingDetailsROAScore,
			rating.ratingDetailsDEScore,
			rating.ratingDetailsPEScore,
			rating.ratingDetailsPBScore
		];

		const hasData = scores.some(s => s !== undefined && s !== null);
		if (!hasData) return null;

		const indicators = [
			{ name: 'DCF', max: 5 },
			{ name: 'ROE', max: 5 },
			{ name: 'ROA', max: 5 },
			{ name: 'D/E', max: 5 },
			{ name: 'P/E', max: 5 },
			{ name: 'P/B', max: 5 }
		];

		const values = [
			rating.ratingDetailsDCFScore ?? 0,
			rating.ratingDetailsROEScore ?? 0,
			rating.ratingDetailsROAScore ?? 0,
			rating.ratingDetailsDEScore ?? 0,
			rating.ratingDetailsPEScore ?? 0,
			rating.ratingDetailsPBScore ?? 0
		];

		return {
			backgroundColor: 'transparent',
			animation: true,
			animationDuration: 600,
			tooltip: {
				trigger: 'item',
				backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
				borderColor: colors.border,
				borderWidth: 1,
				textStyle: {
					color: colors.text,
					fontSize: 11,
					fontFamily: 'IBM Plex Mono'
				}
			},
			radar: {
				indicator: indicators,
				shape: 'polygon',
				splitNumber: 5,
				axisName: {
					color: colors.textMuted,
					fontSize: 10,
					fontFamily: 'IBM Plex Mono'
				},
				splitLine: {
					lineStyle: {
						color: colors.grid
					}
				},
				splitArea: {
					show: true,
					areaStyle: {
						color: isDark
							? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']
							: ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.04)']
					}
				},
				axisLine: {
					lineStyle: {
						color: colors.border
					}
				}
			},
			series: [
				{
					type: 'radar',
					data: [
						{
							value: values,
							name: 'Rating',
							areaStyle: {
								color: {
									type: 'radial',
									x: 0.5,
									y: 0.5,
									r: 0.5,
									colorStops: [
										{ offset: 0, color: 'rgba(245, 158, 11, 0.4)' },
										{ offset: 1, color: 'rgba(245, 158, 11, 0.1)' }
									]
								}
							},
							lineStyle: {
								color: '#f59e0b',
								width: 2
							},
							itemStyle: {
								color: '#f59e0b'
							}
						}
					]
				}
			]
		};
	});
</script>

<div class="radar-container" style:height="{height}px">
	{#if chartOptions}
		<div
			class="radar-chart"
			use:echart={{ options: chartOptions, theme: isDark ? 'dark' : 'light' }}
		></div>
	{:else}
		<div class="no-data">No rating data</div>
	{/if}
</div>

<style>
	.radar-container {
		position: relative;
		width: 100%;
	}

	.radar-chart {
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
		font-size: 0.75rem;
	}
</style>
