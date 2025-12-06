<script lang="ts">
	import { onMount } from 'svelte';
	import { formatCurrency, formatPercent, formatCompact, getPriceClass } from '$lib/utils/formatters';
	import { formatRelativeTime } from '$lib/utils/urls';
	import { quotes } from '$lib/stores/quotes.svelte';
	import PriceCard from '$lib/components/PriceCard.svelte';
	import PortraitCard from '$lib/components/PortraitCard.svelte';
	import ErrorCard from '$lib/components/ErrorCard.svelte';
	import NewsCard from '$lib/components/NewsCard.svelte';
	import api from '$lib/utils/api';

	const FEATURED_CEOS = [
		{ name: 'Tim Cook', company: 'Apple' },
		{ name: 'Satya Nadella', company: 'Microsoft' },
		{ name: 'Elon Musk', company: 'Tesla' }
	];

	const FEATURED_OFFICIALS = [
		{ name: 'Chuck Schumer', title: 'Senator, NY' },
		{ name: 'Mitch McConnell', title: 'Senator, KY' }
	];

	// Market indices to track
	const INDICES = ['SPY', 'DIA', 'QQQ', 'IWM'];
	const INDEX_NAMES: Record<string, string> = {
		SPY: 'S&P 500',
		DIA: 'Dow Jones',
		QQQ: 'NASDAQ',
		IWM: 'Russell 2000'
	};

	// Popular stocks to show in movers sections
	const POPULAR_TICKERS = [
		'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM',
		'V', 'WMT', 'AMD', 'INTC', 'BA', 'DIS', 'NFLX'
	];

	let loading = $state(true);
	let refreshing = $state(false);
	let error = $state<string | null>(null);
	let lastUpdated = $state<Date | null>(null);

	// Derived data from quotes store
	const indicesData = $derived(
		INDICES.map(ticker => ({
			ticker,
			name: INDEX_NAMES[ticker],
			...(quotes.getQuote(ticker) ?? { price: null, change: null, changePercent: null })
		}))
	);

	const allQuotes = $derived(
		POPULAR_TICKERS.map(ticker => quotes.getQuote(ticker)).filter(Boolean)
	);

	const topGainers = $derived(
		[...allQuotes]
			.filter(q => q && q.changePercent !== null && q.changePercent > 0)
			.sort((a, b) => (b?.changePercent ?? 0) - (a?.changePercent ?? 0))
			.slice(0, 5)
	);

	const topLosers = $derived(
		[...allQuotes]
			.filter(q => q && q.changePercent !== null && q.changePercent < 0)
			.sort((a, b) => (a?.changePercent ?? 0) - (b?.changePercent ?? 0))
			.slice(0, 5)
	);

	const mostActive = $derived(
		[...allQuotes]
			.filter(q => q && q.volume)
			.sort((a, b) => (b?.volume ?? 0) - (a?.volume ?? 0))
			.slice(0, 5)
	);

	// Sorting state for tables
	type SortColumn = 'ticker' | 'price' | 'change' | 'volume';
	type SortDirection = 'asc' | 'desc';

	let gainerSort = $state<{ column: SortColumn; direction: SortDirection }>({ column: 'change', direction: 'desc' });
	let loserSort = $state<{ column: SortColumn; direction: SortDirection }>({ column: 'change', direction: 'asc' });
	let activeSort = $state<{ column: SortColumn; direction: SortDirection }>({ column: 'volume', direction: 'desc' });

	function sortStocks<T extends { ticker?: string; price?: number | null; changePercent?: number | null; volume?: number | null }>(
		stocks: T[],
		column: SortColumn,
		direction: SortDirection
	): T[] {
		return [...stocks].sort((a, b) => {
			let aVal: number | string = 0;
			let bVal: number | string = 0;

			switch (column) {
				case 'ticker':
					aVal = a?.ticker ?? '';
					bVal = b?.ticker ?? '';
					break;
				case 'price':
					aVal = a?.price ?? 0;
					bVal = b?.price ?? 0;
					break;
				case 'change':
					aVal = a?.changePercent ?? 0;
					bVal = b?.changePercent ?? 0;
					break;
				case 'volume':
					aVal = a?.volume ?? 0;
					bVal = b?.volume ?? 0;
					break;
			}

			if (typeof aVal === 'string') {
				return direction === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
			}
			return direction === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
		});
	}

	const sortedGainers = $derived(sortStocks(topGainers as any[], gainerSort.column, gainerSort.direction));
	const sortedLosers = $derived(sortStocks(topLosers as any[], loserSort.column, loserSort.direction));
	const sortedActive = $derived(sortStocks(mostActive as any[], activeSort.column, activeSort.direction));

	function toggleSort(
		current: { column: SortColumn; direction: SortDirection },
		column: SortColumn
	): { column: SortColumn; direction: SortDirection } {
		if (current.column === column) {
			return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' };
		}
		return { column, direction: column === 'ticker' ? 'asc' : 'desc' };
	}

	// News state
	let latestNews = $state<Array<{
		title: string;
		source: string | null;
		publishedAt: string;
		url: string;
		sentiment?: string | null;
	}>>([]);

	async function loadData(isRefresh = false) {
		if (isRefresh) {
			refreshing = true;
		} else {
			loading = true;
		}
		error = null;

		try {
			// Fetch all quotes
			const allTickers = [...INDICES, ...POPULAR_TICKERS];
			await quotes.fetchBulkQuotes(allTickers);

			// Connect to WebSocket for real-time updates
			quotes.connect();
			quotes.subscribeMany(allTickers);

			// Fetch news
			const newsResponse = await api.getNews();
			if (newsResponse.success && newsResponse.data) {
				latestNews = (newsResponse.data as typeof latestNews).slice(0, 5);
			}

			lastUpdated = new Date();
		} catch (err) {
			error = 'Failed to load market data';
			console.error(err);
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	function handleRefresh() {
		loadData(true);
	}

	onMount(() => {
		loadData();

		return () => {
			quotes.unsubscribeAll();
		};
	});
</script>

<div class="newspaper-grid">
	<!-- Market Indices - Top Banner -->
	<section class="col-span-full">
		<div class="flex justify-between items-center">
			<h2 class="headline headline-xl">Market Overview</h2>
			<div class="flex items-center gap-3">
				{#if lastUpdated}
					<span class="text-xs text-ink-muted">
						Updated {formatRelativeTime(lastUpdated)}
					</span>
				{/if}
				{#if quotes.connected}
					<span class="text-xs text-green-600">Live</span>
				{/if}
				<button
					onclick={handleRefresh}
					disabled={refreshing || loading}
					class="btn btn-sm btn-ghost"
					title="Refresh data"
				>
					{#if refreshing}
						<span class="animate-spin inline-block">&#x21BB;</span>
					{:else}
						&#x21BB;
					{/if}
				</button>
			</div>
		</div>

		{#if loading}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
				{#each INDICES as ticker (ticker)}
					<div class="card animate-pulse">
						<div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
						<div class="h-6 bg-gray-200 rounded w-24"></div>
					</div>
				{/each}
			</div>
		{:else if error}
			<div class="mt-4">
				<ErrorCard message={error} onRetry={handleRefresh} retrying={refreshing} />
			</div>
		{:else}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
				{#each indicesData as index (index.ticker)}
					<PriceCard
						ticker={index.ticker}
						name={index.name}
						price={index.price}
						change={index.change}
						changePercent={index.changePercent}
						href="/ticker/{index.ticker}"
					/>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Main Content - Top Movers -->
	<section class="col-span-8">
		<h2 class="headline headline-lg">Top Movers</h2>

		<div class="grid grid-cols-2 gap-4">
			<!-- Gainers -->
			<div class="card">
				<h3 class="headline headline-md">Gainers</h3>
				{#if loading}
					<div class="animate-pulse space-y-2">
						{#each Array(3) as _, i (i)}
							<div class="h-8 bg-gray-200 rounded"></div>
						{/each}
					</div>
				{:else}
					<table class="data-table sortable-table">
						<thead>
							<tr>
								<th class="sortable" onclick={() => gainerSort = toggleSort(gainerSort, 'ticker')}>
									Symbol {gainerSort.column === 'ticker' ? (gainerSort.direction === 'asc' ? '↑' : '↓') : ''}
								</th>
								<th class="sortable" onclick={() => gainerSort = toggleSort(gainerSort, 'price')}>
									Price {gainerSort.column === 'price' ? (gainerSort.direction === 'asc' ? '↑' : '↓') : ''}
								</th>
								<th class="sortable" onclick={() => gainerSort = toggleSort(gainerSort, 'change')}>
									Change {gainerSort.column === 'change' ? (gainerSort.direction === 'asc' ? '↑' : '↓') : ''}
								</th>
							</tr>
						</thead>
						<tbody>
							{#each sortedGainers as stock (stock?.ticker)}
								{#if stock}
									<tr>
										<td>
											<a href="/ticker/{stock.ticker}" class="ticker-symbol text-sm">
												{stock.ticker}
											</a>
											{#if stock.name}
												<div class="text-xs text-ink-muted">{stock.name}</div>
											{/if}
										</td>
										<td>{stock.price !== null ? formatCurrency(stock.price) : '--'}</td>
										<td class="price-positive font-semibold">
											{stock.changePercent !== null ? formatPercent(stock.changePercent) : '--'}
										</td>
									</tr>
								{/if}
							{/each}
							{#if sortedGainers.length === 0}
								<tr><td colspan="3" class="text-ink-muted">No data</td></tr>
							{/if}
						</tbody>
					</table>
				{/if}
			</div>

			<!-- Losers -->
			<div class="card">
				<h3 class="headline headline-md">Losers</h3>
				{#if loading}
					<div class="animate-pulse space-y-2">
						{#each Array(3) as _, i (i)}
							<div class="h-8 bg-gray-200 rounded"></div>
						{/each}
					</div>
				{:else}
					<table class="data-table sortable-table">
						<thead>
							<tr>
								<th class="sortable" onclick={() => loserSort = toggleSort(loserSort, 'ticker')}>
									Symbol {loserSort.column === 'ticker' ? (loserSort.direction === 'asc' ? '↑' : '↓') : ''}
								</th>
								<th class="sortable" onclick={() => loserSort = toggleSort(loserSort, 'price')}>
									Price {loserSort.column === 'price' ? (loserSort.direction === 'asc' ? '↑' : '↓') : ''}
								</th>
								<th class="sortable" onclick={() => loserSort = toggleSort(loserSort, 'change')}>
									Change {loserSort.column === 'change' ? (loserSort.direction === 'asc' ? '↑' : '↓') : ''}
								</th>
							</tr>
						</thead>
						<tbody>
							{#each sortedLosers as stock (stock?.ticker)}
								{#if stock}
									<tr>
										<td>
											<a href="/ticker/{stock.ticker}" class="ticker-symbol text-sm">
												{stock.ticker}
											</a>
											{#if stock.name}
												<div class="text-xs text-ink-muted">{stock.name}</div>
											{/if}
										</td>
										<td>{stock.price !== null ? formatCurrency(stock.price) : '--'}</td>
										<td class="price-negative font-semibold">
											{stock.changePercent !== null ? formatPercent(stock.changePercent) : '--'}
										</td>
									</tr>
								{/if}
							{/each}
							{#if sortedLosers.length === 0}
								<tr><td colspan="3" class="text-ink-muted">No data</td></tr>
							{/if}
						</tbody>
					</table>
				{/if}
			</div>
		</div>

		<!-- Most Active -->
		<div class="card mt-4">
			<h3 class="headline headline-md">Most Active</h3>
			{#if loading}
				<div class="animate-pulse space-y-2">
					{#each Array(3) as _, i (i)}
						<div class="h-8 bg-gray-200 rounded"></div>
					{/each}
				</div>
			{:else}
				<table class="data-table sortable-table">
					<thead>
						<tr>
							<th class="sortable" onclick={() => activeSort = toggleSort(activeSort, 'ticker')}>
								Symbol {activeSort.column === 'ticker' ? (activeSort.direction === 'asc' ? '↑' : '↓') : ''}
							</th>
							<th class="sortable" onclick={() => activeSort = toggleSort(activeSort, 'price')}>
								Price {activeSort.column === 'price' ? (activeSort.direction === 'asc' ? '↑' : '↓') : ''}
							</th>
							<th class="sortable" onclick={() => activeSort = toggleSort(activeSort, 'change')}>
								Change {activeSort.column === 'change' ? (activeSort.direction === 'asc' ? '↑' : '↓') : ''}
							</th>
							<th class="sortable" onclick={() => activeSort = toggleSort(activeSort, 'volume')}>
								Volume {activeSort.column === 'volume' ? (activeSort.direction === 'asc' ? '↑' : '↓') : ''}
							</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedActive as stock (stock?.ticker)}
							{#if stock}
								<tr>
									<td>
										<a href="/ticker/{stock.ticker}" class="ticker-symbol text-sm">
											{stock.ticker}
										</a>
										{#if stock.name}
											<div class="text-xs text-ink-muted">{stock.name}</div>
										{/if}
									</td>
									<td>{stock.price !== null ? formatCurrency(stock.price) : '--'}</td>
									<td class={getPriceClass(stock.changePercent ?? 0)}>
										{stock.changePercent !== null ? formatPercent(stock.changePercent) : '--'}
									</td>
									<td>{stock.volume ? formatCompact(stock.volume) : '--'}</td>
								</tr>
							{/if}
						{/each}
						{#if sortedActive.length === 0}
							<tr><td colspan="4" class="text-ink-muted">No data</td></tr>
						{/if}
					</tbody>
				</table>
			{/if}
		</div>
	</section>

	<!-- Sidebar - News & Quick Links -->
	<aside class="col-span-4">
		<h2 class="headline headline-lg">Latest Headlines</h2>

		<div class="space-y-4">
			{#if loading}
				{#each Array(3) as _, i (i)}
					<div class="card animate-pulse">
						<div class="h-4 bg-gray-200 rounded w-16 mb-2"></div>
						<div class="h-5 bg-gray-200 rounded mb-2"></div>
						<div class="h-3 bg-gray-200 rounded w-24"></div>
					</div>
				{/each}
			{:else}
				{#each latestNews as news, i (i)}
					<NewsCard
						title={news.title}
						source={news.source}
						publishedAt={news.publishedAt}
						url={news.url}
						sentiment={news.sentiment}
					/>
				{/each}
				{#if latestNews.length === 0}
					<div class="card text-ink-muted">No news available</div>
				{/if}
			{/if}
		</div>

		<!-- Congress Trading -->
		<h3 class="headline headline-md mt-6">Congress Traders</h3>
		<div class="grid grid-cols-2 gap-2 mt-2">
			{#each FEATURED_OFFICIALS as official (official.name)}
				<PortraitCard
					name={official.name}
					title={official.title}
					category="senate"
					class="text-xs"
				/>
			{/each}
		</div>

		<!-- Tech CEOs -->
		<h3 class="headline headline-md mt-6">Tech Leaders</h3>
		<div class="grid grid-cols-3 gap-2 mt-2">
			{#each FEATURED_CEOS as ceo (ceo.name)}
				<PortraitCard
					name={ceo.name}
					company={ceo.company}
					category="ceo"
					class="text-xs"
				/>
			{/each}
		</div>
	</aside>

	<!-- Bottom Section - Disclaimer -->
	<section class="col-span-full">
		<hr class="divider-double" />
		<p class="text-xs text-ink-muted text-center mt-4">
			Market data provided for informational purposes only. Prices may be delayed.
			Not financial advice.
		</p>
	</section>
</div>

<style>
	.sortable-table th.sortable {
		cursor: pointer;
		user-select: none;
		white-space: nowrap;
	}

	.sortable-table th.sortable:hover {
		background-color: var(--color-newsprint);
	}
</style>
