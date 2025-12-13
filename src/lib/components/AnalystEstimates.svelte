<script lang="ts">
	import { onMount } from 'svelte';
	import { API_BASE } from '$lib/utils/api/request';
	import { formatCompact } from '$lib/utils/formatters';
	import AnalystDetails from './AnalystDetails.svelte';

	interface Props {
		symbol: string;
	}

	let { symbol }: Props = $props();

	interface Estimate {
		date: string;
		symbol: string;
		estimatedRevenueLow: number;
		estimatedRevenueHigh: number;
		estimatedRevenueAvg: number;
		estimatedEpsLow: number;
		estimatedEpsHigh: number;
		estimatedEpsAvg: number;
		numberAnalystEstimatedRevenue: number;
		numberAnalystsEstimatedEps: number;
	}

	let estimates = $state<Estimate[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showDetails = $state(false);

	async function loadEstimates() {
		if (!symbol) return;
		loading = true;
		error = null;
		try {
			const response = await fetch(`${API_BASE}/api/financials/${symbol}/estimates?period=annual&limit=4`);
			const result = await response.json();
			if (result.success && result.data) {
				estimates = result.data;
			} else {
				error = result.error?.message || 'Failed to load estimates';
			}
		} catch {
			error = 'Failed to load analyst estimates';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadEstimates();
	});

	$effect(() => {
		if (symbol) {
			loadEstimates();
		}
	});

	function formatYear(dateStr: string): string {
		const date = new Date(dateStr);
		const currentYear = new Date().getFullYear();
		const year = date.getFullYear();
		if (year === currentYear) return `FY${year} (Current)`;
		if (year === currentYear + 1) return `FY${year} (Next)`;
		return `FY${year}`;
	}

	function isFutureYear(dateStr: string): boolean {
		const date = new Date(dateStr);
		return date.getFullYear() >= new Date().getFullYear();
	}
</script>

<div class="analyst-estimates">
	<div class="header">
		<h3>Analyst Estimates</h3>
		<button class="details-btn" onclick={() => showDetails = true} type="button">
			View Details
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
				<path d="M5 12h14M12 5l7 7-7 7"/>
			</svg>
		</button>
	</div>

	{#if loading}
		<div class="loading-state">
			{#each Array(3) as _, i (i)}
				<div class="skeleton-card"></div>
			{/each}
		</div>
	{:else if error}
		<div class="error-state">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
				<circle cx="12" cy="12" r="10"/>
				<line x1="12" y1="8" x2="12" y2="12"/>
				<line x1="12" y1="16" x2="12.01" y2="16"/>
			</svg>
			<p>{error}</p>
		</div>
	{:else if estimates.length === 0}
		<div class="empty-state">
			<p>No analyst estimates available</p>
		</div>
	{:else}
		<div class="estimates-grid">
			{#each estimates as est (est.date)}
				{@const isFuture = isFutureYear(est.date)}
				<div class="estimate-card" class:future={isFuture}>
					<div class="card-header">
						<span class="period-label">{formatYear(est.date)}</span>
						{#if est.numberAnalystsEstimatedEps || est.numberAnalystEstimatedRevenue}
							<span class="analyst-count">
								{est.numberAnalystsEstimatedEps || est.numberAnalystEstimatedRevenue} analysts
							</span>
						{/if}
					</div>

					<div class="metrics">
						<div class="metric">
							<div class="metric-header">
								<span class="metric-label">Revenue</span>
							</div>
							<div class="metric-value">{formatCompact(est.estimatedRevenueAvg)}</div>
							<div class="metric-range">
								<span class="range-label">Range:</span>
								{formatCompact(est.estimatedRevenueLow)} - {formatCompact(est.estimatedRevenueHigh)}
							</div>
						</div>

						<div class="metric">
							<div class="metric-header">
								<span class="metric-label">EPS</span>
							</div>
							<div class="metric-value">${est.estimatedEpsAvg?.toFixed(2) ?? '--'}</div>
							<div class="metric-range">
								<span class="range-label">Range:</span>
								${est.estimatedEpsLow?.toFixed(2) ?? '--'} - ${est.estimatedEpsHigh?.toFixed(2) ?? '--'}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showDetails}
	<AnalystDetails {symbol} onClose={() => showDetails = false} />
{/if}

<style>
	.analyst-estimates {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.875rem 1rem;
		background: var(--color-newsprint-dark);
		border-bottom: 1px solid var(--color-border);
	}

	.header h3 {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0;
		color: var(--color-ink);
	}

	.details-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.375rem 0.625rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-ink-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.details-btn:hover {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: var(--color-paper);
	}

	.details-btn svg {
		transition: transform 0.2s ease;
	}

	.details-btn:hover svg {
		transform: translateX(2px);
	}

	.loading-state {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
		padding: 1rem;
	}

	.skeleton-card {
		height: 120px;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.error-state, .empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2rem;
		text-align: center;
	}

	.error-state {
		color: var(--color-loss);
	}

	.error-state p, .empty-state p {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		margin: 0;
		color: var(--color-ink-muted);
	}

	.estimates-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
		padding: 1rem;
	}

	.estimate-card {
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 1rem;
		transition: all 0.2s ease;
	}

	.estimate-card:hover {
		border-color: var(--color-ink-muted);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.estimate-card.future {
		background: var(--color-paper);
		border-color: var(--color-accent);
		border-width: 2px;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.875rem;
		padding-bottom: 0.625rem;
		border-bottom: 1px solid var(--color-border);
	}

	.period-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.estimate-card.future .period-label {
		color: var(--color-accent);
	}

	.analyst-count {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		color: var(--color-ink-muted);
		background: var(--color-newsprint-dark);
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
	}

	.metrics {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.metric {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.metric-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.metric-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.metric-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-ink);
		line-height: 1.2;
	}

	.metric-range {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.range-label {
		font-weight: 500;
		opacity: 0.7;
	}

	@media (max-width: 640px) {
		.estimates-grid {
			grid-template-columns: 1fr;
		}

		.header {
			flex-direction: column;
			gap: 0.75rem;
			align-items: flex-start;
		}

		.details-btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
