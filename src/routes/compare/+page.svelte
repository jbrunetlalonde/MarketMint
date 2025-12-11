<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import api from '$lib/utils/api';
	import { getCompanyLogoUrl } from '$lib/utils/urls';
	import { formatCurrency, formatPercent, formatCompact } from '$lib/utils/formatters';
	import ComparisonTable from '$lib/components/ComparisonTable.svelte';

	interface StockData {
		ticker: string;
		name?: string;
		price?: number | null;
		changePercent?: number | null;
		marketCap?: number | null;
		fiftyTwoWeekHigh?: number | null;
		fiftyTwoWeekLow?: number | null;
		volume?: number | null;
		peRatio?: number | null;
		eps?: number | null;
		dividendYield?: number | null;
		grossMargin?: number | null;
		operatingMargin?: number | null;
		netMargin?: number | null;
		roe?: number | null;
		roa?: number | null;
		revenueGrowth?: number | null;
		epsGrowth?: number | null;
		debtToEquity?: number | null;
		currentRatio?: number | null;
		freeCashFlow?: number | null;
		pbRatio?: number | null;
		evToEbitda?: number | null;
		pegRatio?: number | null;
	}

	interface SearchResult {
		symbol: string;
		name: string;
		exchange?: string;
	}

	// Get symbols from URL
	const urlSymbols = $derived(() => {
		const symbolsParam = page.url.searchParams.get('symbols');
		if (!symbolsParam) return [];
		return symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 2);
	});

	let loading = $state(false);
	let stock1 = $state<StockData | null>(null);
	let stock2 = $state<StockData | null>(null);

	// Search state
	let search1 = $state('');
	let search2 = $state('');
	let results1 = $state<SearchResult[]>([]);
	let results2 = $state<SearchResult[]>([]);
	let searching1 = $state(false);
	let searching2 = $state(false);
	let showResults1 = $state(false);
	let showResults2 = $state(false);

	let debounceTimer1: ReturnType<typeof setTimeout>;
	let debounceTimer2: ReturnType<typeof setTimeout>;

	async function searchSymbols(query: string, which: 1 | 2) {
		if (query.length < 1) {
			if (which === 1) results1 = [];
			else results2 = [];
			return;
		}

		if (which === 1) searching1 = true;
		else searching2 = true;

		try {
			const res = await api.searchSymbols(query);
			if (res.success && res.data) {
				if (which === 1) results1 = res.data.slice(0, 8);
				else results2 = res.data.slice(0, 8);
			}
		} catch {
			// Ignore search errors
		} finally {
			if (which === 1) searching1 = false;
			else searching2 = false;
		}
	}

	function handleSearchInput(query: string, which: 1 | 2) {
		if (which === 1) {
			search1 = query;
			showResults1 = true;
			clearTimeout(debounceTimer1);
			debounceTimer1 = setTimeout(() => searchSymbols(query, 1), 200);
		} else {
			search2 = query;
			showResults2 = true;
			clearTimeout(debounceTimer2);
			debounceTimer2 = setTimeout(() => searchSymbols(query, 2), 200);
		}
	}

	function selectStock(symbol: string, which: 1 | 2) {
		const current = urlSymbols();
		let newSymbols: string[];

		if (which === 1) {
			newSymbols = [symbol, current[1] || ''].filter(Boolean);
			search1 = '';
			showResults1 = false;
			results1 = [];
		} else {
			newSymbols = [current[0] || '', symbol].filter(Boolean);
			search2 = '';
			showResults2 = false;
			results2 = [];
		}

		if (newSymbols.length > 0) {
			goto(`/compare?symbols=${newSymbols.join(',')}`, { replaceState: true });
		}
	}

	function removeStock(which: 1 | 2) {
		const current = urlSymbols();
		let newSymbols: string[];

		if (which === 1) {
			newSymbols = current.slice(1);
			stock1 = null;
		} else {
			newSymbols = current.slice(0, 1);
			stock2 = null;
		}

		if (newSymbols.length > 0) {
			goto(`/compare?symbols=${newSymbols.join(',')}`, { replaceState: true });
		} else {
			goto('/compare', { replaceState: true });
		}
	}

	async function loadStockData(symbol: string): Promise<StockData | null> {
		try {
			const [quoteRes, financialsRes, metricsRes] = await Promise.all([
				api.getQuote(symbol),
				api.getFullFinancials(symbol),
				api.getKeyMetrics(symbol)
			]);

			const quote = quoteRes.success ? quoteRes.data : null;
			const financials = financialsRes.success ? financialsRes.data : null;
			const metrics = metricsRes.success && metricsRes.data ? metricsRes.data : null;

			if (!quote) return null;

			return {
				ticker: symbol,
				name: financials?.profile?.name || quote.name,
				price: quote.price,
				changePercent: quote.changePercent,
				marketCap: quote.marketCap,
				fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
				fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
				volume: quote.volume,
				peRatio: metrics?.peRatio ?? quote.peRatio,
				eps: quote.eps,
				dividendYield: metrics?.dividendYield ?? quote.dividendYield,
				// From key metrics - margins are already in decimal form (0.xx)
				grossMargin: metrics?.grossProfitMargin != null ? metrics.grossProfitMargin * 100 : null,
				operatingMargin: metrics?.operatingProfitMargin != null ? metrics.operatingProfitMargin * 100 : null,
				netMargin: metrics?.netProfitMargin != null ? metrics.netProfitMargin * 100 : null,
				roe: metrics?.roe != null ? metrics.roe * 100 : null,
				roa: metrics?.roa != null ? metrics.roa * 100 : null,
				revenueGrowth: metrics?.revenueGrowth != null ? metrics.revenueGrowth * 100 : null,
				epsGrowth: metrics?.epsGrowth != null ? metrics.epsGrowth * 100 : null,
				debtToEquity: metrics?.debtToEquity,
				currentRatio: metrics?.currentRatio,
				freeCashFlow: metrics?.freeCashFlow ?? null,
				pbRatio: metrics?.pbRatio,
				evToEbitda: metrics?.evToEbitda ?? null,
				pegRatio: metrics?.pegRatio ?? null
			};
		} catch (err) {
			console.error(`Failed to load data for ${symbol}:`, err);
			return null;
		}
	}

	async function loadComparison() {
		const symbols = urlSymbols();
		if (symbols.length === 0) {
			stock1 = null;
			stock2 = null;
			return;
		}

		loading = true;
		try {
			const results = await Promise.all(
				symbols.map((s) => loadStockData(s))
			);
			stock1 = results[0] || null;
			stock2 = results[1] || null;
		} finally {
			loading = false;
		}
	}

	// Watch URL changes
	$effect(() => {
		const symbols = urlSymbols();
		if (symbols.length > 0) {
			loadComparison();
		} else {
			stock1 = null;
			stock2 = null;
		}
	});

	onMount(() => {
		loadComparison();
	});
