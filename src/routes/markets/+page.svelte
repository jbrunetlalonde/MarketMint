<script lang="ts">
	import { onMount } from 'svelte';
	import { formatCurrency, formatPercent, formatCompact, getPriceClass } from '$lib/utils/formatters';
	import { formatRelativeTime, getCompanyLogoUrl } from '$lib/utils/urls';
	import { quotes } from '$lib/stores/quotes.svelte';
	import PriceCard from '$lib/components/PriceCard.svelte';
	import ErrorCard from '$lib/components/ErrorCard.svelte';
	import NewsCard from '$lib/components/NewsCard.svelte';
	import SectorPerformance from '$lib/components/SectorPerformance.svelte';
	import EarningsCalendar from '$lib/components/EarningsCalendar.svelte';
	import EconomicSnapshot from '$lib/components/EconomicSnapshot.svelte';
	import MarketStatus from '$lib/components/MarketStatus.svelte';
	import IPOCalendar from '$lib/components/IPOCalendar.svelte';
	import DividendCalendar from '$lib/components/DividendCalendar.svelte';
	import SplitCalendar from '$lib/components/SplitCalendar.svelte';
	import api from '$lib/utils/api';

	// Market indices to track
	const INDICES = ['SPY', 'DIA', 'QQQ', 'IWM'];
	const INDEX_NAMES: Record<string, string> = {
		SPY: 'S&P 500',
		DIA: 'Dow Jones',
		QQQ: 'NASDAQ',
		IWM: 'Russell 2000'
	};

	type MoverStock = {
		ticker: string;
		name?: string;
		price: number;
		change: number;
		changePercent: number;
		volume: number;
	};

	let loading = $state(true);
	let refreshing = $state(false);
	let error = $state<string | null>(null);
	let lastUpdated = $state<Date | null>(null);

	// Market movers data from API
	let topGainers = $state<MoverStock[]>([]);
	let topLosers = $state<MoverStock[]>([]);
	let mostActive = $state<MoverStock[]>([]);
	let moversLastUpdated = $state<string | null>(null);
	let moversIsCached = $state(false);

	// Derived data from quotes store
	const indicesData = $derived(
		INDICES.map(ticker => ({
			ticker,
			name: INDEX_NAMES[ticker],
			...(quotes.getQuote(ticker) ?? { price: null, change: null, changePercent: null })
		}))
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

	const sortedGainers = $derived(sortStocks(topGainers.filter(s => s?.ticker) as any[], gainerSort.column, gainerSort.direction));
	const sortedLosers = $derived(sortStocks(topLosers.filter(s => s?.ticker) as any[], loserSort.column, loserSort.direction));
	const sortedActive = $derived(sortStocks(mostActive.filter(s => s?.ticker) as any[], activeSort.column, activeSort.direction));

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
			// Fetch indices quotes
			await quotes.fetchBulkQuotes(INDICES);

			// Connect to WebSocket for real-time updates on indices
			quotes.connect();
			quotes.subscribeMany(INDICES);

			// Fetch market movers from dedicated API
			const moversResponse = await api.getMovers(10);
			if (moversResponse.success && moversResponse.data) {
				topGainers = moversResponse.data.gainers || [];
				topLosers = moversResponse.data.losers || [];
				mostActive = moversResponse.data.mostActive || [];
				moversLastUpdated = moversResponse.data.lastUpdated || null;
				moversIsCached = moversResponse.data.isCached || false;
			}

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
		<div class="flex justify-between items-center mb-3">
			<div class="flex items-center gap-4">
				<h2 class="headline headline-xl">Market Overview</h2>
				<MarketStatus />
			</div>
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
		<div class="flex items-center justify-between mb-2">
			<h2 class="headline headline-lg mb-0">Top Movers</h2>
			{#if moversLastUpdated}
				<span class="text-xs text-ink-muted font-mono">
					{moversIsCached ? 'As of ' : ''}{new Date(moversLastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
				</span>
			{/if}
		</div>

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
							{#each sortedGainers as stock, i (stock.ticker ?? `gainer-${i}`)}
								<tr>
									<td>
										<a href="/ticker/{stock.ticker}" class="stock-cell">
											<img
												src={getCompanyLogoUrl(stock.ticker)}
												alt=""
												class="stock-logo"
												loading="lazy"
												onerror={(e) => {
													const img = e.currentTarget as HTMLImageElement;
													img.style.display = 'none';
												}}
											/>
											<div class="stock-info">
												<span class="ticker-symbol">{stock.ticker}</span>
												{#if stock.name}
													<span class="company-name">{stock.name}</span>
												{/if}
											</div>
										</a>
									</td>
									<td>{formatCurrency(stock.price)}</td>
									<td class="price-positive font-semibold">
										{formatPercent(stock.changePercent)}
									</td>
								</tr>
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
							{#each sortedLosers as stock, i (stock.ticker ?? `loser-${i}`)}
								<tr>
									<td>
										<a href="/ticker/{stock.ticker}" class="stock-cell">
											<img
												src={getCompanyLogoUrl(stock.ticker)}
												alt=""
												class="stock-logo"
												loading="lazy"
												onerror={(e) => {
													const img = e.currentTarget as HTMLImageElement;
													img.style.display = 'none';
												}}
											/>
											<div class="stock-info">
												<span class="ticker-symbol">{stock.ticker}</span>
												{#if stock.name}
													<span class="company-name">{stock.name}</span>
												{/if}
											</div>
										</a>
									</td>
									<td>{formatCurrency(stock.price)}</td>
									<td class="price-negative font-semibold">
										{formatPercent(stock.changePercent)}
									</td>
								</tr>
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
						{#each sortedActive as stock, i (stock.ticker ?? `active-${i}`)}
							<tr>
								<td>
									<a href="/ticker/{stock.ticker}" class="stock-cell">
										<img
											src={getCompanyLogoUrl(stock.ticker)}
											alt=""
											class="stock-logo"
											loading="lazy"
											onerror={(e) => {
												const img = e.currentTarget as HTMLImageElement;
												img.style.display = 'none';
											}}
										/>
										<div class="stock-info">
											<span class="ticker-symbol">{stock.ticker}</span>
											{#if stock.name}
												<span class="company-name">{stock.name}</span>
											{/if}
										</div>
									</a>
								</td>
								<td>{formatCurrency(stock.price)}</td>
								<td class={getPriceClass(stock.changePercent)}>
									{formatPercent(stock.changePercent)}
								</td>
								<td>{formatCompact(stock.volume)}</td>
							</tr>
						{/each}
						{#if sortedActive.length === 0}
							<tr><td colspan="4" class="text-ink-muted">No data</td></tr>
						{/if}
					</tbody>
				</table>
			{/if}
		</div>

		<!-- Calendars Grid -->
		<div class="calendars-grid mt-6">
			<div class="calendar-card">
				<h3 class="headline headline-sm">Upcoming Earnings</h3>
				<EarningsCalendar />
			</div>
			<div class="calendar-card">
				<h3 class="headline headline-sm">Upcoming IPOs</h3>
				<IPOCalendar />
			</div>
			<div class="calendar-card">
				<h3 class="headline headline-sm">Ex-Dividend Dates</h3>
				<DividendCalendar />
			</div>
			<div class="calendar-card">
				<h3 class="headline headline-sm">Stock Splits</h3>
				<SplitCalendar />
			</div>
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

		<!-- Economic Indicators -->
		<h3 class="headline headline-md mt-6">Economic Indicators</h3>
		<EconomicSnapshot />

		<!-- Sector Performance -->
		<h3 class="headline headline-md mt-6">Sector Performance</h3>
		<SectorPerformance />

	</aside>

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

	.stock-cell {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		text-decoration: none;
		color: inherit;
	}

	.stock-logo {
		width: 28px;
		height: 28px;
		object-fit: contain;
		border-radius: 4px;
		flex-shrink: 0;
		background: var(--color-paper);
	}

	.stock-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.stock-info .ticker-symbol {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.stock-info .company-name {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 140px;
	}

	.calendars-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.calendar-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		padding: 0.75rem;
	}

	.calendar-card .headline {
		margin-bottom: 0.5rem;
	}

	@media (max-width: 768px) {
		.calendars-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
