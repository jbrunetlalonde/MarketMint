<script lang="ts">
	import { onMount } from 'svelte';
	import { quotes } from '$lib/stores/quotes.svelte';
	import { formatPercent } from '$lib/utils/formatters';

	const SECTOR_ETFS = [
		{ ticker: 'XLK', name: 'Technology' },
		{ ticker: 'XLV', name: 'Healthcare' },
		{ ticker: 'XLF', name: 'Financials' },
		{ ticker: 'XLE', name: 'Energy' },
		{ ticker: 'XLI', name: 'Industrials' },
		{ ticker: 'XLP', name: 'Staples' },
		{ ticker: 'XLY', name: 'Discretionary' },
		{ ticker: 'XLU', name: 'Utilities' },
		{ ticker: 'XLB', name: 'Materials' },
		{ ticker: 'XLRE', name: 'Real Estate' },
		{ ticker: 'XLC', name: 'Comms' }
	];

	let loading = $state(true);

	const sectorData = $derived(
		SECTOR_ETFS.map((sector) => {
			const quote = quotes.getQuote(sector.ticker);
			return {
				...sector,
				changePercent: quote?.changePercent ?? null,
				price: quote?.price ?? null
			};
		})
			.filter((s) => s.changePercent !== null)
			.sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
	);

	const maxAbsChange = $derived(
		Math.max(...sectorData.map((s) => Math.abs(s.changePercent ?? 0)), 1)
	);

	onMount(async () => {
		const tickers = SECTOR_ETFS.map((s) => s.ticker);
		await quotes.fetchBulkQuotes(tickers);
		quotes.subscribeMany(tickers);
		loading = false;
	});
</script>

<div class="sector-performance">
	{#if loading}
		<div class="loading">
			{#each Array(5) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if sectorData.length === 0}
		<p class="no-data">No sector data available</p>
	{:else}
		<div class="sector-list">
			{#each sectorData as sector (sector.ticker)}
				{@const isPositive = (sector.changePercent ?? 0) >= 0}
				{@const barWidth = Math.abs((sector.changePercent ?? 0) / maxAbsChange) * 100}
				<a href="/ticker/{sector.ticker}" class="sector-row">
					<span class="sector-name">{sector.name}</span>
					<div class="bar-container">
						<div
							class="bar"
							class:positive={isPositive}
							class:negative={!isPositive}
							style="width: {barWidth}%"
						></div>
					</div>
					<span class="sector-change" class:positive={isPositive} class:negative={!isPositive}>
						{sector.changePercent !== null ? formatPercent(sector.changePercent) : '--'}
					</span>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.sector-performance {
		margin-top: 0.5rem;
	}

	.loading {
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
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}

	.no-data {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		text-align: center;
		padding: 1rem 0;
	}

	.sector-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.sector-row {
		display: grid;
		grid-template-columns: 80px 1fr 50px;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
		text-decoration: none;
		color: inherit;
		transition: background-color 0.1s;
		border-radius: 2px;
	}

	.sector-row:hover {
		background-color: var(--color-newsprint-dark);
	}

	.sector-name {
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--color-ink-light);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bar-container {
		height: 0.5rem;
		background: var(--color-newsprint-dark);
		border-radius: 1px;
		overflow: hidden;
	}

	.bar {
		height: 100%;
		border-radius: 1px;
		transition: width 0.3s ease;
	}

	.bar.positive {
		background: var(--color-gain);
	}

	.bar.negative {
		background: var(--color-loss);
	}

	.sector-change {
		font-size: 0.7rem;
		font-weight: 600;
		text-align: right;
		font-family: var(--font-mono);
	}

	.sector-change.positive {
		color: var(--color-gain);
	}

	.sector-change.negative {
		color: var(--color-loss);
	}
</style>
