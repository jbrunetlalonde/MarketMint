<script lang="ts">
	import { echart } from '$lib/actions/echarts';
	import { themeStore } from '$lib/stores/theme.svelte';
	import {
		buildCandlestickOptions,
		getTheme,
		type OHLCData,
		type IndicatorData
	} from '$lib/utils/chart-options';

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

	const isDark = $derived(themeStore.resolvedTheme === 'dark');
	const colors = $derived(getTheme(isDark));

	const chartOptions = $derived(
		data.length > 0
			? buildCandlestickOptions(data, colors, { showVolume, showSMA, showEMA, showBollinger })
			: null
	);
</script>

{#if chartOptions}
	<div
		class="chart-wrapper"
		style:height="{height}px"
		use:echart={{ options: chartOptions, theme: isDark ? 'dark' : 'light' }}
	></div>
{:else}
	<div class="chart-wrapper empty" style:height="{height}px">
		<span>No data available</span>
	</div>
{/if}

<style>
	.chart-wrapper {
		width: 100%;
		position: relative;
		min-height: 300px;
	}

	.chart-wrapper.empty {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-newsprint);
		color: var(--color-ink-muted);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
	}

	@media (min-width: 768px) {
		.chart-wrapper {
			min-height: 350px;
		}
	}

	@media (min-width: 1200px) {
		.chart-wrapper {
			min-height: 400px;
		}
	}
</style>
