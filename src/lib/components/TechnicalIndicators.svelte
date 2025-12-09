<script lang="ts">
	import { onMount } from 'svelte';
	import { API_BASE } from '$lib/utils/api/request';

	interface Props {
		symbol: string;
	}

	let { symbol }: Props = $props();

	interface TechData {
		latest: {
			sma20: number | null;
			sma50: number | null;
			ema12: number | null;
			ema26: number | null;
			rsi: number | null;
			price: number | null;
			date: string | null;
		};
	}

	let loading = $state(true);
	let error = $state<string | null>(null);
	let data = $state<TechData | null>(null);

	async function loadIndicators() {
		if (!symbol) return;
		loading = true;
		error = null;

		try {
			const response = await fetch(`${API_BASE}/api/technicals/${symbol}/all`);
			const result = await response.json();

			if (result.success && result.data) {
				data = result.data;
			} else {
				error = result.error?.message || 'Failed to load indicators';
			}
		} catch (err) {
			error = 'Failed to load technical indicators';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadIndicators();
	});

	// Reactive reload when symbol changes
	$effect(() => {
		if (symbol) {
			loadIndicators();
		}
	});

	function formatValue(val: number | null | undefined): string {
		if (val == null) return '--';
		return val.toFixed(2);
	}

	function getRsiClass(rsi: number | null): string {
		if (rsi == null) return '';
		if (rsi >= 70) return 'overbought';
		if (rsi <= 30) return 'oversold';
		return 'neutral';
	}

	function getRsiLabel(rsi: number | null): string {
		if (rsi == null) return '';
		if (rsi >= 70) return 'Overbought';
		if (rsi <= 30) return 'Oversold';
		return 'Neutral';
	}

	function getTrendSignal(price: number | null, sma20: number | null, sma50: number | null): { label: string; class: string } {
		if (price == null || sma20 == null || sma50 == null) {
			return { label: '--', class: '' };
		}
		if (price > sma20 && sma20 > sma50) {
			return { label: 'Bullish', class: 'bullish' };
		}
		if (price < sma20 && sma20 < sma50) {
			return { label: 'Bearish', class: 'bearish' };
		}
		return { label: 'Mixed', class: 'neutral' };
	}
</script>

<div class="tech-indicators">
	{#if loading}
		<div class="loading-state">
			<div class="skeleton-row"></div>
			<div class="skeleton-row"></div>
		</div>
	{:else if error}
		<p class="error-text">{error}</p>
	{:else if data?.latest}
		{@const trend = getTrendSignal(data.latest.price, data.latest.sma20, data.latest.sma50)}
		<div class="indicators-grid">
			<!-- Trend Signal -->
			<div class="indicator-card signal-card">
				<span class="indicator-label">Trend</span>
				<span class="indicator-value {trend.class}">{trend.label}</span>
			</div>

			<!-- RSI -->
			<div class="indicator-card">
				<span class="indicator-label">RSI (14)</span>
				<div class="rsi-display">
					<span class="indicator-value {getRsiClass(data.latest.rsi)}">{formatValue(data.latest.rsi)}</span>
					{#if data.latest.rsi != null}
						<span class="rsi-badge {getRsiClass(data.latest.rsi)}">{getRsiLabel(data.latest.rsi)}</span>
					{/if}
				</div>
			</div>

			<!-- Moving Averages -->
			<div class="indicator-card">
				<span class="indicator-label">SMA (20)</span>
				<span class="indicator-value">${formatValue(data.latest.sma20)}</span>
			</div>

			<div class="indicator-card">
				<span class="indicator-label">SMA (50)</span>
				<span class="indicator-value">${formatValue(data.latest.sma50)}</span>
			</div>

			<div class="indicator-card">
				<span class="indicator-label">EMA (12)</span>
				<span class="indicator-value">${formatValue(data.latest.ema12)}</span>
			</div>

			<div class="indicator-card">
				<span class="indicator-label">EMA (26)</span>
				<span class="indicator-value">${formatValue(data.latest.ema26)}</span>
			</div>
		</div>
	{:else}
		<p class="no-data">No technical data available</p>
	{/if}
</div>

<style>
	.tech-indicators {
		margin-top: 1rem;
	}

	.loading-state {
		display: flex;
		gap: 1rem;
	}

	.skeleton-row {
		flex: 1;
		height: 3rem;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.error-text, .no-data {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		text-align: center;
		padding: 1rem;
	}

	.error-text {
		color: var(--color-loss);
	}

	.indicators-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.75rem;
	}

	.indicator-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.signal-card {
		background: var(--color-newsprint);
	}

	.indicator-label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.indicator-value {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.indicator-value.bullish {
		color: var(--color-gain);
	}

	.indicator-value.bearish {
		color: var(--color-loss);
	}

	.indicator-value.neutral {
		color: var(--color-ink-muted);
	}

	.indicator-value.overbought {
		color: var(--color-loss);
	}

	.indicator-value.oversold {
		color: var(--color-gain);
	}

	.rsi-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.rsi-badge {
		font-family: var(--font-mono);
		font-size: 0.5rem;
		font-weight: 600;
		text-transform: uppercase;
		padding: 0.125rem 0.375rem;
		border-radius: 2px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.rsi-badge.overbought {
		background: rgba(239, 68, 68, 0.1);
		color: var(--color-loss);
	}

	.rsi-badge.oversold {
		background: rgba(16, 185, 129, 0.1);
		color: var(--color-gain);
	}

	@media (max-width: 900px) {
		.indicators-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 500px) {
		.indicators-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
