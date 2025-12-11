<script lang="ts">
	import { formatCurrency, formatPercent } from '$lib/utils/formatters';
	import { themeStore } from '$lib/stores/theme.svelte';

	interface Props {
		currentPrice: number;
		targetHigh?: number;
		targetLow?: number;
		targetConsensus?: number;
		targetMedian?: number;
		loading?: boolean;
	}

	let {
		currentPrice,
		targetHigh,
		targetLow,
		targetConsensus,
		targetMedian,
		loading = false
	}: Props = $props();

	const isDark = $derived(themeStore.resolvedTheme === 'dark');

	const upside = $derived(
		targetConsensus && currentPrice ? ((targetConsensus - currentPrice) / currentPrice) * 100 : null
	);

	const barWidth = 200;
	const barHeight = 24;

	const positions = $derived.by(() => {
		if (!targetHigh || !targetLow) return null;
		const range = targetHigh - targetLow;
		if (range <= 0) return null;

		const currentPos = Math.max(0, Math.min(1, (currentPrice - targetLow) / range));
		const consensusPos = targetConsensus
			? Math.max(0, Math.min(1, (targetConsensus - targetLow) / range))
			: null;

		return { currentPos, consensusPos, range };
	});
</script>

<div class="price-target-card">
	<div class="section-header">
		<h3 class="section-title">Price Target</h3>
	</div>

	{#if loading}
		<div class="loading">Loading price target data...</div>
	{:else if !targetHigh && !targetLow && !targetConsensus}
		<div class="empty">No price target data available</div>
	{:else}
		<div class="content">
			<div class="target-summary">
				{#if targetConsensus}
					<div class="consensus">
						<span class="consensus-label">Consensus Target</span>
						<span class="consensus-value">{formatCurrency(targetConsensus)}</span>
						{#if upside !== null}
							<span class="upside" class:positive={upside > 0} class:negative={upside < 0}>
								{formatPercent(upside, 1)} {upside > 0 ? 'upside' : 'downside'}
							</span>
						{/if}
					</div>
				{/if}
			</div>

			<div class="range-display">
				<div class="range-labels">
					<span class="range-low">Low: {targetLow ? formatCurrency(targetLow) : '--'}</span>
					<span class="range-high">High: {targetHigh ? formatCurrency(targetHigh) : '--'}</span>
				</div>

				{#if positions}
					{@const pos = positions}
					<div class="range-bar">
						<div class="bar-track"></div>

						<div
							class="current-marker"
							style="left: {pos.currentPos * 100}%"
							title="Current Price: {formatCurrency(currentPrice)}"
						>
							<div class="marker-line current"></div>
							<span class="marker-label current">Current</span>
						</div>

						{#if pos.consensusPos !== null}
							<div
								class="target-marker"
								style="left: {pos.consensusPos * 100}%"
								title="Consensus: {formatCurrency(targetConsensus ?? 0)}"
							>
								<div class="marker-line target"></div>
								<span class="marker-label target">Target</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			{#if targetMedian}
				<div class="targets-grid">
					<div class="target-item">
						<span class="target-label">Median Target</span>
						<span class="target-value">{formatCurrency(targetMedian)}</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.price-target-card {
		border: 1px solid var(--color-border);
		background: var(--color-paper);
	}

	.section-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-newsprint-dark);
	}

	.section-title {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
		color: var(--color-ink);
	}

	.loading,
	.empty {
		padding: 2rem;
		text-align: center;
		color: var(--color-ink-muted);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
	}

	.content {
		padding: 1rem;
	}

	.target-summary {
		margin-bottom: 1rem;
	}

	.consensus {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.consensus-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.consensus-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.upside {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		padding: 2px 8px;
		border-radius: 2px;
		background: var(--color-newsprint-dark);
	}

	.upside.positive {
		color: var(--color-gain);
	}

	.upside.negative {
		color: var(--color-loss);
	}

	.range-display {
		margin-bottom: 1rem;
	}

	.range-labels {
		display: flex;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.range-low,
	.range-high {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.range-bar {
		position: relative;
		height: 32px;
		margin-top: 8px;
	}

	.bar-track {
		position: absolute;
		top: 12px;
		left: 0;
		right: 0;
		height: 8px;
		background: linear-gradient(to right, var(--color-loss), var(--color-newsprint-dark), var(--color-gain));
		border-radius: 4px;
	}

	.current-marker,
	.target-marker {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.marker-line {
		width: 2px;
		height: 32px;
	}

	.marker-line.current {
		background: var(--color-ink);
	}

	.marker-line.target {
		background: var(--color-accent);
	}

	.marker-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5rem;
		text-transform: uppercase;
		white-space: nowrap;
		margin-top: 2px;
	}

	.marker-label.current {
		color: var(--color-ink);
	}

	.marker-label.target {
		color: var(--color-accent);
	}

	.targets-grid {
		display: flex;
		justify-content: center;
		gap: 2rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
	}

	.target-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.target-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.target-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink);
	}
</style>
