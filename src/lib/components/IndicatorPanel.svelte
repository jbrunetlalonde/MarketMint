<script lang="ts">
	import { echart } from '$lib/actions/echarts';
	import { themeStore } from '$lib/stores/theme.svelte';
	import {
		buildRSIOptions,
		buildMACDOptions,
		getTheme,
		type IndicatorData
	} from '$lib/utils/chart-options';

	interface Props {
		data: IndicatorData[];
		type: 'rsi' | 'macd';
		height?: number;
	}

	let { data, type, height = 120 }: Props = $props();

	const isDark = $derived(themeStore.resolvedTheme === 'dark');
	const colors = $derived(getTheme(isDark));

	const chartOptions = $derived.by(() => {
		if (data.length === 0) return null;
		if (type === 'rsi') return buildRSIOptions(data, colors);
		return buildMACDOptions(data, colors);
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
	{#if chartOptions}
		<div
			class="chart-wrapper"
			style:height="{height}px"
			use:echart={{ options: chartOptions, theme: isDark ? 'dark' : 'light' }}
		></div>
	{:else}
		<div class="chart-wrapper empty" style:height="{height}px">
			<span>No data</span>
		</div>
	{/if}
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

	.chart-wrapper.empty {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-newsprint);
		color: var(--color-ink-muted);
		font-size: 0.75rem;
	}
</style>
