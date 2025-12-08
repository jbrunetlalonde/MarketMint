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
	import { getCompanyLogoUrl, getPortraitUrl, getCongressPortraitUrl, getAvatarFallback } from '$lib/utils/urls';
	import api from '$lib/utils/api';

	// Chart.js imports
	import { Chart, registerables } from 'chart.js';
	Chart.register(...registerables);

	const symbol = $derived(page.params.symbol?.toUpperCase() || '');

	let loading = $state(true);
	let chartLoading = $state(false);
	let error = $state<string | null>(null);
	let selectedPeriod = $state('1y');
	let financialPeriod = $state<'annual' | 'quarter'>('quarter');
	let activeFinancialTab = $state<'income' | 'balance' | 'cashflow'>('income');

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

	// Get CEO from executives
	const ceo = $derived(executives.find(e => e.title?.toLowerCase().includes('ceo') || e.title?.toLowerCase().includes('chief executive')));

	// Analyst data
	let rating = $state<{
		rating: string;
		ratingScore: number;
		ratingRecommendation: string;
		ratingDetailsDCFScore?: number;
		ratingDetailsDCFRecommendation?: string;
		ratingDetailsROEScore?: number;
		ratingDetailsROERecommendation?: string;
		ratingDetailsROAScore?: number;
		ratingDetailsROARecommendation?: string;
		ratingDetailsDEScore?: number;
		ratingDetailsDERecommendation?: string;
		ratingDetailsPEScore?: number;
		ratingDetailsPERecommendation?: string;
		ratingDetailsPBScore?: number;
		ratingDetailsPBRecommendation?: string;
	} | null>(null);

	let priceTarget = $state<{
		targetHigh: number;
		targetLow: number;
		targetConsensus: number;
		targetMedian: number;
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
		operatingExpenses?: number;
		eps: number;
		ebitda?: number;
		netProfitMargin?: number;
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
		netCashFlow?: number;
	}>>([]);

	// Institutional holders
	let institutionalHolders = $state<Array<{
		holder: string;
		shares: number;
		dateReported: string;
		change: number;
		changePercentage: number;
		value?: number;
	}>>([]);

	// Stock splits
	let splits = $state<Array<{
		date: string;
		label: string;
		numerator: number;
		denominator: number;
	}>>([]);

	// News articles
	let news = $state<Array<{
		title: string;
		url: string;
		publishedDate: string;
		site: string;
		text?: string;
		image?: string;
	}>>([]);

	// Analyst grades
	let analystGrades = $state<Array<{
		symbol?: string;
		publishedDate: string;
		gradingCompany: string;
		newGrade: string;
		previousGrade?: string;
		action: string;
	}>>([]);

	// Revenue segments
	let revenueSegments = $state<{
		productSegments: Array<{ segment: string; revenue: number; year: number; quarter?: number }>;
		geographicSegments: Array<{ segment: string; revenue: number; year: number }>;
	}>({ productSegments: [], geographicSegments: [] });

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

	// OHLC price data for chart
	interface OHLCData {
		time: string;
		open: number;
		high: number;
		low: number;
		close: number;
		volume: number;
	}
	let ohlcData = $state<OHLCData[]>([]);

	// Loading states
	let financialsLoading = $state(false);

	// Watchlist state
	let inWatchlist = $state(false);
	let watchlistLoading = $state(false);

	// Chart canvas refs
	let priceChartCanvas = $state<HTMLCanvasElement | null>(null);
	let priceChart = $state<Chart | null>(null);

	const periods = [
		{ label: '1D', value: '1d' },
		{ label: '1W', value: '5d' },
		{ label: '1M', value: '1m' },
		{ label: '3M', value: '3m' },
		{ label: '6M', value: '6m' },
		{ label: 'YTD', value: 'ytd' },
		{ label: '1YR', value: '1y' },
		{ label: '5YR', value: '5y' },
		{ label: '10YR', value: '10y' },
		{ label: 'All', value: 'max' }
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
				peers = data.peers || [];

				if (peers.length > 0) {
					loadPeerQuotes(peers);
				}
			}

			// Fetch OHLC price history
			await loadOHLC(selectedPeriod);

			// Load financial statements
			await loadFinancials(financialPeriod);

			// Fetch additional data in parallel
			const [
				congressRes,
				institutionalRes,
				splitsRes,
				newsRes,
				gradesRes,
				segmentsRes
			] = await Promise.all([
				api.getPoliticalTradesByTicker(symbol, 10),
				api.getInstitutionalHolders(symbol),
				api.getSplits(symbol),
				api.getStockNews(symbol, 10),
				api.getAnalystGrades(symbol, 20),
				api.getRevenueSegmentsV2(symbol)
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
			if (newsRes.success && newsRes.data) {
				news = newsRes.data;
			}
			if (gradesRes.success && gradesRes.data) {
				analystGrades = gradesRes.data;
			}
			if (segmentsRes.success && segmentsRes.data) {
				revenueSegments = segmentsRes.data;
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
			const filteredPeers = peerTickers.filter(p => p !== symbol).slice(0, 10);
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
			const res = await api.getIndicators(symbol, { period });
			if (res.success && res.data?.indicators) {
				ohlcData = res.data.indicators;
				updatePriceChart();
			}
		} catch (err) {
			console.error('Failed to load OHLC data:', err);
		} finally {
			chartLoading = false;
		}
	}

	function updatePriceChart() {
		if (!priceChartCanvas || ohlcData.length === 0) return;

		const ctx = priceChartCanvas.getContext('2d');
		if (!ctx) return;

		if (priceChart) {
			priceChart.destroy();
		}

		const labels = ohlcData.map(d => {
			const date = new Date(d.time);
			if (selectedPeriod === '1d') {
				return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
			}
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		});

		const prices = ohlcData.map(d => d.close);

		priceChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels,
				datasets: [{
					data: prices,
					borderColor: '#d97706',
					backgroundColor: 'rgba(217, 119, 6, 0.1)',
					borderWidth: 2,
					fill: true,
					tension: 0.1,
					pointRadius: 0,
					pointHoverRadius: 4
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						mode: 'index',
						intersect: false,
						callbacks: {
							label: (ctx) => `$${ctx.parsed.y.toFixed(2)}`
						}
					}
				},
				scales: {
					x: {
						grid: { display: false },
						ticks: {
							font: { family: 'IBM Plex Mono', size: 10 },
							color: '#666',
							maxTicksLimit: 8
						}
					},
					y: {
						position: 'left',
						grid: { color: 'rgba(0,0,0,0.05)' },
						ticks: {
							font: { family: 'IBM Plex Mono', size: 10 },
							color: '#666',
							callback: (value) => `$${value}`
						}
					}
				},
				interaction: {
					mode: 'nearest',
					axis: 'x',
					intersect: false
				}
			}
		});
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
			if (priceChart) priceChart.destroy();
		};
	});

	// Update chart when canvas is ready
	$effect(() => {
		if (priceChartCanvas && ohlcData.length > 0) {
			updatePriceChart();
		}
	});

	// Helper functions
	function formatPeriodLabel(date: string, period: string): string {
		const d = new Date(date);
		if (financialPeriod === 'quarter') {
			const q = Math.ceil((d.getMonth() + 1) / 3);
			return `Q${q}-${d.getFullYear()}`;
		}
		return d.getFullYear().toString();
	}

	function getChangeIndicator(current: number, previous: number | undefined): string {
		if (!previous || previous === 0) return '';
		return current >= previous ? '^' : 'v';
	}

	function getChangeClass(current: number, previous: number | undefined): string {
		if (!previous || previous === 0) return '';
		return current >= previous ? 'positive' : 'negative';
	}

	function formatTradeDate(dateStr: string): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
	}

	function getCongressPortrait(name: string, title?: string | null): string {
		const chamber = title?.toLowerCase().includes('senator') ? 'senate' : 'house';
		return getCongressPortraitUrl(name, chamber);
	}

	// Grade summary calculations
	const gradeSummary = $derived.by(() => {
		const summary: Record<string, number> = {};
		for (const grade of analystGrades) {
			const g = grade.newGrade;
			summary[g] = (summary[g] || 0) + 1;
		}
		return summary;
	});

	// Institutional ownership summary
	const institutionalSummary = $derived.by(() => {
		const totalShares = institutionalHolders.reduce((sum, h) => sum + h.shares, 0);
		const sharesOutstanding = quoteData?.sharesOutstanding || 1;
		const percentOwned = (totalShares / sharesOutstanding) * 100;
		return {
			percentOwned: Math.min(percentOwned, 100),
			totalHolders: institutionalHolders.length
		};
	});

	// Senate and House congress trades
	const senateTrades = $derived(congressTrades.filter(t => t.title?.toLowerCase().includes('senator')));
	const houseTrades = $derived(congressTrades.filter(t => !t.title?.toLowerCase().includes('senator')));
