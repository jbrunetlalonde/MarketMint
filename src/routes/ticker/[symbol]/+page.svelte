<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import {
		formatCurrency,
		formatPercent,
		formatCompact,
		getPriceClass
	} from '$lib/utils/formatters';
	import { quotes } from '$lib/stores/quotes.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import CandlestickChart from '$lib/components/CandlestickChart.svelte';
	import IndicatorPanel from '$lib/components/IndicatorPanel.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import api from '$lib/utils/api';
	import { getPortraitUrl, getCongressPortraitUrl as getCongressPortrait } from '$lib/utils/urls';

	const symbol = $derived(page.params.symbol?.toUpperCase() || '');

	let loading = $state(true);
	let chartLoading = $state(false);
	let error = $state<string | null>(null);
	let selectedPeriod = $state('1y');
	let chartType = $state<'candle' | 'line'>('candle');

	// Chart options
	let showVolume = $state(true);
	let showSMA = $state(false);
	let showEMA = $state(false);
	let showBollinger = $state(false);
	let showRSI = $state(false);
	let showMACD = $state(false);

	// Quote data from store
	const quoteData = $derived(quotes.getQuote(symbol));

	// Financial data
	let financials = $state<{
		companyName?: string;
		sector?: string;
		industry?: string;
		description?: string;
		ceo?: string;
		ceoPortrait?: { name: string; portraitUrl: string } | null;
		employees?: number;
		website?: string;
		logo?: string;
		peRatio?: number;
		roe?: number;
		debtToEquity?: number;
		dividendYield?: number;
		ipoDate?: string;
		isMock?: boolean;
	} | null>(null);

	// Executive data
	let executives = $state<Array<{
		name: string;
		title: string;
		pay: number | null;
	}>>([]);

	// Analyst data
	let rating = $state<{
		rating: string;
		ratingScore: number;
		ratingRecommendation: string;
	} | null>(null);

	let priceTarget = $state<{
		targetHigh: number;
		targetLow: number;
		targetConsensus: number;
	} | null>(null);

	let dcf = $state<{
		dcf: number;
		stockPrice: number;
	} | null>(null);

	let peers = $state<string[]>([]);

	// Congress trades for this ticker
	let congressTrades = $state<Array<{
		id: number;
		officialName: string;
		transactionType: string;
		transactionDate: string;
		amountDisplay: string;
		party: string | null;
		title: string | null;
		state: string | null;
	}>>([]);

	// OHLC price data for candlestick chart
	interface OHLCData {
		time: string;
		open: number;
		high: number;
		low: number;
		close: number;
		volume: number;
		sma20?: number | null;
		sma50?: number | null;
		sma200?: number | null;
		ema12?: number | null;
		ema26?: number | null;
		rsi?: number | null;
		macd?: number | null;
		macdSignal?: number | null;
		macdHistogram?: number | null;
		bollingerUpper?: number | null;
		bollingerMiddle?: number | null;
		bollingerLower?: number | null;
	}
	let ohlcData = $state<OHLCData[]>([]);

	// Income statement data for chart
	let incomeData = $state<Array<{ date: string; revenue: number; netIncome: number }>>([]);

	// Watchlist state
	let inWatchlist = $state(false);
	let watchlistLoading = $state(false);

	const periods = [
		{ label: '1D', value: '1d' },
		{ label: '1W', value: '5d' },
		{ label: '1M', value: '1m' },
		{ label: '3M', value: '3m' },
		{ label: '1Y', value: '1y' },
		{ label: '5Y', value: '5y' }
	];

	async function loadData() {
		loading = true;
		error = null;

		try {
			// Fetch quote
			await quotes.fetchQuote(symbol);
			quotes.connect();
			quotes.subscribe(symbol);

			// Fetch all financial data in single call
			const fullRes = await api.getFullFinancials(symbol);
			if (fullRes.success && fullRes.data) {
				const data = fullRes.data;
				if (data.profile) {
					financials = {
						companyName: data.profile.name,
						sector: data.profile.sector,
						industry: data.profile.industry,
						description: data.profile.description,
						ceo: data.profile.ceo,
						ceoPortrait: data.ceoPortrait,
						employees: data.profile.employees,
						website: data.profile.website,
						logo: data.profile.image,
						ipoDate: data.profile.ipoDate,
						peRatio: data.metrics?.peRatio,
						roe: data.metrics?.roe,
						debtToEquity: data.metrics?.debtToEquity,
						dividendYield: data.metrics?.dividendYield
					};
				}
				executives = data.executives || [];
				rating = data.rating;
				priceTarget = data.priceTarget;
				dcf = data.dcf;
				peers = data.peers || [];
			}

			// Fetch OHLC price history with indicators
			await loadOHLC(selectedPeriod);

			// Fetch income statements for chart
			const incomeRes = await api.getIncomeStatement(symbol, 'annual', 5);
			if (incomeRes.success && incomeRes.data) {
				incomeData = incomeRes.data as typeof incomeData;
			}

			// Fetch Congress trades for this ticker
			const congressRes = await api.getPoliticalTradesByTicker(symbol, 10);
			if (congressRes.success && congressRes.data) {
				congressTrades = congressRes.data;
			}
		} catch (err) {
			error = 'Failed to load stock data';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function loadOHLC(period: string) {
		chartLoading = true;
		try {
			// Use indicators endpoint to get OHLC with technical indicators
			const res = await api.getIndicators(symbol, {
				period,
				sma: '20,50,200',
				ema: '12,26',
				rsi: true,
				macd: true,
				bollinger: true
			});

			if (res.success && res.data?.indicators) {
				ohlcData = res.data.indicators;
			}
		} catch (err) {
			console.error('Failed to load OHLC data:', err);
		} finally {
			chartLoading = false;
		}
	}

	function handlePeriodChange(period: string) {
		selectedPeriod = period;
		loadOHLC(period);
	}

	async function checkWatchlist() {
		if (!auth.isAuthenticated || !auth.accessToken) return;
		try {
			const res = await api.getWatchlist(auth.accessToken);
			if (res.success && res.data) {
				inWatchlist = res.data.some((item: { ticker: string }) => item.ticker === symbol);
			}
		} catch (err) {
			console.error('Failed to check watchlist:', err);
		}
	}

	async function toggleWatchlist() {
		if (!auth.isAuthenticated || !auth.accessToken) {
			window.location.href = '/auth/login';
			return;
		}

		watchlistLoading = true;
		try {
			if (inWatchlist) {
				const res = await api.removeFromWatchlist(auth.accessToken, symbol);
				if (res.success) {
					inWatchlist = false;
				}
			} else {
				const res = await api.addToWatchlist(auth.accessToken, symbol);
				if (res.success) {
					inWatchlist = true;
				}
			}
		} catch (err) {
			console.error('Failed to toggle watchlist:', err);
		} finally {
			watchlistLoading = false;
		}
	}

	onMount(() => {
		loadData();
		checkWatchlist();

		return () => {
			quotes.unsubscribe(symbol);
		};
	});

	// Format large numbers for financials
	function formatBillions(value: number | undefined): string {
		if (!value) return '--';
		if (value >= 1_000_000_000) {
			return `$${(value / 1_000_000_000).toFixed(1)}B`;
		}
		if (value >= 1_000_000) {
			return `$${(value / 1_000_000).toFixed(1)}M`;
		}
		return formatCurrency(value);
	}

	// Find CEO from executives list
	const ceoData = $derived(
		executives.find(e =>
			e.title?.toLowerCase().includes('chief executive') ||
			e.title?.toLowerCase() === 'ceo'
		) || (executives.length > 0 ? executives[0] : null)
	);

	// Format compensation
	function formatPay(value: number | null): string {
		if (!value) return '--';
		if (value >= 1_000_000) {
			return `$${(value / 1_000_000).toFixed(2)}M`;
		}
		if (value >= 1_000) {
			return `$${(value / 1_000).toFixed(0)}K`;
		}
		return `$${value.toLocaleString()}`;
	}

	// Congress trade helpers
	function getCongressPortraitUrl(name: string, title?: string | null): string {
		const chamber = title?.toLowerCase().includes('senator') ? 'senate' : 'house';
		return getCongressPortrait(name, chamber);
	}

	function getPartyAbbrev(party?: string | null): string {
		if (!party) return '?';
		const p = party.toLowerCase();
		if (p.includes('democrat')) return 'D';
		if (p.includes('republican')) return 'R';
		return party.charAt(0).toUpperCase();
	}

	function getPartyClass(party?: string | null): string {
		if (!party) return 'bg-gray-100 text-gray-700';
		const p = party.toLowerCase();
		if (p.includes('democrat')) return 'bg-blue-100 text-blue-800';
		if (p.includes('republican')) return 'bg-red-100 text-red-800';
		return 'bg-gray-100 text-gray-700';
	}

	function formatTradeDate(dateStr: string): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>{symbol} - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<!-- Header -->
	<section class="col-span-full">
		<div class="flex items-baseline gap-4">
			<h1 class="ticker-symbol text-3xl">{symbol}</h1>
			{#if financials?.companyName}
				<span class="text-ink-muted">{financials.companyName}</span>
			{/if}
			{#if financials?.sector}
				<span class="badge">{financials.sector}</span>
			{/if}
		</div>

		{#if loading}
			<div class="animate-pulse mt-2">
				<div class="h-10 bg-gray-200 rounded w-48"></div>
			</div>
		{:else if quoteData}
			<div class="flex items-baseline gap-4 mt-2">
				<span class="text-3xl font-bold">{formatCurrency(quoteData.price ?? 0)}</span>
				<span class={['text-xl font-semibold', getPriceClass(quoteData.changePercent ?? 0)].join(' ')}>
					{formatPercent(quoteData.changePercent ?? 0)} ({quoteData.change !== null && quoteData.change >= 0 ? '+' : ''}{formatCurrency(quoteData.change ?? 0, 'USD', 2)})
				</span>
				{#if quotes.connected}
					<span class="text-xs text-green-600">Live</span>
				{/if}
			</div>
			<p class="byline mt-1">
				{quoteData.exchange ?? 'NYSE'} | Last updated: {quoteData.lastUpdated
					? new Date(quoteData.lastUpdated).toLocaleTimeString()
					: 'Just now'}
			</p>
		{/if}
	</section>

	<!-- Chart -->
	<section class="col-span-8">
		<div class="card">
			<div class="flex items-center justify-between mb-4">
				<h2 class="headline headline-md">Price Chart</h2>
				<div class="flex items-center gap-4">
					<!-- Indicator toggles -->
					<div class="flex items-center gap-2 text-xs">
						<label class="flex items-center gap-1 cursor-pointer">
							<input type="checkbox" bind:checked={showVolume} class="w-3 h-3" />
							<span>Vol</span>
						</label>
						<label class="flex items-center gap-1 cursor-pointer">
							<input type="checkbox" bind:checked={showSMA} class="w-3 h-3" />
							<span>SMA</span>
						</label>
						<label class="flex items-center gap-1 cursor-pointer">
							<input type="checkbox" bind:checked={showEMA} class="w-3 h-3" />
							<span>EMA</span>
						</label>
						<label class="flex items-center gap-1 cursor-pointer">
							<input type="checkbox" bind:checked={showBollinger} class="w-3 h-3" />
							<span>BB</span>
						</label>
						<label class="flex items-center gap-1 cursor-pointer">
							<input type="checkbox" bind:checked={showRSI} class="w-3 h-3" />
							<span>RSI</span>
						</label>
						<label class="flex items-center gap-1 cursor-pointer">
							<input type="checkbox" bind:checked={showMACD} class="w-3 h-3" />
							<span>MACD</span>
						</label>
					</div>
				</div>
			</div>

			{#if loading || chartLoading}
				<div class="h-80 bg-gray-100 animate-pulse rounded"></div>
			{:else if ohlcData.length > 0}
				<CandlestickChart
					data={ohlcData}
					height={360}
					{showVolume}
					{showSMA}
					{showEMA}
					{showBollinger}
					upColor={quoteData?.changePercent && quoteData.changePercent >= 0 ? '#0066cc' : '#0066cc'}
					downColor="#cc0000"
				/>

				{#if showRSI}
					<IndicatorPanel data={ohlcData} type="rsi" height={100} />
				{/if}

				{#if showMACD}
					<IndicatorPanel data={ohlcData} type="macd" height={100} />
				{/if}
			{:else}
				<div class="h-80 bg-newsprint-dark flex items-center justify-center">
					<p class="text-ink-muted">No historical data available</p>
				</div>
			{/if}

			<div class="flex gap-2 mt-4">
				{#each periods as period (period.value)}
					<button
						class="btn btn-small"
						class:btn-primary={selectedPeriod === period.value}
						onclick={() => handlePeriodChange(period.value)}
					>
						{period.label}
					</button>
				{/each}
			</div>
		</div>
	</section>

	<!-- Key Statistics -->
	<aside class="col-span-4">
		<div class="card">
			<h2 class="headline headline-md">Key Statistics</h2>
			{#if loading}
				<div class="animate-pulse space-y-2">
					{#each Array(8) as _, i (i)}
						<div class="h-6 bg-gray-200 rounded"></div>
					{/each}
				</div>
			{:else}
				<table class="data-table">
					<tbody>
						<tr>
							<td class="text-ink-muted">Previous Close</td>
							<td class="text-right font-semibold">
								{quoteData?.previousClose ? formatCurrency(quoteData.previousClose) : '--'}
							</td>
						</tr>
						<tr>
							<td class="text-ink-muted">Open</td>
							<td class="text-right font-semibold">
								{quoteData?.open ? formatCurrency(quoteData.open) : '--'}
							</td>
						</tr>
						<tr>
							<td class="text-ink-muted">Day Range</td>
							<td class="text-right font-semibold">
								{quoteData?.dayLow && quoteData?.dayHigh
									? `${formatCurrency(quoteData.dayLow)} - ${formatCurrency(quoteData.dayHigh)}`
									: '--'}
							</td>
						</tr>
						<tr>
							<td class="text-ink-muted">52 Week Range</td>
							<td class="text-right font-semibold">
								{quoteData?.fiftyTwoWeekLow && quoteData?.fiftyTwoWeekHigh
									? `${formatCurrency(quoteData.fiftyTwoWeekLow)} - ${formatCurrency(quoteData.fiftyTwoWeekHigh)}`
									: '--'}
							</td>
						</tr>
						<tr>
							<td class="text-ink-muted">Volume</td>
							<td class="text-right font-semibold">
								{quoteData?.volume ? formatCompact(quoteData.volume) : '--'}
							</td>
						</tr>
						<tr>
							<td class="text-ink-muted">Market Cap</td>
							<td class="text-right font-semibold">
								{quoteData?.marketCap ? formatCompact(quoteData.marketCap) : '--'}
							</td>
						</tr>
						<tr>
							<td class="text-ink-muted">P/E Ratio</td>
							<td class="text-right font-semibold">
								{financials?.peRatio ? financials.peRatio.toFixed(2) : quoteData?.peRatio?.toFixed(2) ?? '--'}
							</td>
						</tr>
						<tr>
							<td class="text-ink-muted">EPS</td>
							<td class="text-right font-semibold">
								{quoteData?.eps ? formatCurrency(quoteData.eps) : '--'}
							</td>
						</tr>
						<tr>
							<td class="text-ink-muted">Dividend Yield</td>
							<td class="text-right font-semibold">
								{financials?.dividendYield
									? `${(financials.dividendYield * 100).toFixed(2)}%`
									: quoteData?.dividendYield
										? `${(quoteData.dividendYield * 100).toFixed(2)}%`
										: '--'}
							</td>
						</tr>
					</tbody>
				</table>
			{/if}
		</div>

		<div class="card mt-4">
			<button
				class="btn w-full {inWatchlist ? 'btn-secondary' : 'btn-primary'}"
				onclick={toggleWatchlist}
				disabled={watchlistLoading}
			>
				{#if watchlistLoading}
					<span class="inline-block animate-spin mr-2">&#x21BB;</span>
					{inWatchlist ? 'Removing...' : 'Adding...'}
				{:else if inWatchlist}
					<svg class="inline-block w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
					</svg>
					In Watchlist
				{:else}
					Add to Watchlist
				{/if}
			</button>
		</div>

		{#if ceoData || financials?.ceo}
			<div class="card mt-4">
				<!-- CEO Header -->
				<div class="flex gap-4 pb-4 border-b border-ink-light">
					<div class="flex-shrink-0">
						{#if financials?.ceoPortrait?.portraitUrl}
							<img
								src={getPortraitUrl(financials.ceoPortrait.portraitUrl)}
								alt={financials.ceoPortrait.name || financials?.ceo}
								class="w-20 h-24 object-contain border border-ink-light bg-newsprint"
								onerror={(e) => e.currentTarget.style.display = 'none'}
							/>
						{/if}
					</div>
					<div class="flex-1">
						<p class="text-xs text-ink-muted uppercase tracking-wide">Chief Executive Officer</p>
						<p class="font-bold text-lg">{financials?.ceoPortrait?.name || financials?.ceo}</p>
						{#if ceoData?.pay}
							<p class="text-sm mt-1">
								<span class="text-ink-muted">Compensation:</span>
								<span class="font-semibold">{formatPay(ceoData.pay)}</span>
							</p>
						{/if}
					</div>
				</div>

				<!-- Analyst Rating -->
				{#if rating}
					<div class="pt-4 pb-4 border-b border-ink-light">
						<div class="flex items-center justify-between">
							<p class="text-xs text-ink-muted uppercase tracking-wide">Analyst Rating</p>
							<span class="badge {rating.rating === 'Strong Buy' || rating.rating === 'Buy' ? 'badge-gain' : rating.rating === 'Sell' || rating.rating === 'Strong Sell' ? 'badge-loss' : ''} text-sm px-3 py-1">{rating.rating}</span>
						</div>
					</div>
				{/if}

				<!-- Price Target with Visual Range -->
				{#if priceTarget && quoteData?.price}
					{@const currentPrice = quoteData.price}
					{@const low = priceTarget.targetLow}
					{@const high = priceTarget.targetHigh}
					{@const consensus = priceTarget.targetConsensus}
					{@const range = high - low}
					{@const currentPos = Math.max(0, Math.min(100, ((currentPrice - low) / range) * 100))}
					{@const consensusPos = ((consensus - low) / range) * 100}
					{@const upside = ((consensus - currentPrice) / currentPrice) * 100}
					<div class="pt-4 pb-4 border-b border-ink-light">
						<div class="flex items-center justify-between mb-2">
							<p class="text-xs text-ink-muted uppercase tracking-wide">Price Target</p>
							<p class="text-sm">
								<span class="font-bold">{formatCurrency(consensus)}</span>
								<span class={upside >= 0 ? 'text-green-600' : 'text-red-600'}>
									({upside >= 0 ? '+' : ''}{upside.toFixed(1)}%)
								</span>
							</p>
						</div>
						<!-- Price Range Bar -->
						<div class="relative h-2 bg-gray-200 rounded-full mt-3 mb-2">
							<!-- Target range fill -->
							<div class="absolute h-full bg-blue-100 rounded-full" style="left: 0; right: 0;"></div>
							<!-- Consensus marker -->
							<div class="absolute w-1 h-4 bg-blue-600 rounded -top-1" style="left: {consensusPos}%;" title="Target: {formatCurrency(consensus)}"></div>
							<!-- Current price marker -->
							<div class="absolute w-2 h-4 bg-ink rounded -top-1" style="left: {currentPos}%;" title="Current: {formatCurrency(currentPrice)}"></div>
						</div>
						<div class="flex justify-between text-xs text-ink-muted">
							<span>{formatCurrency(low)}</span>
							<span>{formatCurrency(high)}</span>
						</div>
					</div>
				{/if}

				<!-- Intrinsic Value (DCF) -->
				{#if dcf}
					{@const isUndervalued = dcf.dcf > dcf.stockPrice}
					{@const valueDiff = ((dcf.dcf - dcf.stockPrice) / dcf.stockPrice) * 100}
					<div class="pt-4">
						<div class="flex items-center justify-between mb-1">
							<p class="text-xs text-ink-muted uppercase tracking-wide">Intrinsic Value (DCF)</p>
							<span class="text-xs px-2 py-0.5 rounded {isUndervalued ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
								{isUndervalued ? 'Undervalued' : 'Overvalued'}
							</span>
						</div>
						<div class="flex items-baseline gap-2">
							<span class="text-xl font-bold">{formatCurrency(dcf.dcf)}</span>
							<span class="text-sm {isUndervalued ? 'text-green-600' : 'text-red-600'}">
								({valueDiff >= 0 ? '+' : ''}{valueDiff.toFixed(1)}% vs current)
							</span>
						</div>
						<p class="text-xs text-ink-muted mt-1">Current price: {formatCurrency(dcf.stockPrice)}</p>
					</div>
				{/if}
			</div>
		{/if}

		{#if peers.length > 0}
			<div class="card mt-4">
				<h3 class="headline headline-sm">Competitors</h3>
				<div class="flex flex-wrap gap-2 mt-2">
					{#each peers.slice(0, 6) as peer (peer)}
						<a href="/ticker/{peer}" class="badge hover:bg-newsprint-dark">{peer}</a>
					{/each}
				</div>
			</div>
		{/if}

		{#if financials?.description}
			<div class="card mt-4">
				<h3 class="headline headline-sm">About</h3>
				<p class="text-sm text-ink-muted line-clamp-4">{financials.description}</p>
				{#if financials.website}
					<a
						href={financials.website}
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm text-blue-600 hover:underline mt-2 block"
					>
						{financials.website}
					</a>
				{/if}
			</div>
		{/if}
	</aside>

	<!-- Financials Section -->
	<section class="col-span-full">
		<h2 class="headline headline-lg">Financials</h2>

		{#if loading}
			<div class="card animate-pulse">
				<div class="h-48 bg-gray-200 rounded"></div>
			</div>
		{:else if incomeData.length > 0}
			<div class="grid grid-cols-2 gap-4">
				<div class="card">
					<h3 class="headline headline-md">Revenue</h3>
					<BarChart
						data={incomeData.map((d) => ({ label: d.date.slice(0, 4), value: d.revenue })).reverse()}
						label="Revenue"
						height={200}
						formatValue={formatBillions}
					/>
				</div>
				<div class="card">
					<h3 class="headline headline-md">Net Income</h3>
					<BarChart
						data={incomeData.map((d) => ({ label: d.date.slice(0, 4), value: d.netIncome })).reverse()}
						label="Net Income"
						height={200}
						formatValue={formatBillions}
					/>
				</div>
			</div>
		{:else}
			<div class="card">
				<p class="text-ink-muted text-center py-8">
					Financial statements not available for this ticker
					{#if financials?.isMock}
						<br /><span class="text-xs">(Using mock data - FMP API limit may be reached)</span>
					{/if}
				</p>
			</div>
		{/if}
	</section>

	<!-- Congress Trades Section -->
	{#if congressTrades.length > 0}
		<section class="col-span-full">
			<h2 class="headline headline-lg">Congress Trading Activity</h2>
			<div class="card">
				<div class="overflow-x-auto">
					<table class="data-table">
						<thead>
							<tr>
								<th>Official</th>
								<th>Type</th>
								<th>Amount</th>
								<th>Date</th>
							</tr>
						</thead>
						<tbody>
							{#each congressTrades as trade (trade.id)}
								<tr>
									<td>
										<a href="/political/member/{encodeURIComponent(trade.officialName)}" class="flex items-center gap-3 hover:bg-newsprint-dark rounded transition-colors p-1 -m-1">
											<img
												src={getCongressPortraitUrl(trade.officialName, trade.title)}
												alt={trade.officialName}
												class="w-10 h-12 object-contain border border-ink-light bg-newsprint flex-shrink-0"
												onerror={(e) => e.currentTarget.style.display = 'none'}
											/>
											<div>
												<div class="font-semibold hover:underline">{trade.officialName}</div>
												<div class="text-xs text-ink-muted">
													{trade.title || 'Official'}
													{#if trade.party || trade.state}
														<span class="ml-1 px-1.5 py-0.5 rounded text-xs font-medium {getPartyClass(trade.party)}">
															{getPartyAbbrev(trade.party)}{#if trade.state}-{trade.state}{/if}
														</span>
													{/if}
												</div>
											</div>
										</a>
									</td>
									<td>
										<span class={trade.transactionType === 'BUY' ? 'badge badge-gain' : trade.transactionType === 'SELL' ? 'badge badge-loss' : 'badge'}>
											{trade.transactionType}
										</span>
									</td>
									<td class="font-semibold whitespace-nowrap">{trade.amountDisplay}</td>
									<td class="whitespace-nowrap text-ink-muted">{formatTradeDate(trade.transactionDate)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="mt-4 text-center">
					<a href="/political?ticker={symbol}" class="text-sm text-blue-600 hover:underline">View all Congress trades for {symbol}</a>
				</div>
			</div>
		</section>
	{/if}

	{#if error}
		<div class="col-span-full card bg-red-50 text-red-700">
			{error}
		</div>
	{/if}
</div>
