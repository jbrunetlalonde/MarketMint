<script lang="ts">
	import { onMount } from 'svelte';
	import { API_BASE } from '$lib/utils/api/request';

	interface TreasuryRates {
		date: string;
		month3: number | null;
		year2: number | null;
		year10: number | null;
		year30: number | null;
	}

	interface EconomicData {
		treasury: TreasuryRates | null;
		gdp: { date: string; value: number } | null;
		cpi: { date: string; value: number } | null;
		unemployment: { date: string; value: number } | null;
	}

	let loading = $state(true);
	let error = $state<string | null>(null);
	let data = $state<EconomicData | null>(null);

	async function loadData() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`${API_BASE}/api/economic/indicators`);
			const result = await response.json();

			if (result.success && result.data) {
				data = result.data;
			} else {
				error = 'Failed to load data';
			}
		} catch {
			error = 'Failed to load economic data';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadData();
	});

	function formatRate(val: number | null | undefined): string {
		if (val == null) return '--';
		return val.toFixed(2) + '%';
	}

	function formatPercent(val: number | null | undefined): string {
		if (val == null) return '--';
		return val.toFixed(1) + '%';
	}

	// Calculate yield curve spread (10Y - 2Y)
	const yieldSpread = $derived.by(() => {
		if (!data?.treasury?.year10 || !data?.treasury?.year2) return null;
		return data.treasury.year10 - data.treasury.year2;
	});

	const spreadClass = $derived(
		yieldSpread == null ? '' : yieldSpread < 0 ? 'inverted' : 'normal'
	);
</script>

<div class="economic-snapshot">
	{#if loading}
		<div class="loading-state">
			<div class="skeleton-row"></div>
			<div class="skeleton-row"></div>
		</div>
	{:else if error}
		<p class="error-text">{error}</p>
	{:else if data}
		<div class="indicators-grid">
			<!-- Treasury Yields -->
			<div class="indicator-group">
				<span class="group-label">Treasury Yields</span>
				<div class="rate-row">
					<span class="rate-label">3M</span>
					<span class="rate-value">{formatRate(data.treasury?.month3)}</span>
				</div>
				<div class="rate-row">
					<span class="rate-label">2Y</span>
					<span class="rate-value">{formatRate(data.treasury?.year2)}</span>
				</div>
				<div class="rate-row">
					<span class="rate-label">10Y</span>
					<span class="rate-value">{formatRate(data.treasury?.year10)}</span>
				</div>
				<div class="rate-row">
					<span class="rate-label">30Y</span>
					<span class="rate-value">{formatRate(data.treasury?.year30)}</span>
				</div>
				{#if yieldSpread != null}
					<div class="spread-row {spreadClass}">
						<span class="spread-label">10Y-2Y Spread</span>
						<span class="spread-value">{yieldSpread >= 0 ? '+' : ''}{yieldSpread.toFixed(2)}%</span>
					</div>
				{/if}
			</div>

			<!-- Economic Indicators -->
			<div class="indicator-group">
				<span class="group-label">Key Indicators</span>
				<div class="rate-row">
					<span class="rate-label">GDP Growth</span>
					<span class="rate-value">{formatPercent(data.gdp?.value)}</span>
				</div>
				<div class="rate-row">
					<span class="rate-label">CPI (Inflation)</span>
					<span class="rate-value">{formatPercent(data.cpi?.value)}</span>
				</div>
				<div class="rate-row">
					<span class="rate-label">Unemployment</span>
					<span class="rate-value">{formatPercent(data.unemployment?.value)}</span>
				</div>
			</div>
		</div>

		<a href="/economic" class="view-more-link">
			View Full Economic Data
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M5 12h14M12 5l7 7-7 7"></path>
			</svg>
		</a>
	{:else}
		<p class="no-data">No economic data available</p>
	{/if}
</div>

<style>
	.economic-snapshot {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		padding: 1rem;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-row {
		height: 1.5rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
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
		padding: 0.5rem;
	}

	.error-text {
		color: var(--color-loss);
	}

	.indicators-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.indicator-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.group-label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		padding-bottom: 0.25rem;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 0.25rem;
	}

	.rate-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.125rem 0;
	}

	.rate-label {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
	}

	.rate-value {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.spread-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0.5rem;
		margin-top: 0.25rem;
		background: var(--color-newsprint);
		border-radius: 2px;
	}

	.spread-label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}

	.spread-value {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
	}

	.spread-row.normal .spread-value {
		color: var(--color-gain);
	}

	.spread-row.inverted .spread-value {
		color: var(--color-loss);
	}

	.view-more-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		margin-top: 1rem;
		padding: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-ink);
		text-decoration: none;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		transition: all 0.15s ease;
	}

	.view-more-link:hover {
		background: var(--color-ink);
		color: var(--color-paper);
		border-color: var(--color-ink);
	}

	.view-more-link svg {
		width: 0.875rem;
		height: 0.875rem;
	}
</style>
