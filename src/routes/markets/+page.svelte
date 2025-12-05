<script lang="ts">
	import { onMount } from 'svelte';
	import { formatCurrency, formatPercent, formatCompact, getPriceClass } from '$lib/utils/formatters';
	import { quotes } from '$lib/stores/quotes.svelte';
	import PriceCard from '$lib/components/PriceCard.svelte';
	import PortraitCard from '$lib/components/PortraitCard.svelte';
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
	let error = $state<string | null>(null);

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

	// News state
	let latestNews = $state<Array<{
		title: string;
		source: string | null;
		publishedAt: string;
		url: string;
		sentiment?: string | null;
	}>>([]);

	async function loadData() {
		loading = true;
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
		} catch (err) {
			error = 'Failed to load market data';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadData();

		return () => {
			quotes.unsubscribeAll();
		};
	});

	function formatNewsTime(dateStr: string): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return '';

		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

		if (diffHours < 1) return 'Just now';
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffHours < 48) return 'Yesterday';
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="newspaper-grid">
	<!-- Market Indices - Top Banner -->
	<section class="col-span-full">
		<div class="flex justify-between items-center">
			<h2 class="headline headline-xl">Market Overview</h2>
			{#if quotes.connected}
				<span class="text-xs text-green-600">Live</span>
			{/if}
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
			<div class="card mt-4 text-red-600">{error}</div>
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
					<table class="data-table">
						<thead>
							<tr>
								<th>Symbol</th>
								<th>Price</th>
								<th>Change</th>
							</tr>
						</thead>
						<tbody>
							{#each topGainers as stock (stock?.ticker)}
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
							{#if topGainers.length === 0}
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
					<table class="data-table">
						<thead>
							<tr>
								<th>Symbol</th>
								<th>Price</th>
								<th>Change</th>
							</tr>
						</thead>
						<tbody>
							{#each topLosers as stock (stock?.ticker)}
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
							{#if topLosers.length === 0}
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
				<table class="data-table">
					<thead>
						<tr>
							<th>Symbol</th>
							<th>Price</th>
							<th>Change</th>
							<th>Volume</th>
						</tr>
					</thead>
					<tbody>
						{#each mostActive as stock (stock?.ticker)}
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
						{#if mostActive.length === 0}
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
					<a href={news.url} target="_blank" rel="noopener noreferrer" class="card news-card block">
						{#if news.sentiment}
							<span class="badge">{news.sentiment}</span>
						{/if}
						<h3 class="font-semibold mt-2">{news.title}</h3>
						<p class="byline mt-2">
							{news.source || 'News'}
							{#if formatNewsTime(news.publishedAt)}
								&mdash; {formatNewsTime(news.publishedAt)}
							{/if}
						</p>
					</a>
				{/each}
				{#if latestNews.length === 0}
					<div class="card text-ink-muted">No news available</div>
				{/if}
			{/if}
		</div>

		<hr class="divider" />

		<!-- Quick Search -->
		<div class="card">
			<h3 class="headline headline-md">Quick Quote</h3>
			<form class="flex gap-2" action="/ticker" method="get">
				<input
					type="text"
					name="symbol"
					placeholder="Enter ticker..."
					class="input flex-1"
					maxlength="5"
				/>
				<button type="submit" class="btn">Go</button>
			</form>
		</div>

		<hr class="divider" />

		<!-- Congress Trading -->
		<h3 class="headline headline-md">Congress Traders</h3>
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

		<hr class="divider" />

		<!-- Tech CEOs -->
		<h3 class="headline headline-md">Tech Leaders</h3>
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

	<!-- Bottom Section - Market Summary -->
	<section class="col-span-full">
		<hr class="divider-double" />
		<div class="grid grid-cols-3 gap-8 mt-4 text-center">
			<div>
				<div class="byline">NYSE Volume</div>
				<div class="text-xl font-semibold">3.2B</div>
			</div>
			<div>
				<div class="byline">NASDAQ Volume</div>
				<div class="text-xl font-semibold">4.8B</div>
			</div>
			<div>
				<div class="byline">VIX</div>
				<div class="text-xl font-semibold">14.23</div>
			</div>
		</div>
	</section>
</div>

<style>
	.news-card {
		text-decoration: none;
		color: inherit;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
		cursor: pointer;
	}

	.news-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.news-card h3 {
		transition: color 0.15s ease;
	}

	.news-card:hover h3 {
		color: var(--color-neutral);
	}
</style>
