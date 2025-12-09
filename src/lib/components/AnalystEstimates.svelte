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
		return `FY ${date.getFullYear()}`;
	}
</script>

<div class="analyst-estimates">
	<div class="header">
		<h3>Analyst Estimates</h3>
		<span class="period-label">Annual</span>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="skeleton-table">
				{#each Array(3) as _, i (i)}
					<div class="skeleton-row"></div>
				{/each}
			</div>
		</div>
	{:else if error}
		<p class="error-text">{error}</p>
	{:else if estimates.length === 0}
		<p class="no-data">No analyst estimates available</p>
	{:else}
		<div class="estimates-table-wrapper">
			<table class="estimates-table">
				<thead>
					<tr>
						<th>Period</th>
						<th>Est. Revenue</th>
						<th>Est. EPS</th>
						<th>Analysts</th>
					</tr>
				</thead>
				<tbody>
					{#each estimates as est (est.date)}
						<tr>
							<td class="period-cell">
								{formatYear(est.date)}
							</td>
							<td>
								<div class="estimate-range">
									<span class="estimate-avg">{formatCompact(est.estimatedRevenueAvg)}</span>
									<span class="estimate-bounds">
										{formatCompact(est.estimatedRevenueLow)} - {formatCompact(est.estimatedRevenueHigh)}
									</span>
								</div>
							</td>
							<td>
								<div class="estimate-range">
									<span class="estimate-avg">${est.estimatedEpsAvg?.toFixed(2) ?? '--'}</span>
									<span class="estimate-bounds">
										${est.estimatedEpsLow?.toFixed(2) ?? '--'} - ${est.estimatedEpsHigh?.toFixed(2) ?? '--'}
									</span>
								</div>
							</td>
							<td class="analysts-cell">
								{#if est.numberAnalystsEstimatedEps || est.numberAnalystEstimatedRevenue}
									<button class="analysts-btn" onclick={() => showDetails = true}>
										{est.numberAnalystsEstimatedEps || est.numberAnalystEstimatedRevenue}
									</button>
								{:else}
									--
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
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
		padding: 1rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid var(--color-ink);
	}

	.header h3 {
		font-family: var(--font-headline);
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
	}

	.period-label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.25rem 0.5rem;
		background: var(--color-ink);
		color: var(--color-paper);
	}

	.loading-state {
		padding: 0.5rem 0;
	}

	.skeleton-table {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-row {
		height: 2.5rem;
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
		padding: 1.5rem;
	}

	.error-text {
		color: var(--color-loss);
	}

	.estimates-table-wrapper {
		overflow-x: auto;
	}

	.estimates-table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.estimates-table th {
		text-align: left;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	.estimates-table td {
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		vertical-align: top;
	}

	.estimates-table tr:last-child td {
		border-bottom: none;
	}

	.period-cell {
		font-weight: 700;
		white-space: nowrap;
	}

	.estimate-range {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.estimate-avg {
		font-weight: 700;
		color: var(--color-ink);
	}

	.estimate-bounds {
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.analysts-cell {
		text-align: center;
		color: var(--color-ink-muted);
	}

	.analysts-btn {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
		background: transparent;
		border: none;
		color: var(--color-ink);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 2px;
		transition: all 0.15s ease;
	}

	.analysts-btn:hover {
		background: var(--color-ink);
		color: var(--color-paper);
		text-decoration: none;
	}
</style>
