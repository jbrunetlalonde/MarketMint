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
		</div>
	{:else if error}
		<p class="error-text">{error}</p>
	{:else if data?.latest}
		{@const trend = getTrendSignal(data.latest.price, data.latest.sma20, data.latest.sma50)}
		<table class="indicators-table">
			<thead>
				<tr>
					<th>Trend</th>
					<th>RSI (14)</th>
					<th>SMA (20)</th>
					<th>SMA (50)</th>
					<th>EMA (12)</th>
					<th>EMA (26)</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class={trend.class}>{trend.label}</td>
					<td>
						<span class={getRsiClass(data.latest.rsi)}>{formatValue(data.latest.rsi)}</span>
						{#if data.latest.rsi != null}
							<span class="rsi-badge {getRsiClass(data.latest.rsi)}">{getRsiLabel(data.latest.rsi)}</span>
						{/if}
					</td>
					<td>${formatValue(data.latest.sma20)}</td>
					<td>${formatValue(data.latest.sma50)}</td>
					<td>${formatValue(data.latest.ema12)}</td>
					<td>${formatValue(data.latest.ema26)}</td>
				</tr>
			</tbody>
		</table>
	{:else}
		<p class="no-data">No technical data available</p>
	{/if}
</div>

<style>
	.tech-indicators {
		margin-top: 0;
	}

	.loading-state {
		padding: 1rem 0;
	}

	.skeleton-row {
		height: 3rem;
		background: var(--color-newsprint-dark);
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

	.indicators-table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono);
		border: 1px solid var(--color-border);
	}

	.indicators-table th {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-ink-muted);
		padding: 0.625rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
		border-right: 1px solid var(--color-border);
		background: var(--color-newsprint);
	}

	.indicators-table th:last-child {
		border-right: none;
	}

	.indicators-table td {
		font-size: 0.875rem;
		font-weight: 600;
		padding: 0.75rem;
		text-align: left;
		border-right: 1px solid var(--color-border);
		color: var(--color-ink);
	}

	.indicators-table td:last-child {
		border-right: none;
	}

	.indicators-table td.bullish {
		color: var(--color-gain);
		font-weight: 700;
	}

	.indicators-table td.bearish {
		color: var(--color-loss);
		font-weight: 700;
	}

	.indicators-table td.neutral {
		color: var(--color-ink-muted);
	}

	.overbought {
		color: var(--color-loss);
	}

	.oversold {
		color: var(--color-gain);
	}

	.rsi-badge {
		font-size: 0.5rem;
		font-weight: 600;
		text-transform: uppercase;
		padding: 0.125rem 0.375rem;
		border-radius: 2px;
		margin-left: 0.5rem;
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

	.rsi-badge.neutral {
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	@media (max-width: 768px) {
		.indicators-table {
			display: block;
			overflow-x: auto;
		}

		.indicators-table th,
		.indicators-table td {
			white-space: nowrap;
			padding: 0.5rem;
			font-size: 0.75rem;
		}
	}
</style>
