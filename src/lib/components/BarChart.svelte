<script lang="ts">
	import { echart } from '$lib/actions/echarts';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { buildSimpleBarOptions, getTheme } from '$lib/utils/chart-options';

	interface DataPoint {
		label: string;
		value: number;
	}

	interface Props {
		data: DataPoint[];
		label?: string;
		color?: string;
		height?: number;
		horizontal?: boolean;
		formatValue?: (value: number) => string;
	}

	let {
		data,
		label = 'Value',
		color = '#0066cc',
		height = 200,
		horizontal = false,
		formatValue = (v: number) => v.toLocaleString()
	}: Props = $props();

	const isDark = $derived(themeStore.resolvedTheme === 'dark');
	const colors = $derived(getTheme(isDark));

	const chartOptions = $derived(
		data.length > 0
			? buildSimpleBarOptions(data, colors, { label, horizontal, formatValue })
			: null
	);
</script>

<div class="chart-container" style="height: {height}px;">
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
		font-size: 0.875rem;
	}
</style>
