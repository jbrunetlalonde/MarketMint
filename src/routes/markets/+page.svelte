<script lang="ts">
	import { onMount } from 'svelte';
	import { formatCurrency, formatPercent, formatCompact, getPriceClass } from '$lib/utils/formatters';
	import { formatRelativeTime, getCompanyLogoUrl } from '$lib/utils/urls';
	import { quotes } from '$lib/stores/quotes.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import PriceCard from '$lib/components/PriceCard.svelte';
	import ErrorCard from '$lib/components/ErrorCard.svelte';
	import NewsCard from '$lib/components/NewsCard.svelte';
	import SectorPerformance from '$lib/components/SectorPerformance.svelte';
	import IndustryPerformance from '$lib/components/IndustryPerformance.svelte';
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

	// Watchlist data
	let watchlist = $state<Array<{ ticker: string; name?: string }>>([]);

	// Market movers data from API
	let topGainers = $state<MoverStock[]>([]);
	let topLosers = $state<MoverStock[]>([]);
	let mostActive = $state<MoverStock[]>([]);
	let moversLastUpdated = $state<string | null>(null);
	let moversIsCached = $state(false);

	// Derived data from quotes store
	const indicesData = $derived(
		INDICES.map(t => {
			const quote = quotes.getQuote(t) ?? { price: null, change: null, changePercent: null };
			return {
				ticker: t,
				name: INDEX_NAMES[t],
				price: quote.price,
				change: quote.change,
				changePercent: quote.changePercent
			};
		})
	);

	// Derived watchlist data with quotes
	const watchlistData = $derived(
		watchlist.map(item => {
			const quote = quotes.getQuote(item.ticker) ?? { price: null, change: null, changePercent: null };
			return {
				ticker: item.ticker,
				name: item.name,
				price: quote.price,
				change: quote.change,
				changePercent: quote.changePercent
			};
		})
	);

	// Show watchlist if user is authenticated and has stocks
	const showWatchlist = $derived(auth.isAuthenticated && watchlist.length > 0);

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
			// Fetch watchlist if authenticated
			if (auth.isAuthenticated && auth.accessToken) {
				const watchlistRes = await api.getWatchlist(auth.accessToken);
				if (watchlistRes.success && watchlistRes.data) {
					watchlist = watchlistRes.data;
				}
			}

			// Fetch indices quotes
			await quotes.fetchBulkQuotes(INDICES);

			// If user has watchlist, fetch those quotes too
			if (watchlist.length > 0) {
				const watchlistTickers = watchlist.map(w => w.ticker);
				await quotes.fetchBulkQuotes(watchlistTickers);
			}

			// Connect to WebSocket for real-time updates on indices
			quotes.connect();
			quotes.subscribeMany(INDICES);

			// Subscribe to watchlist tickers too
			if (watchlist.length > 0) {
				quotes.subscribeMany(watchlist.map(w => w.ticker));
			}

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
	<!-- Market Overview / Watchlist - Top Banner -->
	<section class="col-span-full market-overview">
		<div class="overview-header">
			<h2 class="headline headline-xl">{showWatchlist ? 'Your Watchlist' : 'Market Overview'}</h2>
			<MarketStatus />
		</div>

		{#if loading}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
				{#each INDICES as ticker (ticker)}
					<div class="overview-skeleton">
						<div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
						<div class="h-6 bg-gray-200 rounded w-24"></div>
					</div>
				{/each}
			</div>
		{:else if error}
			<div class="mt-4">
				<ErrorCard message={error} onRetry={handleRefresh} retrying={refreshing} />
			</div>
		{:else if showWatchlist}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
				{#each watchlistData as stock (stock.ticker)}
					<PriceCard
						ticker={stock.ticker}
						name={stock.name}
						price={stock.price}
						change={stock.change}
						changePercent={stock.changePercent}
						href="/ticker/{stock.ticker}"
					/>
				{/each}
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
	<section class="col-span-8 main-section">
		<h2 class="headline headline-lg">Top Movers</h2>

		<div class="movers-grid">
			<!-- Gainers -->
			<div class="movers-column">
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
			<div class="movers-column">
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

		<!-- Most Active - Mobile Only (collapsed by default) -->
		<details class="mobile-accordion" open>
			<summary class="accordion-header">
				<h3 class="headline headline-md">Most Active</h3>
				<span class="accordion-icon">+</span>
			</summary>
			<div class="accordion-content">
				{#if loading}
					<div class="animate-pulse space-y-2">
						{#each Array(3) as _, i (i)}
							<div class="h-8 bg-gray-200 rounded"></div>
						{/each}
					</div>
				{:else}
					<div class="mobile-stock-list">
						{#each sortedActive.slice(0, 5) as stock, i (stock.ticker ?? `active-mobile-${i}`)}
							<a href="/ticker/{stock.ticker}" class="mobile-stock-item">
								<img
									src={getCompanyLogoUrl(stock.ticker)}
									alt=""
									class="mobile-stock-logo"
									loading="lazy"
									onerror={(e) => {
										const img = e.currentTarget as HTMLImageElement;
										img.style.display = 'none';
									}}
								/>
								<div class="mobile-stock-info">
									<span class="mobile-ticker">{stock.ticker}</span>
									{#if stock.name}
										<span class="mobile-name">{stock.name}</span>
									{/if}
								</div>
								<div class="mobile-stock-price">
									<span class="mobile-price">{formatCurrency(stock.price)}</span>
									<span class={getPriceClass(stock.changePercent)}>{formatPercent(stock.changePercent)}</span>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</details>

		<!-- Most Active - Desktop Table -->
		<div class="movers-column mt-4 desktop-only">
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
				<div class="calendar-header">
					<h3 class="headline headline-sm">Upcoming Earnings</h3>
					<a href="/earnings" class="view-all-link">View All</a>
				</div>
				<EarningsCalendar />
			</div>
			<div class="calendar-card">
				<div class="calendar-header">
					<h3 class="headline headline-sm">Upcoming IPOs</h3>
					<a href="/economic" class="view-all-link">View All</a>
				</div>
				<IPOCalendar />
			</div>
			<div class="calendar-card">
				<div class="calendar-header">
					<h3 class="headline headline-sm">Ex-Dividend Dates</h3>
					<a href="/economic" class="view-all-link">View All</a>
				</div>
				<DividendCalendar />
			</div>
			<div class="calendar-card">
				<div class="calendar-header">
					<h3 class="headline headline-sm">Stock Splits</h3>
					<a href="/economic" class="view-all-link">View All</a>
				</div>
				<SplitCalendar />
			</div>
		</div>
	</section>

	<!-- Sidebar - News & Quick Links -->
	<aside class="col-span-4 sidebar-section">
		<h2 class="headline headline-lg">Latest Headlines</h2>

		<div class="news-list">
			{#if loading}
				{#each Array(3) as _, i (i)}
					<div class="news-skeleton">
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
					<p class="text-ink-muted">No news available</p>
				{/if}
			{/if}
		</div>

		<!-- Economic Indicators -->
		<div class="sidebar-card mt-6">
			<div class="sidebar-card-header">
				<h3 class="headline headline-md">Economic Indicators</h3>
				<a href="/economic" class="view-all-link">View All</a>
			</div>
			<EconomicSnapshot />
		</div>

		<!-- Sector Performance -->
		<h3 class="headline headline-md mt-6">Sector Performance</h3>
		<SectorPerformance />

		<!-- Industry Performance -->
		<IndustryPerformance />

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

	.movers-column {
		padding-top: 0.5rem;
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
		filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.3));
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
		gap: 1.25rem;
	}

	.calendar-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1rem;
		transition: all 0.2s ease;
	}

	.calendar-card:hover {
		border-color: var(--color-ink-muted);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
	}

	.calendar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.calendar-header .headline {
		margin: 0;
		padding: 0;
		border: none;
		font-size: 0.75rem;
		letter-spacing: 0.03em;
	}

	.calendar-card .view-all-link {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-ink-muted);
		text-decoration: none;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: all 0.15s ease;
	}

	.calendar-card .view-all-link:hover {
		color: var(--color-paper);
		background: var(--color-ink);
	}

	/* Sidebar card styles */
	.sidebar-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1rem;
	}

	.sidebar-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.sidebar-card-header .headline {
		margin: 0;
		padding: 0;
		border: none;
		font-size: 0.75rem;
	}

	.sidebar-card .view-all-link {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-ink-muted);
		text-decoration: none;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: all 0.15s ease;
	}

	.sidebar-card .view-all-link:hover {
		color: var(--color-paper);
		background: var(--color-ink);
	}

	@media (max-width: 768px) {
		.calendars-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.calendar-card {
			padding: 0.875rem;
		}
	}

	.market-overview {
		padding-bottom: 1rem;
		margin-bottom: 0.5rem;
	}

	/* Clean up headline borders - less is more */
	.market-overview .headline-xl {
		border-bottom: none;
		margin-bottom: 0.5rem;
	}

	.col-span-8 .headline-lg {
		border-bottom: 2px solid var(--color-ink);
	}

	/* Remove underlines from Gainers/Losers/Most Active headers */
	.movers-column .headline-md {
		border-bottom: none;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
	}

	/* Sidebar - Latest Headlines should align with Top Movers */
	aside .headline-lg {
		border-bottom: 2px solid var(--color-ink);
	}

	aside .headline-md {
		border-bottom: none;
		margin-bottom: 0.5rem;
	}

	.overview-skeleton {
		padding: 1rem;
		border: 1px dotted var(--color-border);
	}

	.news-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.news-skeleton {
		padding: 0.75rem 0;
		border-bottom: 1px dotted var(--color-border);
	}


	/* Overview Header Styles */
	.overview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		gap: 1rem;
	}

	/* Movers Grid */
	.movers-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	/* Mobile Accordion */
	.mobile-accordion {
		display: none;
		margin-top: 1rem;
		border: 1px solid var(--color-border);
	}

	.accordion-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		cursor: pointer;
		background: var(--color-paper);
	}

	.accordion-header .headline {
		margin: 0;
		border: none;
	}

	.accordion-icon {
		font-size: 1.25rem;
		font-weight: 300;
		color: var(--color-ink-muted);
		transition: transform 0.2s;
	}

	.mobile-accordion[open] .accordion-icon {
		transform: rotate(45deg);
	}

	.accordion-content {
		padding: 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	/* Mobile Stock List */
	.mobile-stock-list {
		display: flex;
		flex-direction: column;
	}

	.mobile-stock-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0;
		border-bottom: 1px dotted var(--color-border);
		text-decoration: none;
		color: inherit;
	}

	.mobile-stock-item:last-child {
		border-bottom: none;
	}

	.mobile-stock-logo {
		width: 32px;
		height: 32px;
		object-fit: contain;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.mobile-stock-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.mobile-ticker {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 700;
	}

	.mobile-name {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mobile-stock-price {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.mobile-price {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		font-weight: 600;
	}

	/* Desktop Only */
	.desktop-only {
		display: block;
	}

	/* ===== MOBILE RESPONSIVE STYLES ===== */
	@media (max-width: 768px) {
		/* Hide desktop elements */
		.desktop-only {
			display: none !important;
		}

		/* Show mobile accordion */
		.mobile-accordion {
			display: block;
		}

		/* Overview header - stack on mobile */
		.overview-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.overview-header .headline-xl {
			font-size: 1.25rem;
		}

		/* Movers grid - stack on mobile */
		.movers-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		/* Make tables more compact */
		.data-table {
			font-size: 0.75rem;
		}

		.data-table th,
		.data-table td {
			padding: 0.375rem 0.25rem;
		}

		/* Hide company names in table on mobile */
		.stock-info .company-name {
			display: none;
		}

		.stock-logo {
			width: 24px;
			height: 24px;
		}

		/* Calendars grid - already 1 column */
		.calendars-grid {
			gap: 0.75rem;
		}

		.calendar-card {
			padding: 0.625rem;
		}

		/* Headlines smaller on mobile */
		.headline-lg {
			font-size: 1rem;
		}

		.headline-md {
			font-size: 0.8125rem;
		}

		/* Section spacing */
		.main-section {
			margin-bottom: 1.5rem;
		}

		.sidebar-section {
			margin-top: 0;
		}
	}

	/* Extra small screens */
	@media (max-width: 480px) {
		.data-table {
			font-size: 0.6875rem;
		}

		.stock-cell {
			gap: 0.375rem;
		}

		.stock-logo {
			width: 20px;
			height: 20px;
		}

		.mobile-stock-logo {
			width: 28px;
			height: 28px;
		}
	}
</style>
