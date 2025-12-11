<script lang="ts">
	import { formatNumber, formatMarketCap } from '$lib/utils/formatters';
	import api from '$lib/utils/api';
	import { getCompanyLogoUrl } from '$lib/utils/urls';

	interface ScreenerStock {
		symbol: string;
		companyName: string;
		marketCap: number;
		sector: string;
		industry: string;
		beta: number;
		price: number;
		lastAnnualDividend: number;
		volume: number;
		exchange: string;
	}

	let stocks = $state<ScreenerStock[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	let selectedSector = $state('');
	let selectedExchange = $state('');
	let marketCapMin = $state('');
	let marketCapMax = $state('');
	let priceMin = $state('');
	let priceMax = $state('');
	let volumeMin = $state('');

	const sectors = [
		'Technology',
		'Healthcare',
		'Financial Services',
		'Consumer Cyclical',
		'Communication Services',
		'Industrials',
		'Consumer Defensive',
		'Energy',
		'Basic Materials',
		'Real Estate',
		'Utilities'
	];

	const exchanges = ['NYSE', 'NASDAQ', 'AMEX'];

	const marketCapPresets = [
		{ label: 'Mega Cap (>$200B)', min: 200000000000, max: '' },
		{ label: 'Large Cap ($10B-$200B)', min: 10000000000, max: 200000000000 },
		{ label: 'Mid Cap ($2B-$10B)', min: 2000000000, max: 10000000000 },
		{ label: 'Small Cap ($300M-$2B)', min: 300000000, max: 2000000000 },
		{ label: 'Micro Cap (<$300M)', min: '', max: 300000000 }
	];

	async function runScreener() {
		loading = true;
		error = null;

		try {
			const filters: Record<string, string | number | boolean> = {};
			if (selectedSector) filters.sector = selectedSector;
			if (selectedExchange) filters.exchange = selectedExchange;
			if (marketCapMin) filters.marketCapMin = parseInt(marketCapMin, 10);
			if (marketCapMax) filters.marketCapMax = parseInt(marketCapMax, 10);
			if (priceMin) filters.priceMin = parseFloat(priceMin);
			if (priceMax) filters.priceMax = parseFloat(priceMax);
			if (volumeMin) filters.volumeMin = parseInt(volumeMin, 10);
			filters.limit = 50;

			const response = await api.screenStocks(filters);
			if (response.success && response.data) {
				stocks = response.data;
			} else {
				error = 'Failed to fetch stocks';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to run screener';
		} finally {
			loading = false;
		}
	}

	function applyMarketCapPreset(preset: (typeof marketCapPresets)[0]) {
		marketCapMin = preset.min ? String(preset.min) : '';
		marketCapMax = preset.max ? String(preset.max) : '';
	}

	function clearFilters() {
		selectedSector = '';
		selectedExchange = '';
		marketCapMin = '';
		marketCapMax = '';
		priceMin = '';
		priceMax = '';
		volumeMin = '';
		stocks = [];
	}

	$effect(() => {
		runScreener();
	});
</script>

<svelte:head>
	<title>Stock Screener - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">Stock Screener</h1>
		<p class="text-ink-muted mt-2">Filter stocks by market cap, sector, price, and more.</p>
	</section>

	<!-- Filters -->
	<section class="col-span-full">
		<div class="filter-card">
			<h2 class="headline headline-sm mb-4">Filters</h2>

			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<!-- Sector -->
				<div>
					<label for="sector" class="byline block mb-1">Sector</label>
					<select id="sector" bind:value={selectedSector} class="input w-full">
						<option value="">All Sectors</option>
						{#each sectors as sector}
							<option value={sector}>{sector}</option>
						{/each}
					</select>
				</div>

				<!-- Exchange -->
				<div>
					<label for="exchange" class="byline block mb-1">Exchange</label>
					<select id="exchange" bind:value={selectedExchange} class="input w-full">
						<option value="">All Exchanges</option>
						{#each exchanges as exchange}
							<option value={exchange}>{exchange}</option>
						{/each}
					</select>
				</div>

				<!-- Price Range -->
				<div>
					<label class="byline block mb-1">Price Range</label>
					<div class="flex gap-2">
						<input
							type="number"
							placeholder="Min"
							bind:value={priceMin}
							class="input w-full"
							min="0"
						/>
						<input
							type="number"
							placeholder="Max"
							bind:value={priceMax}
							class="input w-full"
							min="0"
						/>
					</div>
				</div>

				<!-- Volume -->
				<div>
					<label for="volume" class="byline block mb-1">Min Volume</label>
					<input
						id="volume"
						type="number"
						placeholder="e.g., 1000000"
						bind:value={volumeMin}
						class="input w-full"
						min="0"
					/>
				</div>
			</div>

			<!-- Market Cap Presets -->
			<div class="mt-4">
				<label class="byline block mb-2">Market Cap</label>
				<div class="preset-buttons">
					{#each marketCapPresets as preset}
						<button
							onclick={() => applyMarketCapPreset(preset)}
							class="preset-btn"
							class:active={marketCapMin === String(preset.min) &&
								marketCapMax === String(preset.max)}
						>
							{preset.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="action-buttons">
				<button onclick={runScreener} class="action-btn primary" disabled={loading}>
					{loading ? 'Searching...' : 'Run Screener'}
				</button>
				<button onclick={clearFilters} class="action-btn secondary">Clear Filters</button>
			</div>
		</div>
	</section>

	<!-- Results -->
	<section class="col-span-full">
		{#if error}
			<div class="state-card error">
				<p>{error}</p>
				<button onclick={runScreener} class="btn btn-primary">Try Again</button>
			</div>
		{:else if loading}
			<div class="state-card">
				<div class="loading-spinner"></div>
				<p>Searching stocks...</p>
			</div>
		{:else if stocks.length === 0}
			<div class="state-card">
				<p>No stocks found matching your criteria.</p>
				<p class="hint">Try adjusting your filters or clearing them to see more results.</p>
			</div>
		{:else}
			<div class="results-card">
				<div class="results-header">
					<h2 class="headline headline-sm">Results</h2>
					<span class="result-count">{stocks.length} stocks</span>
				</div>
				<div class="overflow-x-auto">
					<table class="data-table">
						<thead>
							<tr>
								<th>Symbol</th>
								<th>Company</th>
								<th class="hide-mobile">Sector</th>
								<th>Price</th>
								<th>Market Cap</th>
								<th class="hide-mobile">Volume</th>
								<th class="hide-mobile">Beta</th>
								<th class="hide-mobile">Exchange</th>
							</tr>
						</thead>
						<tbody>
							{#each stocks as stock (stock.symbol)}
								<tr>
									<td>
										<a href="/ticker/{stock.symbol}" class="stock-cell">
											<img
												src={getCompanyLogoUrl(stock.symbol)}
												alt=""
												class="stock-logo"
												loading="lazy"
												onerror={(e) => {
													const img = e.currentTarget as HTMLImageElement;
													img.style.display = 'none';
												}}
											/>
											<span class="ticker-symbol">{stock.symbol}</span>
										</a>
									</td>
									<td class="company-name" title={stock.companyName}>
										{stock.companyName}
									</td>
									<td class="text-xs text-ink-muted hide-mobile">{stock.sector || '-'}</td>
									<td class="font-semibold">
										{stock.price ? `$${formatNumber(stock.price)}` : '-'}
									</td>
									<td>{stock.marketCap ? formatMarketCap(stock.marketCap) : '-'}</td>
									<td class="hide-mobile">{stock.volume ? formatNumber(stock.volume) : '-'}</td>
									<td class="hide-mobile">{stock.beta ? stock.beta.toFixed(2) : '-'}</td>
									<td class="text-xs text-ink-muted hide-mobile">{stock.exchange}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</section>
</div>

<style>
	/* Filter Card */
	.filter-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.25rem;
	}

	.filter-card :global(.input),
	.filter-card :global(select) {
		border-radius: 6px;
	}

	/* Preset Buttons */
	.preset-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.preset-btn {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 20px;
		background: var(--color-paper);
		color: var(--color-ink);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.preset-btn:hover {
		border-color: var(--color-ink);
		background: var(--color-newsprint);
	}

	.preset-btn.active {
		background: var(--color-ink);
		color: var(--color-paper);
		border-color: var(--color-ink);
	}

	/* Action Buttons */
	.action-buttons {
		display: flex;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}

	.action-btn {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.625rem 1.25rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn.primary {
		background: var(--color-ink);
		color: var(--color-paper);
		border: 1px solid var(--color-ink);
	}

	.action-btn.primary:hover:not(:disabled) {
		background: var(--color-ink-muted);
	}

	.action-btn.primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.action-btn.secondary {
		background: var(--color-paper);
		color: var(--color-ink);
		border: 1px solid var(--color-border);
	}

	.action-btn.secondary:hover {
		border-color: var(--color-ink);
		background: var(--color-newsprint);
	}

	/* Results Card */
	.results-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1rem;
		margin-top: 1.5rem;
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.result-count {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-ink-muted);
		background: var(--color-newsprint);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	/* Stock Cell with Logo */
	.stock-cell {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: inherit;
	}

	.stock-logo {
		width: 20px;
		height: 20px;
		object-fit: contain;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.stock-cell .ticker-symbol {
		font-family: var(--font-mono);
		font-weight: 700;
		color: var(--color-ink);
	}

	.stock-cell:hover .ticker-symbol {
		text-decoration: underline;
	}

	.company-name {
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* State Cards */
	.state-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 3rem 1.5rem;
		text-align: center;
		margin-top: 1.5rem;
	}

	.state-card p {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		margin-bottom: 1rem;
	}

	.state-card .hint {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.state-card.error p {
		color: var(--color-loss);
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-ink);
		border-radius: 50%;
		margin: 0 auto 1rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Mobile Responsive */
	@media (max-width: 768px) {
		.filter-card {
			padding: 1rem;
		}

		.preset-buttons {
			gap: 0.375rem;
		}

		.preset-btn {
			font-size: 0.625rem;
			padding: 0.25rem 0.5rem;
		}

		.results-card :global(.data-table) {
			font-size: 0.75rem;
		}

		.results-card :global(th),
		.results-card :global(td) {
			padding: 0.5rem 0.25rem;
		}

		.hide-mobile {
			display: none;
		}

		.company-name {
			max-width: 8rem;
		}

		.stock-logo {
			width: 16px;
			height: 16px;
		}
	}
</style>