</script>

<svelte:head>
	<title>{symbol} - {profile?.name || 'Stock'} | MarketMint</title>
</svelte:head>

<div class="ticker-page">
	<!-- Header -->
	<header class="ticker-header">
		<div class="header-top">
			<div class="header-left">
				<img
					src={getCompanyLogoUrl(symbol)}
					alt={symbol}
					class="stock-logo"
					onerror={(e) => { e.currentTarget.style.display = 'none'; }}
				/>
				<div class="header-info">
					<div class="symbol-row">
						<h1 class="ticker-symbol">{symbol}</h1>
						<button
							class="watchlist-btn"
							class:in-watchlist={inWatchlist}
							onclick={toggleWatchlist}
							disabled={watchlistLoading}
						>
							{inWatchlist ? 'In Watchlist' : 'Add To Watchlist'}
						</button>
					</div>
					<div class="company-row-info">
						{#if profile?.name}
							<span class="company-name">{profile.name}</span>
						{/if}
						{#if quoteData?.exchange}
							<span class="exchange-dot">-</span>
							<span class="exchange">{quoteData.exchange}</span>
						{/if}
						{#if quoteData}
							<span class="price-inline">
								{formatCurrency(quoteData.price ?? 0)}
								<span class={getPriceClass(quoteData.changePercent ?? 0)}>
									{(quoteData.changePercent ?? 0) >= 0 ? '^' : 'v'} {formatPercent(Math.abs(quoteData.changePercent ?? 0))}
									({(quoteData.change ?? 0) >= 0 ? '+' : ''}{formatCurrency(quoteData.change ?? 0, 'USD', 2)})
								</span>
							</span>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Period Buttons -->
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
	</header>

	<!-- Main Content -->
	<div class="main-content">
		<!-- Left Column -->
		<div class="left-column">
			<!-- Chart Section -->
			<section class="chart-section">
				{#if loading || chartLoading}
					<div class="chart-loading"></div>
				{:else if ohlcData.length > 0}
					<div class="chart-container">
						<canvas bind:this={priceChartCanvas}></canvas>
					</div>
				{:else}
					<div class="chart-empty">No historical data available</div>
				{/if}
			</section>

			<!-- Income Statement -->
			<section class="financial-section">
				<div class="section-header-row">
					<h2>Income Statement</h2>
					<div class="period-toggle">
						<button
							class="toggle-btn"
							class:active={financialPeriod === 'quarter'}
							onclick={() => handleFinancialPeriodChange('quarter')}
						>Quarterly</button>
						<button
							class="toggle-btn"
							class:active={financialPeriod === 'annual'}
							onclick={() => handleFinancialPeriodChange('annual')}
						>Annually</button>
					</div>
				</div>

				{#if incomeData.length > 0}
					<div class="financial-table-wrapper">
						<table class="financial-table">
							<thead>
								<tr>
									<th>PERIOD</th>
									<th>REVENUE</th>
									<th>OPERATING EXP...</th>
									<th>NET INCOME</th>
									<th>NET PROFIT MAR...</th>
									<th>EARNINGS PE...</th>
									<th>EBITDA</th>
								</tr>
							</thead>
							<tbody>
								{#each incomeData as row, i (row.date)}
									{@const prev = incomeData[i + 1]}
									<tr>
										<td>{formatPeriodLabel(row.date, row.period)}</td>
										<td class={getChangeClass(row.revenue, prev?.revenue)}>
											{formatCompact(row.revenue)} {getChangeIndicator(row.revenue, prev?.revenue)}
										</td>
										<td class={getChangeClass(row.operatingExpenses || 0, prev?.operatingExpenses)}>
											{formatCompact(row.operatingExpenses || row.operatingIncome)} {getChangeIndicator(row.operatingExpenses || 0, prev?.operatingExpenses)}
										</td>
										<td class={getChangeClass(row.netIncome, prev?.netIncome)}>
											{formatCompact(row.netIncome)} {getChangeIndicator(row.netIncome, prev?.netIncome)}
										</td>
										<td class={getChangeClass(row.netProfitMargin || 0, prev?.netProfitMargin)}>
											{((row.netProfitMargin || (row.netIncome / row.revenue)) * 100).toFixed(2)}% {getChangeIndicator(row.netProfitMargin || 0, prev?.netProfitMargin)}
										</td>
										<td class={getChangeClass(row.eps, prev?.eps)}>
											${row.eps.toFixed(2)} {getChangeIndicator(row.eps, prev?.eps)}
										</td>
										<td class={getChangeClass(row.ebitda || 0, prev?.ebitda)}>
											{formatCompact(row.ebitda || 0)} {getChangeIndicator(row.ebitda || 0, prev?.ebitda)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="no-data">No income statement data available</p>
				{/if}
			</section>

			<!-- Balance Statement -->
			<section class="financial-section">
				<div class="section-header-row">
					<h2>Balance Statement</h2>
					<div class="period-toggle">
						<button class="toggle-btn" class:active={financialPeriod === 'quarter'} onclick={() => handleFinancialPeriodChange('quarter')}>Quarterly</button>
						<button class="toggle-btn" class:active={financialPeriod === 'annual'} onclick={() => handleFinancialPeriodChange('annual')}>Annually</button>
					</div>
				</div>

				{#if balanceData.length > 0}
					<div class="financial-table-wrapper">
						<table class="financial-table">
							<thead>
								<tr>
									<th>PERIOD</th>
									<th>CASH & SHORT-TERM</th>
									<th>TOTAL ASSETS</th>
									<th>TOTAL LIABILITIES</th>
									<th>TOTAL EQUITY</th>
								</tr>
							</thead>
							<tbody>
								{#each balanceData as row, i (row.date)}
									{@const prev = balanceData[i + 1]}
									<tr>
										<td>{formatPeriodLabel(row.date, row.period)}</td>
										<td class={getChangeClass(row.cashAndCashEquivalents, prev?.cashAndCashEquivalents)}>
											{formatCompact(row.cashAndCashEquivalents)} {getChangeIndicator(row.cashAndCashEquivalents, prev?.cashAndCashEquivalents)}
										</td>
										<td class={getChangeClass(row.totalAssets, prev?.totalAssets)}>
											{formatCompact(row.totalAssets)} {getChangeIndicator(row.totalAssets, prev?.totalAssets)}
										</td>
										<td class={getChangeClass(row.totalLiabilities, prev?.totalLiabilities)}>
											{formatCompact(row.totalLiabilities)} {getChangeIndicator(row.totalLiabilities, prev?.totalLiabilities)}
										</td>
										<td class={getChangeClass(row.totalEquity, prev?.totalEquity)}>
											{formatCompact(row.totalEquity)} {getChangeIndicator(row.totalEquity, prev?.totalEquity)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="no-data">No balance sheet data available</p>
				{/if}
			</section>

			<!-- Cash Flow Statement -->
			<section class="financial-section">
				<div class="section-header-row">
					<h2>Cash Flow Statement</h2>
					<div class="period-toggle">
						<button class="toggle-btn" class:active={financialPeriod === 'quarter'} onclick={() => handleFinancialPeriodChange('quarter')}>Quarterly</button>
						<button class="toggle-btn" class:active={financialPeriod === 'annual'} onclick={() => handleFinancialPeriodChange('annual')}>Annually</button>
					</div>
				</div>

				{#if cashflowData.length > 0}
					<div class="financial-table-wrapper">
						<table class="financial-table">
							<thead>
								<tr>
									<th>PERIOD</th>
									<th>NET INCOME</th>
									<th>CASH FROM OPER...</th>
									<th>CASH FROM INVE...</th>
									<th>CASH FROM FINAN...</th>
									<th>NET CHANGE</th>
									<th>FREE CASH FLOW</th>
								</tr>
							</thead>
							<tbody>
								{#each cashflowData as row, i (row.date)}
									{@const prev = cashflowData[i + 1]}
									<tr>
										<td>{formatPeriodLabel(row.date, row.period)}</td>
										<td class={getChangeClass(row.netIncome, prev?.netIncome)}>
											{formatCompact(row.netIncome)} {getChangeIndicator(row.netIncome, prev?.netIncome)}
										</td>
										<td class={getChangeClass(row.operatingCashFlow, prev?.operatingCashFlow)}>
											{formatCompact(row.operatingCashFlow)} {getChangeIndicator(row.operatingCashFlow, prev?.operatingCashFlow)}
										</td>
										<td class={getChangeClass(row.investingCashFlow, prev?.investingCashFlow)}>
											{formatCompact(row.investingCashFlow)} {getChangeIndicator(row.investingCashFlow, prev?.investingCashFlow)}
										</td>
										<td class={getChangeClass(row.financingCashFlow, prev?.financingCashFlow)}>
											{formatCompact(row.financingCashFlow)} {getChangeIndicator(row.financingCashFlow, prev?.financingCashFlow)}
										</td>
										<td class={getChangeClass(row.netCashFlow || 0, prev?.netCashFlow)}>
											{formatCompact(row.netCashFlow || (row.operatingCashFlow + row.investingCashFlow + row.financingCashFlow))} {getChangeIndicator(row.netCashFlow || 0, prev?.netCashFlow)}
										</td>
										<td class={getChangeClass(row.freeCashFlow, prev?.freeCashFlow)}>
											{formatCompact(row.freeCashFlow)} {getChangeIndicator(row.freeCashFlow, prev?.freeCashFlow)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="no-data">No cash flow data available</p>
				{/if}
			</section>

			<!-- Revenue by Products -->
			{#if revenueSegments.productSegments.length > 0}
				<section class="financial-section">
					<div class="section-header-row">
						<h2>Revenue by Products</h2>
					</div>
					<div class="segments-grid">
						{#each [...new Set(revenueSegments.productSegments.map(s => s.segment))].slice(0, 6) as segment}
							<div class="segment-card">
								<div class="segment-icon"></div>
								<span class="segment-name">{segment}</span>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- News Section -->
			{#if news.length > 0}
				<section class="news-section">
					<h2>NEWS</h2>
					<div class="news-list">
						{#each news.slice(0, 5) as article (article.url)}
							<article class="news-item">
								<time class="news-date">
									{new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {new Date(article.publishedDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} UTC
								</time>
								<h3 class="news-title">{article.title}</h3>
								<a href={article.url} target="_blank" rel="noopener" class="news-link">Read more</a>
							</article>
						{/each}
					</div>
				</section>
			{/if}
		</div>

		<!-- Right Column (Sidebar) -->
		<div class="right-column">
			<!-- Key Stats -->
			<section class="stats-section">
				<table class="stats-table">
					<tbody>
						<tr>
							<td>Market Cap</td>
							<td>{quoteData?.marketCap ? formatCompact(quoteData.marketCap) : '--'}</td>
						</tr>
						<tr>
							<td>52w High</td>
							<td>{quoteData?.fiftyTwoWeekHigh ? formatCurrency(quoteData.fiftyTwoWeekHigh) : '--'}</td>
						</tr>
						<tr>
							<td>52w Low</td>
							<td>{quoteData?.fiftyTwoWeekLow ? formatCurrency(quoteData.fiftyTwoWeekLow) : '--'}</td>
						</tr>
						<tr>
							<td>Dividend Yield</td>
							<td>{quoteData?.dividendYield ? formatPercent(quoteData.dividendYield) : '0.00%'}</td>
						</tr>
						<tr>
							<td>P/E</td>
							<td>{quoteData?.peRatio?.toFixed(2) ?? '--'}</td>
						</tr>
						<tr>
							<td>Volume</td>
							<td>{quoteData?.volume ? formatCompact(quoteData.volume) : '--'}</td>
						</tr>
						<tr>
							<td>Outstanding Shares</td>
							<td>{quoteData?.sharesOutstanding ? formatCompact(quoteData.sharesOutstanding) : '--'}</td>
						</tr>
					</tbody>
				</table>
			</section>

			<!-- About Section -->
			<section class="about-section">
				<h3>About {profile?.name || symbol}</h3>
				{#if profile?.website}
					<a href={profile.website} target="_blank" rel="noopener" class="website-link">
						{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
					</a>
				{/if}
				{#if profile?.description}
					<p class="description">{profile.description.slice(0, 300)}{profile.description.length > 300 ? '...' : ''}</p>
				{/if}
			</section>

			<!-- CEO Section -->
			{#if ceo || profile?.ceo}
				<section class="ceo-section">
					<div class="ceo-portrait-container">
						{#if ceoPortrait}
							<img
								src={ceoPortrait}
								alt={ceo?.name || profile?.ceo}
								class="ceo-portrait"
								onerror={(e) => { e.currentTarget.src = getAvatarFallback(ceo?.name || profile?.ceo || 'CEO'); }}
							/>
						{:else}
							<img
								src={getAvatarFallback(ceo?.name || profile?.ceo || 'CEO')}
								alt={ceo?.name || profile?.ceo}
								class="ceo-portrait"
							/>
						{/if}
					</div>
					<div class="ceo-info">
						<span class="ceo-title">CEO</span>
						<span class="ceo-name">{ceo?.name || profile?.ceo}</span>
						<a href="/ticker/{symbol}/insiders" class="view-insiders-btn">View Insider Trades</a>
					</div>

					{#if ceo?.pay}
						<div class="compensation-section">
							<h4>Compensation Summary</h4>
							<table class="compensation-table">
								<tbody>
									<tr><td>Total Compensation</td><td>{formatCurrency(ceo.pay)}</td></tr>
								</tbody>
							</table>
						</div>
					{/if}
				</section>
			{/if}

			<!-- Company Info -->
			<section class="company-info-section">
				<table class="info-table">
					<tbody>
						{#if profile?.industry}
							<tr><td>Industry</td><td>{profile.industry}</td></tr>
						{/if}
						{#if profile?.sector}
							<tr><td>Sector</td><td>{profile.sector}</td></tr>
						{/if}
						{#if profile?.ipoDate}
							<tr><td>Went public</td><td>{new Date(profile.ipoDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td></tr>
						{/if}
						{#if profile?.employees}
							<tr><td>Full time employees</td><td>{profile.employees.toLocaleString()}</td></tr>
						{/if}
					</tbody>
				</table>
			</section>

			<!-- Split Record -->
			{#if splits.length > 0}
				<section class="splits-section">
					<h3>Split Record</h3>
					<table class="splits-table">
						<thead>
							<tr>
								<th>DATE</th>
								<th>TYPE</th>
								<th>RATIO</th>
							</tr>
						</thead>
						<tbody>
							{#each splits as split (split.date)}
								<tr>
									<td>{new Date(split.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
									<td class="split-type">Forward</td>
									<td>{split.numerator}:{split.denominator}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</section>
			{/if}

			<!-- Ratings Snapshot -->
			{#if rating}
				<section class="ratings-section">
					<h3>Ratings Snapshot</h3>
					<div class="rating-display">
						<span class="rating-label">Rating:</span>
						<span class="rating-value">{rating.rating}</span>
					</div>
					<table class="ratings-detail-table">
						<tbody>
							<tr><td>DCF</td><td>{rating.ratingDetailsDCFScore ?? '-'}</td></tr>
							<tr><td>Return On Equity</td><td>{rating.ratingDetailsROEScore ?? '-'}</td></tr>
							<tr><td>Return On Assets</td><td>{rating.ratingDetailsROAScore ?? '-'}</td></tr>
							<tr><td>Debt To Equity</td><td>{rating.ratingDetailsDEScore ?? '-'}</td></tr>
							<tr><td>Price To Earnings</td><td>{rating.ratingDetailsPEScore ?? '-'}</td></tr>
							<tr><td>Price To Book</td><td>{rating.ratingDetailsPBScore ?? '-'}</td></tr>
							<tr class="overall"><td>Overall Score</td><td>{rating.ratingScore}</td></tr>
						</tbody>
					</table>
				</section>
			{/if}

			<!-- Analyst Grades -->
			{#if analystGrades.length > 0}
				<section class="analyst-section">
					<h3>Most Recent Analyst Grades</h3>
					<div class="analyst-content">
						<div class="analyst-list">
							{#each analystGrades.slice(0, 10) as grade (grade.publishedDate + grade.gradingCompany)}
								<div class="analyst-item">
									<div class="analyst-logo">
										<img
											src={`https://logo.clearbit.com/${grade.gradingCompany.toLowerCase().replace(/\s+/g, '')}.com`}
											alt={grade.gradingCompany}
											onerror={(e) => { e.currentTarget.src = getAvatarFallback(grade.gradingCompany, '6366f1'); }}
										/>
									</div>
									<div class="analyst-info">
										<span class="analyst-name">{grade.gradingCompany}</span>
										<span class="analyst-grade">{grade.newGrade}</span>
									</div>
								</div>
							{/each}
						</div>
						<div class="grade-summary">
							<h4>Grade Summary</h4>
							{#each Object.entries(gradeSummary).slice(0, 6) as [grade, count]}
								<div class="grade-row">
									<span class="grade-name">{grade}</span>
									<span class="grade-count">{count}</span>
								</div>
							{/each}
						</div>
					</div>
				</section>
			{/if}

			<!-- Price Target -->
			{#if priceTarget}
				<section class="price-target-section">
					<h3>Price Target</h3>
					<table class="price-target-table">
						<tbody>
							<tr><td>Target High</td><td>{formatCurrency(priceTarget.targetHigh)}</td></tr>
							<tr><td>Target Low</td><td>{formatCurrency(priceTarget.targetLow)}</td></tr>
							<tr><td>Target Median</td><td>{formatCurrency(priceTarget.targetMedian)}</td></tr>
							<tr><td>Target Consensus</td><td>{formatCurrency(priceTarget.targetConsensus)}</td></tr>
						</tbody>
					</table>
				</section>
			{/if}

			<!-- Institutional Ownership -->
			{#if institutionalHolders.length > 0}
				<section class="institutional-section">
					<h3>Institutional Ownership</h3>
					<div class="institutional-content">
						<div class="holders-list">
							{#each institutionalHolders.slice(0, 10) as holder (holder.holder)}
								<div class="holder-item">
									<div class="holder-logo">
										<img
											src={`https://logo.clearbit.com/${holder.holder.toLowerCase().replace(/[^a-z]/g, '')}.com`}
											alt={holder.holder}
											onerror={(e) => { e.currentTarget.src = getAvatarFallback(holder.holder, '374151'); }}
										/>
									</div>
									<div class="holder-info">
										<span class="holder-name">{holder.holder}</span>
										<span class="holder-shares">{formatCompact(holder.shares)} Shares</span>
										{#if holder.value}
											<span class="holder-value">{formatCompact(holder.value)}</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
						<div class="institutional-summary">
							<h4>Summary</h4>
							<div class="summary-row">
								<span>% Of Shares Owned</span>
								<span>{institutionalSummary.percentOwned.toFixed(2)}%</span>
							</div>
							<div class="summary-row">
								<span>Total Number Of Holders</span>
								<span>{institutionalHolders.length.toLocaleString()}</span>
							</div>
							<p class="summary-note">Only Showing The Top {Math.min(institutionalHolders.length, 10)}</p>
						</div>
					</div>
				</section>
			{/if}

			<!-- Congress Trades -->
			{#if congressTrades.length > 0}
				<section class="congress-section">
					<h3>Latest Trades By Congress</h3>
					<div class="congress-columns">
						<div class="congress-column">
							<h4>SENATE TRADES</h4>
							{#each senateTrades.slice(0, 4) as trade (trade.id)}
								<a href="/political/member/{encodeURIComponent(trade.officialName)}" class="congress-trade-item">
									<img
										src={getCongressPortrait(trade.officialName, trade.title)}
										alt={trade.officialName}
										class="congress-portrait"
										onerror={(e) => { e.currentTarget.src = getAvatarFallback(trade.officialName); }}
									/>
									<div class="congress-trade-info">
										<span class="congress-name">{trade.officialName}</span>
										<span class="congress-type {trade.transactionType === 'BUY' ? 'purchase' : 'sale'}">
											{trade.transactionType === 'BUY' ? 'Purchased' : 'Sale'}
										</span>
										<span class="congress-date">{formatTradeDate(trade.transactionDate)}</span>
									</div>
								</a>
							{/each}
						</div>
						<div class="congress-column">
							<h4>HOUSE TRADES</h4>
							{#each houseTrades.slice(0, 4) as trade (trade.id)}
								<a href="/political/member/{encodeURIComponent(trade.officialName)}" class="congress-trade-item">
									<img
										src={getCongressPortrait(trade.officialName, trade.title)}
										alt={trade.officialName}
										class="congress-portrait"
										onerror={(e) => { e.currentTarget.src = getAvatarFallback(trade.officialName); }}
									/>
									<div class="congress-trade-info">
										<span class="congress-name">{trade.officialName}</span>
										<span class="congress-type {trade.transactionType === 'BUY' ? 'purchase' : 'sale'}">
											{trade.transactionType === 'BUY' ? 'Purchased' : 'Sale'}
										</span>
										<span class="congress-date">{formatTradeDate(trade.transactionDate)}</span>
									</div>
								</a>
							{/each}
						</div>
					</div>
				</section>
			{/if}

			<!-- Sector Peers -->
			{#if peers.length > 0}
				<section class="peers-section">
					<h3>Sectors Peers</h3>
					<table class="peers-table">
						<thead>
							<tr>
								<th>PEER</th>
								<th>PRICE</th>
								<th>MARKET CAP</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each peers.slice(0, 10) as peer (peer)}
								{@const peerData = peerQuotes[peer]}
								<tr>
									<td class="peer-cell">
										<img
											src={getCompanyLogoUrl(peer)}
											alt={peer}
											class="peer-logo"
											onerror={(e) => { e.currentTarget.style.display = 'none'; }}
										/>
										<span class="peer-symbol">{peer}</span>
									</td>
									<td>{peerData?.price ? formatCurrency(peerData.price) : '--'}</td>
									<td>{peerData?.marketCap ? formatCompact(peerData.marketCap) : '--'}</td>
									<td>
										<a href="/ticker/{peer}" class="compare-btn">Compare</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</section>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="error-banner">{error}</div>
	{/if}
</div>

<style>
	.ticker-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1rem;
		font-family: 'IBM Plex Mono', monospace;
	}

	/* Header */
	.ticker-header {
		margin-bottom: 1.5rem;
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.header-left {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.stock-logo {
		width: 48px;
		height: 48px;
		object-fit: contain;
	}

	.header-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.symbol-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.ticker-symbol {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
	}

	.watchlist-btn {
		font-size: 0.75rem;
		padding: 6px 12px;
		border: 1px solid var(--color-border);
		background: var(--color-paper);
		cursor: pointer;
	}

	.watchlist-btn:hover {
		background: var(--color-newsprint-dark);
	}

	.watchlist-btn.in-watchlist {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	.company-row-info {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.875rem;
	}

	.company-name {
		color: var(--color-ink-muted);
	}

	.exchange-dot {
		color: var(--color-ink-muted);
	}

	.exchange {
		color: var(--color-ink-muted);
	}

	.price-inline {
		font-weight: 600;
		margin-left: 0.5rem;
	}

	.period-buttons {
		display: flex;
		gap: 0;
		border: 1px solid var(--color-border);
		width: fit-content;
	}

	.period-btn {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 8px 14px;
		border: none;
		border-right: 1px solid var(--color-border);
		background: var(--color-paper);
		cursor: pointer;
	}

	.period-btn:last-child {
		border-right: none;
	}

	.period-btn:hover {
		background: var(--color-newsprint-dark);
	}

	.period-btn.active {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	/* Main Content */
	.main-content {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	@media (min-width: 1024px) {
		.main-content {
			grid-template-columns: 1fr 380px;
		}
	}

	/* Left Column */
	.left-column {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	/* Chart Section */
	.chart-section {
		border: 1px solid var(--color-border);
		padding: 1rem;
		background: var(--color-paper);
	}

	.chart-container {
		height: 300px;
		position: relative;
	}

	.chart-loading {
		height: 300px;
		background: var(--color-newsprint-dark);
		animation: pulse 1.5s infinite;
	}

	.chart-empty {
		height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-ink-muted);
	}

	/* Financial Sections */
	.financial-section {
		border-bottom: 1px dotted var(--color-border);
		padding-bottom: 2rem;
	}

	.section-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-header-row h2 {
		font-size: 1.125rem;
		font-weight: 700;
		margin: 0;
	}

	.period-toggle {
		display: flex;
		border: 1px solid var(--color-border);
	}

	.toggle-btn {
		font-size: 0.75rem;
		padding: 6px 12px;
		border: none;
		background: var(--color-paper);
		cursor: pointer;
	}

	.toggle-btn:first-child {
		border-right: 1px solid var(--color-border);
	}

	.toggle-btn.active {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	.financial-table-wrapper {
		overflow-x: auto;
	}

	.financial-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.financial-table th {
		text-align: left;
		padding: 0.75rem 0.5rem;
		border-bottom: 1px dotted var(--color-border);
		color: var(--color-ink-muted);
		font-weight: 600;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.financial-table td {
		padding: 0.75rem 0.5rem;
		border-bottom: 1px dotted var(--color-border);
	}

	.financial-table td.positive {
		color: var(--color-gain);
	}

	.financial-table td.negative {
		color: var(--color-loss);
	}

	.no-data {
		color: var(--color-ink-muted);
		font-size: 0.875rem;
		padding: 2rem;
		text-align: center;
	}

	/* Segments */
	.segments-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 1rem;
	}

	.segment-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		background: var(--color-paper);
	}

	.segment-icon {
		width: 24px;
		height: 24px;
		background: var(--color-newsprint-dark);
		border-radius: 50%;
	}

	.segment-name {
		font-size: 0.75rem;
		font-weight: 500;
	}

	/* News Section */
	.news-section {
		border-top: 1px dotted var(--color-border);
		padding-top: 2rem;
	}

	.news-section h2 {
		font-size: 1.125rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
	}

	.news-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.news-item {
		border-bottom: 1px dotted var(--color-border);
		padding-bottom: 1.5rem;
	}

	.news-date {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		display: block;
		margin-bottom: 0.5rem;
	}

	.news-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		line-height: 1.4;
	}

	.news-link {
		font-size: 0.75rem;
		color: var(--color-gain);
		text-decoration: none;
	}

	.news-link:hover {
		text-decoration: underline;
	}

	/* Right Column (Sidebar) */
	.right-column {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.right-column section {
		border-bottom: 1px dotted var(--color-border);
		padding-bottom: 1.5rem;
	}

	.right-column h3 {
		font-size: 0.875rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
	}

	/* Stats Section */
	.stats-table {
		width: 100%;
		font-size: 0.8125rem;
	}

	.stats-table td {
		padding: 0.5rem 0;
		border-bottom: 1px dotted var(--color-border);
	}

	.stats-table td:first-child {
		color: var(--color-ink-muted);
	}

	.stats-table td:last-child {
		text-align: right;
		font-weight: 600;
	}

	/* About Section */
	.about-section .website-link {
		display: block;
		font-size: 0.75rem;
		color: var(--color-gain);
		text-decoration: none;
		margin-bottom: 0.75rem;
	}

	.about-section .description {
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--color-ink-muted);
		margin: 0;
	}

	/* CEO Section */
	.ceo-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.ceo-portrait-container {
		width: 120px;
		height: 140px;
		border: 1px solid var(--color-border);
		overflow: hidden;
	}

	.ceo-portrait {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.ceo-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.ceo-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.ceo-name {
		font-size: 0.875rem;
	}

	.view-insiders-btn {
		font-size: 0.75rem;
		padding: 6px 12px;
		border: 1px solid var(--color-border);
		background: var(--color-paper);
		text-decoration: none;
		color: inherit;
		width: fit-content;
		margin-top: 0.5rem;
	}

	.compensation-section h4 {
		font-size: 0.75rem;
		font-weight: 700;
		margin: 1rem 0 0.5rem 0;
	}

	.compensation-table {
		width: 100%;
		font-size: 0.75rem;
	}

	.compensation-table td {
		padding: 0.375rem 0;
		border-bottom: 1px dotted var(--color-border);
	}

	.compensation-table td:last-child {
		text-align: right;
		font-weight: 600;
	}

	/* Info Table */
	.info-table {
		width: 100%;
		font-size: 0.8125rem;
	}

	.info-table td {
		padding: 0.5rem 0;
		border-bottom: 1px dotted var(--color-border);
	}

	.info-table td:first-child {
		color: var(--color-ink-muted);
	}

	.info-table td:last-child {
		text-align: right;
		font-weight: 600;
	}

	/* Splits */
	.splits-table {
		width: 100%;
		font-size: 0.75rem;
	}

	.splits-table th {
		text-align: left;
		padding: 0.5rem 0;
		border-bottom: 1px dotted var(--color-border);
		color: var(--color-ink-muted);
		font-size: 0.625rem;
		font-weight: 600;
	}

	.splits-table td {
		padding: 0.5rem 0;
		border-bottom: 1px dotted var(--color-border);
	}

	.split-type {
		color: var(--color-gain);
	}

	/* Ratings */
	.rating-display {
		margin-bottom: 1rem;
	}

	.rating-label {
		color: var(--color-ink-muted);
	}

	.rating-value {
		font-weight: 700;
		margin-left: 0.5rem;
	}

	.ratings-detail-table {
		width: 100%;
		font-size: 0.75rem;
	}

	.ratings-detail-table td {
		padding: 0.375rem 0;
		border-bottom: 1px dotted var(--color-border);
	}

	.ratings-detail-table td:last-child {
		text-align: right;
		font-weight: 600;
	}

	.ratings-detail-table tr.overall td {
		font-weight: 700;
	}

	/* Analyst Grades */
	.analyst-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.analyst-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.analyst-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.analyst-logo {
		width: 32px;
		height: 32px;
		border: 1px solid var(--color-border);
		overflow: hidden;
	}

	.analyst-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.analyst-info {
		display: flex;
		flex-direction: column;
	}

	.analyst-name {
		font-size: 0.75rem;
		font-weight: 600;
	}

	.analyst-grade {
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
	}

	.grade-summary h4 {
		font-size: 0.75rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.grade-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		padding: 0.25rem 0;
	}

	/* Price Target */
	.price-target-table {
		width: 100%;
		font-size: 0.8125rem;
	}

	.price-target-table td {
		padding: 0.5rem 0;
		border-bottom: 1px dotted var(--color-border);
	}

	.price-target-table td:last-child {
		text-align: right;
		font-weight: 600;
	}

	/* Institutional */
	.institutional-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.holders-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.holder-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.holder-logo {
		width: 32px;
		height: 32px;
		border: 1px solid var(--color-border);
		overflow: hidden;
		flex-shrink: 0;
	}

	.holder-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.holder-info {
		display: flex;
		flex-direction: column;
		font-size: 0.6875rem;
	}

	.holder-name {
		font-weight: 600;
		font-size: 0.75rem;
	}

	.holder-shares,
	.holder-value {
		color: var(--color-ink-muted);
	}

	.institutional-summary h4 {
		font-size: 0.75rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		padding: 0.25rem 0;
	}

	.summary-row span:last-child {
		font-weight: 600;
	}

	.summary-note {
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		margin-top: 0.5rem;
	}

	/* Congress Trades */
	.congress-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.congress-column h4 {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-ink-muted);
		margin: 0 0 0.75rem 0;
		letter-spacing: 0.05em;
	}

	.congress-trade-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		text-decoration: none;
		color: inherit;
		margin-bottom: 0.75rem;
	}

	.congress-portrait {
		width: 40px;
		height: 48px;
		object-fit: cover;
		border: 1px solid var(--color-border);
	}

	.congress-trade-info {
		display: flex;
		flex-direction: column;
		font-size: 0.75rem;
	}

	.congress-name {
		font-weight: 600;
	}

	.congress-type {
		font-size: 0.6875rem;
	}

	.congress-type.purchase {
		color: var(--color-gain);
	}

	.congress-type.sale {
		color: var(--color-loss);
	}

	.congress-date {
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
	}

	/* Peers */
	.peers-table {
		width: 100%;
		font-size: 0.75rem;
	}

	.peers-table th {
		text-align: left;
		padding: 0.5rem 0;
		border-bottom: 1px dotted var(--color-border);
		color: var(--color-ink-muted);
		font-size: 0.625rem;
		font-weight: 600;
	}

	.peers-table td {
		padding: 0.5rem 0;
		border-bottom: 1px dotted var(--color-border);
	}

	.peer-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.peer-logo {
		width: 20px;
		height: 20px;
		object-fit: contain;
	}

	.peer-symbol {
		font-weight: 600;
	}

	.compare-btn {
		font-size: 0.6875rem;
		padding: 4px 8px;
		border: 1px solid var(--color-border);
		text-decoration: none;
		color: inherit;
	}

	.compare-btn:hover {
		background: var(--color-newsprint-dark);
	}

	/* Error */
	.error-banner {
		padding: 1rem;
		background: rgba(196, 30, 58, 0.1);
		border: 1px solid var(--color-loss);
		color: var(--color-loss);
		margin-top: 1.5rem;
	}

	/* Animations */
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Mobile */
	@media (max-width: 640px) {
		.period-buttons {
			flex-wrap: wrap;
		}

		.period-btn {
			padding: 6px 10px;
			font-size: 0.6875rem;
		}

		.financial-table {
			font-size: 0.6875rem;
		}

		.analyst-content,
		.institutional-content,
		.congress-columns {
			grid-template-columns: 1fr;
		}
	}
</style>
