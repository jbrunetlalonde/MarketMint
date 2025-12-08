<script lang="ts">
	import { formatNumber, formatMarketCap } from '$lib/utils/formatters';
	import api from '$lib/utils/api';

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
		<div class="card">
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
				<div class="flex flex-wrap gap-2">
					{#each marketCapPresets as preset}
						<button
							onclick={() => applyMarketCapPreset(preset)}
							class="btn btn-sm btn-ghost"
							class:btn-primary={marketCapMin === String(preset.min) &&
								marketCapMax === String(preset.max)}
						>
							{preset.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-2 mt-6">
				<button onclick={runScreener} class="btn btn-primary" disabled={loading}>
					{loading ? 'Searching...' : 'Run Screener'}
				</button>
				<button onclick={clearFilters} class="btn btn-secondary">Clear Filters</button>
			</div>
		</div>
	</section>

	<!-- Results -->
	<section class="col-span-full">
		{#if error}
			<div class="card text-center py-8">
				<p class="text-red-600 mb-4">{error}</p>
				<button onclick={runScreener} class="btn btn-primary">Try Again</button>
			</div>
		{:else if loading}
			<div class="card text-center py-8">
				<p class="text-ink-muted">Searching stocks...</p>
			</div>
		{:else if stocks.length === 0}
			<div class="card text-center py-8">
				<p class="text-ink-muted">No stocks found matching your criteria. Try adjusting filters.</p>
			</div>
		{:else}
			<div class="card">
				<div class="flex justify-between items-center mb-4">
					<h2 class="headline headline-sm">Results ({stocks.length} stocks)</h2>
				</div>
				<div class="overflow-x-auto">
					<table class="data-table">
						<thead>
							<tr>
								<th>Symbol</th>
								<th>Company</th>
								<th>Sector</th>
								<th>Price</th>
								<th>Market Cap</th>
								<th>Volume</th>
								<th>Beta</th>
								<th>Exchange</th>
							</tr>
						</thead>
						<tbody>
							{#each stocks as stock (stock.symbol)}
								<tr>
									<td>
										<a href="/ticker/{stock.symbol}" class="ticker-symbol">
											{stock.symbol}
										</a>
									</td>
									<td class="max-w-48 truncate" title={stock.companyName}>
										{stock.companyName}
									</td>
									<td class="text-xs text-ink-muted">{stock.sector || '-'}</td>
									<td class="font-semibold">
										{stock.price ? `$${formatNumber(stock.price)}` : '-'}
									</td>
									<td>{stock.marketCap ? formatMarketCap(stock.marketCap) : '-'}</td>
									<td>{stock.volume ? formatNumber(stock.volume) : '-'}</td>
									<td>{stock.beta ? stock.beta.toFixed(2) : '-'}</td>
									<td class="text-xs text-ink-muted">{stock.exchange}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</section>
</div>
