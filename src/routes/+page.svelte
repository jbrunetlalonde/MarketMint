<script lang="ts">
	import { formatCurrency, formatPercent, formatCompact, getPriceClass } from '$lib/utils/formatters';

	// Mock data for initial display (will be replaced with API calls)
	const marketOverview = {
		indices: [
			{ name: 'S&P 500', ticker: 'SPY', price: 4927.93, change: 0.52 },
			{ name: 'Dow Jones', ticker: 'DIA', price: 38671.69, change: 0.37 },
			{ name: 'NASDAQ', ticker: 'QQQ', price: 15756.64, change: 0.83 },
			{ name: 'Russell 2000', ticker: 'IWM', price: 2002.64, change: -0.21 }
		],
		topGainers: [
			{ ticker: 'NVDA', name: 'NVIDIA Corp', price: 878.35, change: 4.23 },
			{ ticker: 'AMD', name: 'AMD Inc', price: 178.92, change: 3.87 },
			{ ticker: 'META', name: 'Meta Platforms', price: 474.99, change: 2.94 }
		],
		topLosers: [
			{ ticker: 'BA', name: 'Boeing Co', price: 187.23, change: -3.12 },
			{ ticker: 'DIS', name: 'Walt Disney', price: 108.45, change: -2.45 },
			{ ticker: 'INTC', name: 'Intel Corp', price: 42.87, change: -1.98 }
		],
		mostActive: [
			{ ticker: 'TSLA', name: 'Tesla Inc', price: 201.88, change: 1.24, volume: 89_200_000 },
			{ ticker: 'AAPL', name: 'Apple Inc', price: 185.92, change: 0.67, volume: 67_800_000 },
			{ ticker: 'AMZN', name: 'Amazon.com', price: 178.25, change: 1.89, volume: 45_600_000 }
		]
	};

	const latestNews = [
		{
			title: 'Fed Signals Potential Rate Cuts Later This Year',
			source: 'Reuters',
			time: '2h ago',
			category: 'Economics'
		},
		{
			title: 'Tech Stocks Rally on Strong Earnings Reports',
			source: 'Bloomberg',
			time: '4h ago',
			category: 'Markets'
		},
		{
			title: 'Oil Prices Steady Amid Middle East Tensions',
			source: 'WSJ',
			time: '5h ago',
			category: 'Commodities'
		}
	];
</script>

<div class="newspaper-grid">
	<!-- Market Indices - Top Banner -->
	<section class="col-span-full">
		<h2 class="headline headline-xl">Market Overview</h2>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
			{#each marketOverview.indices as index (index.ticker)}
				<div class="card">
					<div class="byline">{index.name}</div>
					<div class="ticker-symbol">{index.ticker}</div>
					<div class="text-xl font-semibold">{formatCurrency(index.price, 'USD', 2)}</div>
					<div class={getPriceClass(index.change)}>
						{formatPercent(index.change)}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Main Content - Top Movers -->
	<section class="col-span-8">
		<h2 class="headline headline-lg">Top Movers</h2>

		<div class="grid grid-cols-2 gap-4">
			<!-- Gainers -->
			<div class="card">
				<h3 class="headline headline-md">Gainers</h3>
				<table class="data-table">
					<thead>
						<tr>
							<th>Symbol</th>
							<th>Price</th>
							<th>Change</th>
						</tr>
					</thead>
					<tbody>
						{#each marketOverview.topGainers as stock (stock.ticker)}
							<tr>
								<td>
									<a href="/ticker/{stock.ticker}" class="ticker-symbol text-sm">
										{stock.ticker}
									</a>
									<div class="text-xs text-ink-muted">{stock.name}</div>
								</td>
								<td>{formatCurrency(stock.price)}</td>
								<td class="price-positive font-semibold">
									{formatPercent(stock.change)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Losers -->
			<div class="card">
				<h3 class="headline headline-md">Losers</h3>
				<table class="data-table">
					<thead>
						<tr>
							<th>Symbol</th>
							<th>Price</th>
							<th>Change</th>
						</tr>
					</thead>
					<tbody>
						{#each marketOverview.topLosers as stock (stock.ticker)}
							<tr>
								<td>
									<a href="/ticker/{stock.ticker}" class="ticker-symbol text-sm">
										{stock.ticker}
									</a>
									<div class="text-xs text-ink-muted">{stock.name}</div>
								</td>
								<td>{formatCurrency(stock.price)}</td>
								<td class="price-negative font-semibold">
									{formatPercent(stock.change)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Most Active -->
		<div class="card mt-4">
			<h3 class="headline headline-md">Most Active</h3>
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
					{#each marketOverview.mostActive as stock (stock.ticker)}
						<tr>
							<td>
								<a href="/ticker/{stock.ticker}" class="ticker-symbol text-sm">
									{stock.ticker}
								</a>
								<div class="text-xs text-ink-muted">{stock.name}</div>
							</td>
							<td>{formatCurrency(stock.price)}</td>
							<td class={getPriceClass(stock.change)}>
								{formatPercent(stock.change)}
							</td>
							<td>{formatCompact(stock.volume)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Sidebar - News & Quick Links -->
	<aside class="col-span-4">
		<h2 class="headline headline-lg">Latest Headlines</h2>

		<div class="space-y-4">
			{#each latestNews as news, i (i)}
				<article class="card">
					<span class="badge">{news.category}</span>
					<h3 class="font-semibold mt-2">{news.title}</h3>
					<p class="byline mt-2">{news.source} &mdash; {news.time}</p>
				</article>
			{/each}
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
