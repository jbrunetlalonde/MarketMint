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
	import FinancialTable from '$lib/components/FinancialTable.svelte';
	import FinancialChart from '$lib/components/FinancialChart.svelte';
	import CompanyAbout from '$lib/components/CompanyAbout.svelte';
	import ExecutiveCard from '$lib/components/ExecutiveCard.svelte';
	import RatingsRadar from '$lib/components/RatingsRadar.svelte';
	import PriceTargetCard from '$lib/components/PriceTargetCard.svelte';
	import InstitutionalOwners from '$lib/components/InstitutionalOwners.svelte';
	import SplitHistory from '$lib/components/SplitHistory.svelte';
	import SectorPeers from '$lib/components/SectorPeers.svelte';
	import api from '$lib/utils/api';
	import { getPortraitUrl, getCongressPortraitUrl as getCongressPortrait } from '$lib/utils/urls';

	const symbol = $derived(page.params.symbol?.toUpperCase() || '');

	let loading = $state(true);
	let chartLoading = $state(false);
	let error = $state<string | null>(null);
	let selectedPeriod = $state('1y');
	let financialPeriod = $state<'annual' | 'quarter'>('annual');
	let activeFinancialTab = $state<'income' | 'balance' | 'cashflow'>('income');

	// Chart options
	let showVolume = $state(true);
	let showSMA = $state(false);
	let showEMA = $state(false);
	let showBollinger = $state(false);
	let showRSI = $state(false);
	let showMACD = $state(false);

	// Quote data from store
	const quoteData = $derived(quotes.getQuote(symbol));

	// Profile/Financial data
	let profile = $state<{
		name?: string;
		sector?: string;
		industry?: string;
		description?: string;
		ceo?: string;
		employees?: number;
		website?: string;
		image?: string;
		ipoDate?: string;
		headquarters?: string;
	} | null>(null);

	let ceoPortrait = $state<string | null>(null);

	// Executive data
	let executives = $state<Array<{
		name: string;
		title: string;
		pay: number | null;
		currencyPay?: string;
		yearBorn?: number;
		titleSince?: number;
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
		targetMedian: number;
	} | null>(null);

	let dcf = $state<{
		dcf: number;
		stockPrice: number;
	} | null>(null);

	let peers = $state<string[]>([]);
	let peerQuotes = $state<Record<string, { ticker: string; price?: number; changePercent?: number; marketCap?: number }>>({});

	// Financial statement data
	let incomeData = $state<Array<{
		date: string;
		period: string;
		revenue: number;
		netIncome: number;
		grossProfit: number;
		operatingIncome: number;
		eps: number;
	}>>([]);

	let balanceData = $state<Array<{
		date: string;
		period: string;
		cashAndCashEquivalents: number;
		totalAssets: number;
		totalLiabilities: number;
		totalEquity: number;
		totalDebt: number;
		netDebt: number;
	}>>([]);

	let cashflowData = $state<Array<{
		date: string;
		period: string;
		netIncome: number;
		operatingCashFlow: number;
		investingCashFlow: number;
		financingCashFlow: number;
		freeCashFlow: number;
		capitalExpenditure: number;
	}>>([]);

	// Institutional holders
	let institutionalHolders = $state<Array<{
		holder: string;
		shares: number;
		dateReported: string;
		change: number;
		changePercentage: number;
	}>>([]);

	// Stock splits
	let splits = $state<Array<{
		date: string;
		label: string;
		numerator: number;
		denominator: number;
	}>>([]);

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

	// Loading states
	let financialsLoading = $state(false);
	let institutionalLoading = $state(false);
	let splitsLoading = $state(false);

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
					profile = {
						name: data.profile.name,
						sector: data.profile.sector,
						industry: data.profile.industry,
						description: data.profile.description,
						ceo: data.profile.ceo,
						employees: data.profile.employees,
						website: data.profile.website,
						image: data.profile.image,
						ipoDate: data.profile.ipoDate
					};
				}
				if (data.ceoPortrait?.portraitUrl) {
					ceoPortrait = getPortraitUrl(data.ceoPortrait.portraitUrl);
				}
				executives = data.executives || [];
				rating = data.rating;
				priceTarget = data.priceTarget as typeof priceTarget;
				dcf = data.dcf;
				peers = data.peers || [];

				// Fetch peer quotes
				if (peers.length > 0) {
					loadPeerQuotes(peers);
				}
			}

			// Fetch OHLC price history with indicators
			await loadOHLC(selectedPeriod);

			// Load financial statements
			await loadFinancials(financialPeriod);

			// Fetch additional data in parallel
			const [congressRes, institutionalRes, splitsRes] = await Promise.all([
				api.getPoliticalTradesByTicker(symbol, 10),
				api.getInstitutionalHolders(symbol),
				api.getSplits(symbol)
			]);

			if (congressRes.success && congressRes.data) {
				congressTrades = congressRes.data;
			}

			if (institutionalRes.success && institutionalRes.data) {
				institutionalHolders = institutionalRes.data;
			}

			if (splitsRes.success && splitsRes.data) {
				splits = splitsRes.data;
			}
		} catch (err) {
			error = 'Failed to load stock data';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function loadFinancials(period: 'annual' | 'quarter') {
		financialsLoading = true;
		try {
			const [incomeRes, balanceRes, cashflowRes] = await Promise.all([
				api.getIncomeStatement(symbol, period, 5),
				api.getBalanceSheet(symbol, period, 5),
				api.getCashFlow(symbol, period, 5)
			]);

			if (incomeRes.success && incomeRes.data) {
				incomeData = incomeRes.data;
			}
			if (balanceRes.success && balanceRes.data) {
				balanceData = balanceRes.data;
			}
			if (cashflowRes.success && cashflowRes.data) {
				cashflowData = cashflowRes.data;
			}
		} catch (err) {
			console.error('Failed to load financials:', err);
		} finally {
			financialsLoading = false;
		}
	}

	async function loadPeerQuotes(peerTickers: string[]) {
		try {
			const filteredPeers = peerTickers.filter(p => p !== symbol).slice(0, 8);
			if (filteredPeers.length === 0) return;

			const res = await api.getBulkQuotes(filteredPeers);
			if (res.success && res.data) {
				const quotesMap: typeof peerQuotes = {};
				for (const q of res.data) {
					quotesMap[q.ticker] = {
						ticker: q.ticker,
						price: q.price,
						changePercent: q.changePercent,
						marketCap: q.marketCap
					};
				}
				peerQuotes = quotesMap;
			}
		} catch (err) {
			console.error('Failed to load peer quotes:', err);
		}
	}

	async function loadOHLC(period: string) {
		chartLoading = true;
		try {
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

	function handleFinancialPeriodChange(period: 'annual' | 'quarter') {
		financialPeriod = period;
		loadFinancials(period);
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
				if (res.success) inWatchlist = false;
			} else {
				const res = await api.addToWatchlist(auth.accessToken, symbol);
				if (res.success) inWatchlist = true;
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

<div class="ticker-page">
	<!-- Header -->
	<header class="ticker-header">
		<div class="header-main">
			<div class="header-left">
				<h1 class="ticker-symbol">{symbol}</h1>
				{#if profile?.name}
					<span class="company-name">{profile.name}</span>
				{/if}
				{#if profile?.sector}
					<span class="sector-badge">{profile.sector}</span>
				{/if}
			</div>

			<div class="header-actions">
				<button
					class="watchlist-btn"
					class:in-watchlist={inWatchlist}
					onclick={toggleWatchlist}
					disabled={watchlistLoading}
				>
					{#if watchlistLoading}
						...
					{:else if inWatchlist}
						In Watchlist
					{:else}
						+ Watchlist
					{/if}
				</button>
			</div>
		</div>

		{#if loading}
			<div class="price-loading"></div>
		{:else if quoteData}
			<div class="price-display">
				<span class="current-price">{formatCurrency(quoteData.price ?? 0)}</span>
				<span class="price-change {getPriceClass(quoteData.changePercent ?? 0)}">
					{formatPercent(quoteData.changePercent ?? 0)}
					({quoteData.change !== null && quoteData.change >= 0 ? '+' : ''}{formatCurrency(quoteData.change ?? 0, 'USD', 2)})
				</span>
				{#if quotes.connected}
					<span class="live-indicator">Live</span>
				{/if}
			</div>
			<p class="quote-meta">
				{quoteData.exchange ?? 'NYSE'} | Updated: {quoteData.lastUpdated
					? new Date(quoteData.lastUpdated).toLocaleTimeString()
					: 'Just now'}
			</p>
		{/if}
	</header>

	<!-- Main Content Grid -->
	<div class="content-grid">
		<!-- Chart Section -->
		<section class="chart-section">
			<div class="section-header">
				<h2>Price Chart</h2>
				<div class="indicator-toggles">
					<button
						class="indicator-btn"
						class:active={showVolume}
						onclick={() => showVolume = !showVolume}
						title="Toggle volume bars"
					>Vol</button>
					<button
						class="indicator-btn"
						class:active={showSMA}
						onclick={() => showSMA = !showSMA}
						title="Simple Moving Average (20, 50, 200)"
					>SMA</button>
					<button
						class="indicator-btn"
						class:active={showEMA}
						onclick={() => showEMA = !showEMA}
						title="Exponential Moving Average (12, 26)"
					>EMA</button>
					<button
						class="indicator-btn"
						class:active={showBollinger}
						onclick={() => showBollinger = !showBollinger}
						title="Bollinger Bands"
					>BB</button>
					<span class="indicator-divider"></span>
					<button
						class="indicator-btn"
						class:active={showRSI}
						onclick={() => showRSI = !showRSI}
						title="Relative Strength Index"
					>RSI</button>
					<button
						class="indicator-btn"
						class:active={showMACD}
						onclick={() => showMACD = !showMACD}
						title="Moving Average Convergence Divergence"
					>MACD</button>
				</div>
			</div>

			{#if loading || chartLoading}
				<div class="chart-loading"></div>
			{:else if ohlcData.length > 0}
				<CandlestickChart
					data={ohlcData}
					height={360}
					{showVolume}
					{showSMA}
					{showEMA}
					{showBollinger}
				/>

				{#if showRSI}
					<IndicatorPanel data={ohlcData} type="rsi" height={100} />
				{/if}

				{#if showMACD}
					<IndicatorPanel data={ohlcData} type="macd" height={100} />
				{/if}
			{:else}
				<div class="chart-empty">No historical data available</div>
			{/if}

			<div class="period-buttons">
				{#each periods as period (period.value)}
					<button
						class="period-btn"
						class:active={selectedPeriod === period.value}
						onclick={() => handlePeriodChange(period.value)}
					>
						{period.label}
					</button>
				{/each}
			</div>
		</section>

		<!-- Key Statistics Sidebar -->
		<aside class="stats-sidebar">
			<div class="stats-card">
				<h3>Key Statistics</h3>
				{#if loading}
					<div class="stats-loading"></div>
				{:else}
					<table class="stats-table">
						<tbody>
							<tr>
								<td title="The closing price from the previous trading day">Previous Close</td>
								<td>{quoteData?.previousClose ? formatCurrency(quoteData.previousClose) : '--'}</td>
							</tr>
							<tr>
								<td title="The price at which the stock started trading today">Open</td>
								<td>{quoteData?.open ? formatCurrency(quoteData.open) : '--'}</td>
							</tr>
							<tr>
								<td title="The lowest and highest prices reached during today's session">Day Range</td>
								<td>{quoteData?.dayLow && quoteData?.dayHigh
									? `${formatCurrency(quoteData.dayLow)} - ${formatCurrency(quoteData.dayHigh)}`
									: '--'}</td>
							</tr>
							<tr>
								<td title="The lowest and highest prices over the past 52 weeks">52W Range</td>
								<td>{quoteData?.fiftyTwoWeekLow && quoteData?.fiftyTwoWeekHigh
									? `${formatCurrency(quoteData.fiftyTwoWeekLow)} - ${formatCurrency(quoteData.fiftyTwoWeekHigh)}`
									: '--'}</td>
							</tr>
							<tr>
								<td title="Number of shares traded today">Volume</td>
								<td>{quoteData?.volume ? formatCompact(quoteData.volume) : '--'}</td>
							</tr>
							<tr>
								<td title="Total market value of all outstanding shares">Market Cap</td>
								<td>{quoteData?.marketCap ? formatCompact(quoteData.marketCap) : '--'}</td>
							</tr>
							<tr>
								<td title="Price-to-Earnings ratio: Stock price divided by earnings per share. Higher values may indicate overvaluation.">P/E Ratio</td>
								<td>{quoteData?.peRatio?.toFixed(2) ?? '--'}</td>
							</tr>
							<tr>
								<td title="Earnings Per Share: Net income divided by outstanding shares. Higher is generally better.">EPS</td>
								<td>{quoteData?.eps ? formatCurrency(quoteData.eps) : '--'}</td>
							</tr>
						</tbody>
					</table>
				{/if}
			</div>
		</aside>

		<!-- Company Info Row -->
		<section class="company-row">
			<div class="company-about-wrapper">
				<CompanyAbout
					name={profile?.name ?? symbol}
					description={profile?.description}
					sector={profile?.sector}
					industry={profile?.industry}
					website={profile?.website}
					employees={profile?.employees}
					headquarters={profile?.headquarters}
					ipoDate={profile?.ipoDate}
					ceo={profile?.ceo}
					loading={loading}
				/>
			</div>
			<div class="executive-wrapper">
				<ExecutiveCard
					{executives}
					ceoPortrait={ceoPortrait ?? undefined}
					loading={loading}
				/>
			</div>
		</section>

		<!-- Analyst Section -->
		<section class="analyst-row">
			<div class="ratings-wrapper">
				<RatingsRadar
					rating={rating?.rating}
					ratingScore={rating?.ratingScore}
					ratingRecommendation={rating?.ratingRecommendation}
					loading={loading}
				/>
			</div>
			<div class="price-target-wrapper">
				<PriceTargetCard
					currentPrice={quoteData?.price ?? 0}
					targetHigh={priceTarget?.targetHigh}
					targetLow={priceTarget?.targetLow}
					targetConsensus={priceTarget?.targetConsensus}
					targetMedian={priceTarget?.targetMedian}
					loading={loading}
				/>
			</div>
		</section>

		<!-- Financial Statements Section -->
		<section class="financials-section">
			<div class="financials-header">
				<h2>Financial Statements</h2>
				<div class="period-toggle">
					<button
						class="toggle-btn"
						class:active={financialPeriod === 'annual'}
						onclick={() => handleFinancialPeriodChange('annual')}
					>
						Annual
					</button>
					<button
						class="toggle-btn"
						class:active={financialPeriod === 'quarter'}
						onclick={() => handleFinancialPeriodChange('quarter')}
					>
						Quarterly
					</button>
				</div>
			</div>

			<div class="financial-tabs">
				<button
					class="tab-btn"
					class:active={activeFinancialTab === 'income'}
					onclick={() => activeFinancialTab = 'income'}
				>
					Income Statement
				</button>
				<button
					class="tab-btn"
					class:active={activeFinancialTab === 'balance'}
					onclick={() => activeFinancialTab = 'balance'}
				>
					Balance Sheet
				</button>
				<button
					class="tab-btn"
					class:active={activeFinancialTab === 'cashflow'}
					onclick={() => activeFinancialTab = 'cashflow'}
				>
					Cash Flow
				</button>
			</div>

			<div class="tab-content">
				{#if activeFinancialTab === 'income'}
					{#if incomeData.length > 0}
						<FinancialChart type="income" data={incomeData} />
					{/if}
					<FinancialTable
						type="income"
						data={incomeData}
						loading={financialsLoading}
					/>
				{:else if activeFinancialTab === 'balance'}
					{#if balanceData.length > 0}
						<FinancialChart type="balance" data={balanceData} />
					{/if}
					<FinancialTable
						type="balance"
						data={balanceData}
						loading={financialsLoading}
					/>
				{:else}
					{#if cashflowData.length > 0}
						<FinancialChart type="cashflow" data={cashflowData} />
					{/if}
					<FinancialTable
						type="cashflow"
						data={cashflowData}
						loading={financialsLoading}
					/>
				{/if}
			</div>
		</section>

		<!-- Additional Info Row -->
		<section class="info-row">
			<div class="institutional-wrapper">
				<InstitutionalOwners
					holders={institutionalHolders}
					loading={institutionalLoading}
				/>
			</div>
			<div class="splits-wrapper">
				<SplitHistory
					{splits}
					loading={splitsLoading}
				/>
			</div>
			<div class="peers-wrapper">
				<SectorPeers
					{peers}
					quotes={peerQuotes}
					currentTicker={symbol}
					loading={loading}
				/>
			</div>
		</section>

		<!-- Congress Trades Section -->
		{#if congressTrades.length > 0}
			<section class="congress-section">
				<div class="section-card">
					<div class="section-header">
						<h2>Congress Trading Activity</h2>
					</div>
					<div class="congress-table-wrapper">
						<table class="congress-table">
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
											<a href="/political/member/{encodeURIComponent(trade.officialName)}" class="official-link">
												<img
													src={getCongressPortraitUrl(trade.officialName, trade.title)}
													alt={trade.officialName}
													class="official-portrait"
													onerror={(e) => e.currentTarget.style.display = 'none'}
												/>
												<div class="official-info">
													<span class="official-name">{trade.officialName}</span>
													<span class="official-title">
														{trade.title || 'Official'}
														{#if trade.party || trade.state}
															<span class="party-badge {getPartyClass(trade.party)}">
																{getPartyAbbrev(trade.party)}{#if trade.state}-{trade.state}{/if}
															</span>
														{/if}
													</span>
												</div>
											</a>
										</td>
										<td>
											<span class="trade-type" class:buy={trade.transactionType === 'BUY'} class:sell={trade.transactionType === 'SELL'}>
												{trade.transactionType}
											</span>
										</td>
										<td class="trade-amount">{trade.amountDisplay}</td>
										<td class="trade-date">{formatTradeDate(trade.transactionDate)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<div class="congress-more">
						<a href="/political?ticker={symbol}">View all Congress trades for {symbol}</a>
					</div>
				</div>
			</section>
		{/if}
	</div>

	{#if error}
		<div class="error-banner">
			{error}
		</div>
	{/if}
</div>

<style>
	.ticker-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	/* Header */
	.ticker-header {
		padding: 1.5rem 0;
		border-bottom: 2px solid var(--color-border);
		margin-bottom: 1.5rem;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.header-left {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.ticker-symbol {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-ink);
		margin: 0;
	}

	.company-name {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1rem;
		color: var(--color-ink-muted);
	}

	.sector-badge {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 4px 8px;
		background: var(--color-newsprint-dark);
		border: 1px solid var(--color-border);
		color: var(--color-ink-muted);
	}

	.watchlist-btn {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		padding: 8px 16px;
		border: 1px solid var(--color-border);
		background: var(--color-paper);
		color: var(--color-ink);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.watchlist-btn:hover {
		background: var(--color-newsprint-dark);
	}

	.watchlist-btn.in-watchlist {
		background: var(--color-gain);
		color: white;
		border-color: var(--color-gain);
	}

	.price-display {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		margin-top: 0.75rem;
	}

	.current-price {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.price-change {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.live-indicator {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		text-transform: uppercase;
		color: var(--color-gain);
	}

	.quote-meta {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin-top: 4px;
	}

	.price-loading {
		height: 3rem;
		background: var(--color-newsprint-dark);
		animation: pulse 1.5s infinite;
		margin-top: 0.75rem;
		width: 200px;
	}

	/* Content Grid */
	.content-grid {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 1.5rem;
	}

	/* Chart Section */
	.chart-section {
		grid-column: 1;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		padding: 1rem;
	}

	.chart-section .section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	.chart-section .section-header h2 {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
		color: var(--color-ink);
	}

	.indicator-toggles {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.indicator-btn {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 8px 14px;
		border: 2px solid var(--color-ink);
		background: transparent;
		color: var(--color-ink);
		cursor: pointer;
		transition: all 0.15s ease;
		min-width: 48px;
	}

	.indicator-btn:hover {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	.indicator-btn.active {
		background: var(--color-ink);
		color: var(--color-paper);
		border-color: var(--color-ink);
	}

	.indicator-divider {
		width: 1px;
		height: 20px;
		background: var(--color-border);
		margin: 0 0.5rem;
	}

	.chart-loading {
		height: 360px;
		background: var(--color-newsprint-dark);
		animation: pulse 1.5s infinite;
	}

	.chart-empty {
		height: 360px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
	}

	.period-buttons {
		display: flex;
		gap: 0.375rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.period-btn {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 10px 18px;
		min-width: 48px;
		border: 2px solid var(--color-ink);
		background: transparent;
		color: var(--color-ink);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.period-btn:hover {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	.period-btn.active {
		background: var(--color-ink);
		color: var(--color-paper);
		border-color: var(--color-ink);
	}

	/* Stats Sidebar */
	.stats-sidebar {
		grid-column: 2;
		grid-row: 1;
	}

	.stats-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
	}

	.stats-card h3 {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
		padding: 0.75rem 1rem;
		background: var(--color-newsprint-dark);
		border-bottom: 1px solid var(--color-border);
		color: var(--color-ink);
	}

	.stats-table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
	}

	.stats-table td {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	.stats-table td:first-child {
		color: var(--color-ink-muted);
		cursor: help;
	}

	.stats-table td:first-child:hover {
		color: var(--color-ink);
	}

	.stats-table td:last-child {
		text-align: right;
		font-weight: 500;
		color: var(--color-ink);
	}

	.stats-table tr:last-child td {
		border-bottom: none;
	}

	.stats-loading {
		height: 300px;
		background: var(--color-newsprint-dark);
		animation: pulse 1.5s infinite;
	}

	/* Section Rows */
	.company-row,
	.analyst-row,
	.info-row {
		grid-column: 1 / -1;
		display: grid;
		gap: 1.5rem;
	}

	.company-row {
		grid-template-columns: 2fr 1fr;
	}

	.analyst-row {
		grid-template-columns: 1fr 1fr;
	}

	.info-row {
		grid-template-columns: 1fr 1fr 1fr;
	}

	/* Financials Section */
	.financials-section {
		grid-column: 1 / -1;
	}

	.financials-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.financials-header h2 {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
		color: var(--color-ink);
	}

	.period-toggle {
		display: inline-flex;
		border: 2px solid var(--color-ink);
		border-radius: 4px;
		overflow: hidden;
	}

	.toggle-btn {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8125rem;
		font-weight: 600;
		padding: 10px 20px;
		border: none;
		background: transparent;
		color: var(--color-ink);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toggle-btn:first-child {
		border-right: 2px solid var(--color-ink);
	}

	.toggle-btn:hover:not(.active) {
		background: var(--color-newsprint-dark);
	}

	.toggle-btn.active {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	.financial-tabs {
		display: flex;
		border-bottom: 2px solid var(--color-border);
		margin-bottom: 0;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-bottom: none;
	}

	.tab-btn {
		flex: 1;
		padding: 14px 20px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: transparent;
		border: none;
		border-bottom: 3px solid transparent;
		color: var(--color-ink-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab-btn:hover:not(.active) {
		color: var(--color-ink);
		background: var(--color-newsprint-dark);
	}

	.tab-btn.active {
		color: var(--color-ink);
		border-bottom-color: var(--color-ink);
		background: var(--color-paper);
	}

	.tab-content {
		border: 1px solid var(--color-border);
		border-top: 2px solid var(--color-ink);
	}

	/* Congress Section */
	.congress-section {
		grid-column: 1 / -1;
	}

	.section-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
	}

	.section-card .section-header {
		padding: 0.75rem 1rem;
		background: var(--color-newsprint-dark);
		border-bottom: 1px solid var(--color-border);
	}

	.section-card .section-header h2 {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
		color: var(--color-ink);
	}

	.congress-table-wrapper {
		overflow-x: auto;
	}

	.congress-table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
	}

	.congress-table th,
	.congress-table td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
	}

	.congress-table th {
		font-weight: 600;
		color: var(--color-ink-muted);
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.official-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		color: inherit;
	}

	.official-link:hover {
		background: var(--color-newsprint-dark);
	}

	.official-portrait {
		width: 40px;
		height: 48px;
		object-fit: cover;
		border: 1px solid var(--color-border);
		background: var(--color-newsprint-dark);
	}

	.official-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.official-name {
		font-weight: 600;
		color: var(--color-ink);
	}

	.official-title {
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.party-badge {
		display: inline-block;
		padding: 1px 4px;
		border-radius: 2px;
		font-size: 0.5rem;
		font-weight: 600;
		margin-left: 4px;
	}

	.trade-type {
		display: inline-block;
		padding: 2px 8px;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		background: var(--color-newsprint-dark);
	}

	.trade-type.buy {
		background: rgba(13, 122, 62, 0.1);
		color: var(--color-gain);
	}

	.trade-type.sell {
		background: rgba(196, 30, 58, 0.1);
		color: var(--color-loss);
	}

	.trade-amount {
		font-weight: 600;
		white-space: nowrap;
	}

	.trade-date {
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	.congress-more {
		padding: 0.75rem;
		text-align: center;
		border-top: 1px solid var(--color-border);
	}

	.congress-more a {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--color-accent);
		text-decoration: none;
	}

	.congress-more a:hover {
		text-decoration: underline;
	}

	/* Error Banner */
	.error-banner {
		padding: 1rem;
		background: rgba(196, 30, 58, 0.1);
		border: 1px solid var(--color-loss);
		color: var(--color-loss);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		margin-top: 1.5rem;
	}

	/* Animations */
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.content-grid {
			grid-template-columns: 1fr;
		}

		.chart-section {
			grid-column: 1;
		}

		.stats-sidebar {
			grid-column: 1;
			grid-row: auto;
		}

		.company-row,
		.analyst-row {
			grid-template-columns: 1fr;
		}

		.info-row {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 640px) {
		.info-row {
			grid-template-columns: 1fr;
		}

		.header-main {
			flex-direction: column;
		}

		.chart-section .section-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.indicator-toggles {
			flex-wrap: wrap;
			gap: 0.375rem;
			width: 100%;
		}

		.indicator-btn {
			flex: 1;
			min-width: 50px;
			padding: 8px 6px;
			font-size: 0.6875rem;
		}

		.indicator-divider {
			display: none;
		}

		.period-buttons {
			flex-wrap: wrap;
		}

		.period-btn {
			flex: 1;
			min-width: 40px;
			padding: 10px 8px;
		}

		.financial-tabs {
			flex-direction: column;
		}

		.tab-btn {
			border-bottom: 1px solid var(--color-border);
			border-right: none;
			padding: 12px 16px;
			text-align: left;
		}

		.tab-btn.active {
			border-left: 3px solid var(--color-ink);
			border-bottom-color: var(--color-border);
			background: var(--color-newsprint-dark);
		}
	}
</style>