</script>

<svelte:head>
	<title>Compare Stocks - MarketMint</title>
</svelte:head>

<div class="compare-page">
	<header class="page-header">
		<h1 class="title">Stock Comparison</h1>
		<div class="title-rule"></div>
		<p class="subtitle">Compare key metrics side-by-side</p>
	</header>

	<!-- Stock Selectors -->
	<div class="selectors">
		<!-- Stock 1 Selector -->
		<div class="selector">
			{#if stock1}
				<div class="selected-stock">
					<img
						src={getCompanyLogoUrl(stock1.ticker)}
						alt={stock1.ticker}
						class="stock-logo"
						onerror={(e) => {
							e.currentTarget.style.display = 'none';
						}}
					/>
					<div class="stock-info">
						<span class="stock-ticker">{stock1.ticker}</span>
						<span class="stock-name">{stock1.name}</span>
						<span class="stock-price">
							{stock1.price ? formatCurrency(stock1.price) : '--'}
							{#if stock1.changePercent !== null && stock1.changePercent !== undefined}
								<span class={stock1.changePercent >= 0 ? 'positive' : 'negative'}>
									{stock1.changePercent >= 0 ? '+' : ''}{formatPercent(stock1.changePercent)}
								</span>
							{/if}
						</span>
					</div>
					<button class="remove-btn" onclick={() => removeStock(1)}>x</button>
				</div>
			{:else}
				<div class="search-container">
					<input
						type="text"
						placeholder="Search first stock..."
						value={search1}
						oninput={(e) => handleSearchInput(e.currentTarget.value, 1)}
						onfocus={() => (showResults1 = true)}
						onblur={() => setTimeout(() => (showResults1 = false), 200)}
						class="search-input"
					/>
					{#if showResults1 && results1.length > 0}
						<div class="search-results">
							{#each results1 as result (result.symbol)}
								<button
									class="result-item"
									onmousedown={() => selectStock(result.symbol, 1)}
								>
									<img
										src={getCompanyLogoUrl(result.symbol)}
										alt=""
										class="result-logo"
										onerror={(e) => {
											e.currentTarget.style.display = 'none';
										}}
									/>
									<span class="result-symbol">{result.symbol}</span>
									<span class="result-name">{result.name}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<div class="vs-divider">VS</div>

		<!-- Stock 2 Selector -->
		<div class="selector">
			{#if stock2}
				<div class="selected-stock">
					<img
						src={getCompanyLogoUrl(stock2.ticker)}
						alt={stock2.ticker}
						class="stock-logo"
						onerror={(e) => {
							e.currentTarget.style.display = 'none';
						}}
					/>
					<div class="stock-info">
						<span class="stock-ticker">{stock2.ticker}</span>
						<span class="stock-name">{stock2.name}</span>
						<span class="stock-price">
							{stock2.price ? formatCurrency(stock2.price) : '--'}
							{#if stock2.changePercent !== null && stock2.changePercent !== undefined}
								<span class={stock2.changePercent >= 0 ? 'positive' : 'negative'}>
									{stock2.changePercent >= 0 ? '+' : ''}{formatPercent(stock2.changePercent)}
								</span>
							{/if}
						</span>
					</div>
					<button class="remove-btn" onclick={() => removeStock(2)}>x</button>
				</div>
			{:else}
				<div class="search-container">
					<input
						type="text"
						placeholder="Search second stock..."
						value={search2}
						oninput={(e) => handleSearchInput(e.currentTarget.value, 2)}
						onfocus={() => (showResults2 = true)}
						onblur={() => setTimeout(() => (showResults2 = false), 200)}
						class="search-input"
					/>
					{#if showResults2 && results2.length > 0}
						<div class="search-results">
							{#each results2 as result (result.symbol)}
								<button
									class="result-item"
									onmousedown={() => selectStock(result.symbol, 2)}
								>
									<img
										src={getCompanyLogoUrl(result.symbol)}
										alt=""
										class="result-logo"
										onerror={(e) => {
											e.currentTarget.style.display = 'none';
										}}
									/>
									<span class="result-symbol">{result.symbol}</span>
									<span class="result-name">{result.name}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Comparison Content -->
	{#if loading}
		<div class="loading">
			<div class="loading-text">Loading comparison data...</div>
		</div>
	{:else if stock1 && stock2}
		<ComparisonTable {stock1} {stock2} />
	{:else if stock1 || stock2}
		<div class="empty-state">
			<p>Select another stock to compare</p>
		</div>
	{:else}
		<div class="empty-state">
			<p>Select two stocks to compare their key metrics</p>
			<div class="suggestions">
				<span class="suggestion-label">Popular comparisons:</span>
				<div class="suggestion-links">
					<a href="/compare?symbols=AAPL,MSFT">AAPL vs MSFT</a>
					<a href="/compare?symbols=GOOGL,META">GOOGL vs META</a>
					<a href="/compare?symbols=TSLA,F">TSLA vs F</a>
					<a href="/compare?symbols=AMD,NVDA">AMD vs NVDA</a>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.compare-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.title {
		font-family: var(--font-mono);
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-ink);
		margin: 0;
	}

	.title-rule {
		height: 2px;
		background: var(--color-ink);
		margin-top: 0.75rem;
	}

	.subtitle {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		margin: 0.75rem 0 0 0;
	}

	/* Selectors */
	.selectors {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1rem;
		align-items: center;
		margin-bottom: 2rem;
	}

	.selector {
		position: relative;
	}

	.vs-divider {
		font-family: var(--font-mono);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-ink-muted);
		padding: 0 0.5rem;
	}

	.selected-stock {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
	}

	.stock-logo {
		width: 40px;
		height: 40px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.stock-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.stock-ticker {
		font-family: var(--font-mono);
		font-size: 1rem;
		font-weight: 700;
	}

	.stock-name {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.stock-price {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 600;
		margin-top: 0.25rem;
	}

	.stock-price .positive {
		color: var(--color-gain);
		margin-left: 0.5rem;
	}

	.stock-price .negative {
		color: var(--color-loss);
		margin-left: 0.5rem;
	}

	.remove-btn {
		font-family: var(--font-mono);
		font-size: 1rem;
		background: none;
		border: none;
		color: var(--color-ink-muted);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		transition: color 0.15s;
	}

	.remove-btn:hover {
		color: var(--color-loss);
	}

	/* Search */
	.search-container {
		position: relative;
	}

	.search-input {
		width: 100%;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background: var(--color-paper);
		color: var(--color-ink);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-ink);
	}

	.search-results {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		z-index: 100;
		max-height: 300px;
		overflow-y: auto;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.result-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		border-bottom: 1px dotted var(--color-border);
		cursor: pointer;
		text-align: left;
		transition: background 0.15s;
	}

	.result-item:last-child {
		border-bottom: none;
	}

	.result-item:hover {
		background: var(--color-newsprint);
	}

	.result-logo {
		width: 24px;
		height: 24px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.result-symbol {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 600;
		min-width: 60px;
	}

	.result-name {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* States */
	.loading {
		padding: 4rem 2rem;
		text-align: center;
	}

	.loading-text {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-ink-muted);
	}

	.empty-state {
		padding: 4rem 2rem;
		text-align: center;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
	}

	.empty-state p {
		font-family: var(--font-mono);
		font-size: 1rem;
		color: var(--color-ink-muted);
		margin: 0 0 1.5rem 0;
	}

	.suggestions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.suggestion-label {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
	}

	.suggestion-links {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
	}

	.suggestion-links a {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		text-decoration: none;
		color: var(--color-ink);
		transition: all 0.15s;
	}

	.suggestion-links a:hover {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.compare-page {
			padding: 1.5rem 1rem 3rem;
		}

		.title {
			font-size: 2rem;
		}

		.selectors {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.vs-divider {
			text-align: center;
			padding: 0.5rem 0;
		}
	}
</style>
