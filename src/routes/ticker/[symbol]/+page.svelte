<script lang="ts">
	import { page } from '$app/state';
	import { formatCurrency, formatPercent, formatCompact, getPriceClass } from '$lib/utils/formatters';

	const symbol = $derived(page.params.symbol?.toUpperCase() || '');

	// Mock data - will be replaced with API calls
	const stockData = {
		name: 'Company Name',
		price: 185.92,
		change: 2.34,
		changePercent: 1.27,
		previousClose: 183.58,
		open: 184.25,
		dayHigh: 187.12,
		dayLow: 183.90,
		volume: 67_800_000,
		avgVolume: 58_200_000,
		marketCap: 2_890_000_000_000,
		peRatio: 28.54,
		eps: 6.51,
		dividendYield: 0.52,
		week52High: 199.62,
		week52Low: 143.90
	};
</script>

<svelte:head>
	<title>{symbol} - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<!-- Header -->
	<section class="col-span-full">
		<div class="flex items-baseline gap-4">
			<h1 class="ticker-symbol text-3xl">{symbol}</h1>
			<span class="text-ink-muted">{stockData.name}</span>
		</div>
		<div class="flex items-baseline gap-4 mt-2">
			<span class="text-3xl font-bold">{formatCurrency(stockData.price)}</span>
			<span class={['text-xl font-semibold', getPriceClass(stockData.change)].join(' ')}>
				{formatPercent(stockData.changePercent)} ({formatCurrency(stockData.change, 'USD', 2)})
			</span>
		</div>
		<p class="byline mt-1">Last updated: Just now</p>
	</section>

	<!-- Chart Placeholder -->
	<section class="col-span-8">
		<div class="card">
			<h2 class="headline headline-md">Price Chart</h2>
			<div class="h-80 bg-newsprint-dark flex items-center justify-center">
				<p class="text-ink-muted">Chart will be rendered here (TradingView integration)</p>
			</div>
			<div class="flex gap-2 mt-4">
				{#each ['1D', '1W', '1M', '3M', '1Y', '5Y', 'ALL'] as period (period)}
					<button class="btn btn-small">{period}</button>
				{/each}
			</div>
		</div>
	</section>

	<!-- Key Statistics -->
	<aside class="col-span-4">
		<div class="card">
			<h2 class="headline headline-md">Key Statistics</h2>
			<table class="data-table">
				<tbody>
					<tr>
						<td class="text-ink-muted">Previous Close</td>
						<td class="text-right font-semibold">{formatCurrency(stockData.previousClose)}</td>
					</tr>
					<tr>
						<td class="text-ink-muted">Open</td>
						<td class="text-right font-semibold">{formatCurrency(stockData.open)}</td>
					</tr>
					<tr>
						<td class="text-ink-muted">Day Range</td>
						<td class="text-right font-semibold">
							{formatCurrency(stockData.dayLow)} - {formatCurrency(stockData.dayHigh)}
						</td>
					</tr>
					<tr>
						<td class="text-ink-muted">52 Week Range</td>
						<td class="text-right font-semibold">
							{formatCurrency(stockData.week52Low)} - {formatCurrency(stockData.week52High)}
						</td>
					</tr>
					<tr>
						<td class="text-ink-muted">Volume</td>
						<td class="text-right font-semibold">{formatCompact(stockData.volume)}</td>
					</tr>
					<tr>
						<td class="text-ink-muted">Avg Volume</td>
						<td class="text-right font-semibold">{formatCompact(stockData.avgVolume)}</td>
					</tr>
					<tr>
						<td class="text-ink-muted">Market Cap</td>
						<td class="text-right font-semibold">{formatCompact(stockData.marketCap)}</td>
					</tr>
					<tr>
						<td class="text-ink-muted">P/E Ratio</td>
						<td class="text-right font-semibold">{stockData.peRatio.toFixed(2)}</td>
					</tr>
					<tr>
						<td class="text-ink-muted">EPS</td>
						<td class="text-right font-semibold">{formatCurrency(stockData.eps)}</td>
					</tr>
					<tr>
						<td class="text-ink-muted">Dividend Yield</td>
						<td class="text-right font-semibold">{stockData.dividendYield.toFixed(2)}%</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="card mt-4">
			<button class="btn btn-primary w-full">Add to Watchlist</button>
		</div>
	</aside>

	<!-- Financials Section -->
	<section class="col-span-full">
		<h2 class="headline headline-lg">Financials</h2>
		<div class="card">
			<p class="text-ink-muted text-center py-8">
				Financial statements will be displayed here (Income Statement, Balance Sheet, Cash Flow)
			</p>
		</div>
	</section>
</div>
