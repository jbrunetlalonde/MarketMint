<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import {
		formatCurrency,
		formatPercent,
		formatCompact,
		getPriceClass,
		formatExecutiveName
	} from '$lib/utils/formatters';
	import { quotes } from '$lib/stores/quotes.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { getCompanyLogoUrl, getPortraitUrl, getCongressPortraitUrl, getAvatarFallback } from '$lib/utils/urls';
	import api from '$lib/utils/api';

	// ECharts components
	import PriceChart from '$lib/components/PriceChart.svelte';
	import RevenueChart from '$lib/components/RevenueChart.svelte';
	import BalanceSheetChart from '$lib/components/BalanceSheetChart.svelte';
	import CashFlowChart from '$lib/components/CashFlowChart.svelte';
	import RatingRadarChart from '$lib/components/RatingRadarChart.svelte';
	import SentimentGauge from '$lib/components/SentimentGauge.svelte';
	import SWOTAnalysis from '$lib/components/SWOTAnalysis.svelte';
	import TechnicalIndicators from '$lib/components/TechnicalIndicators.svelte';
	import AnalystEstimates from '$lib/components/AnalystEstimates.svelte';
	import DividendHistory from '$lib/components/DividendHistory.svelte';

	const symbol = $derived(page.params.symbol?.toUpperCase() || '');

	let loading = $state(true);
	let chartLoading = $state(false);
	let error = $state<string | null>(null);
	let selectedPeriod = $state('3m');
	let incomePeriod = $state<'annual' | 'quarter'>('quarter');
	let balancePeriod = $state<'annual' | 'quarter'>('quarter');
	let cashflowPeriod = $state<'annual' | 'quarter'>('quarter');
	let activeFinancialTab = $state<'income' | 'balance' | 'cashflow'>('income');

	// Quote data - local state for proper reactivity
	let quoteData = $state<{
		ticker: string;
		price: number | null;
		change: number | null;
		changePercent: number | null;
		volume: number | null;
		marketCap: number | null;
		name?: string;
		dayHigh?: number | null;
		dayLow?: number | null;
		open?: number | null;
		previousClose?: number | null;
		avgVolume?: number | null;
		peRatio?: number | null;
		eps?: number | null;
		fiftyTwoWeekHigh?: number | null;
		fiftyTwoWeekLow?: number | null;
		exchange?: string;
		sharesOutstanding?: number | null;
		dividendYield?: number | null;
	} | null>(null);

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

	// Summarized description - extract first 1-2 sentences, no trailing dots
	const summarizedDescription = $derived.by(() => {
		if (!profile?.description) return '';
		const sentences = profile.description.match(/[^.!?]*[.!?]/g) || [];
		return sentences.slice(0, 2).join(' ').trim();
	});

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

	// Dividends
	let dividends = $state<Array<{
		date: string;
		dividend: number;
		paymentDate?: string;
		recordDate?: string;
		declarationDate?: string;
	}>>([]);

	let dividendInfo = $state<{
		paysDividend: boolean;
		annualDividend: number | null;
		dividendYield: number | null;
		dividendGrowthRate: number | null;
		payoutRatio: number | null;
		consecutiveYears: number;
		frequency: string | null;
	} | null>(null);

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

	// Insider trades for sentiment calculation
	let insiderTrades = $state<Array<{
		transactionType: string;
		securitiesTransacted?: number;
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

	// Price chart data for LayerChart
	const priceChartData = $derived.by(() => {
		if (ohlcData.length === 0) return [];
		return ohlcData.map((d, i) => ({
			index: i,
			date: d.time,
			close: d.close,
			label: (() => {
				const date = new Date(d.time);
				if (selectedPeriod === '1d') {
					return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
				}
				return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			})()
		}));
	});

	// Period-based change calculation (e.g., 6M shows 6-month performance)
	const periodChange = $derived.by(() => {
		if (ohlcData.length === 0 || !quoteData?.price) {
			// Fall back to daily change
			return {
				change: quoteData?.change ?? 0,
				changePercent: quoteData?.changePercent ?? 0,
				isDaily: true
			};
		}
		const firstPrice = ohlcData[0]?.close;
		const currentPrice = quoteData.price;
		if (!firstPrice || firstPrice === 0) {
			return {
				change: quoteData?.change ?? 0,
				changePercent: quoteData?.changePercent ?? 0,
				isDaily: true
			};
		}
		const change = currentPrice - firstPrice;
		const changePercent = ((currentPrice - firstPrice) / firstPrice) * 100;
		return {
			change,
			changePercent,
			isDaily: false
		};
	});

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
			// Fetch quote and store locally for proper reactivity
			const fetchedQuote = await quotes.fetchQuote(symbol);
			if (fetchedQuote) {
				quoteData = fetchedQuote;
			}
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

			// Load financial statements (initially all quarterly)
			await loadFinancials('quarter');

			// Fetch additional data in parallel
			const [
				congressRes,
				institutionalRes,
				splitsRes,
				newsRes,
				gradesRes,
				segmentsRes,
				insiderRes,
				dividendsRes,
				dividendInfoRes
			] = await Promise.all([
				api.getPoliticalTradesByTicker(symbol, 10),
				api.getInstitutionalHolders(symbol),
				api.getSplits(symbol),
				api.getStockNews(symbol, 10),
				api.getAnalystGrades(symbol, 20),
				api.getRevenueSegmentsV2(symbol),
				api.getInsiderTradesByTicker(symbol, 20),
				api.getDividends(symbol),
				api.getDividendInfo(symbol)
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
			if (insiderRes.success && insiderRes.data) {
				insiderTrades = insiderRes.data;
			}
			if (dividendsRes.success && dividendsRes.data) {
				dividends = dividendsRes.data;
			}
			if (dividendInfoRes.success && dividendInfoRes.data) {
				dividendInfo = dividendInfoRes.data;
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

			// Charts temporarily disabled for debugging
			// await tick();
			// if (browser) {
			// 	requestAnimationFrame(() => {
			// 		renderIncomeChart();
			// 		renderBalanceChart();
			// 		renderCashflowChart();
			// 	});
			// }
		} catch (err) {
			console.error('Failed to load financials:', err);
		} finally {
			financialsLoading = false;
		}
	}

	async function loadIncomeStatement(period: 'annual' | 'quarter') {
		try {
			const res = await api.getIncomeStatement(symbol, period, 5);
			if (res.success && res.data) {
				incomeData = res.data;
				// Chart rendering disabled
			}
		} catch (err) {
			console.error('Failed to load income statement:', err);
		}
	}

	async function loadBalanceSheet(period: 'annual' | 'quarter') {
		try {
			const res = await api.getBalanceSheet(symbol, period, 5);
			if (res.success && res.data) {
				balanceData = res.data;
				// Chart rendering disabled
			}
		} catch (err) {
			console.error('Failed to load balance sheet:', err);
		}
	}

	async function loadCashFlow(period: 'annual' | 'quarter') {
		try {
			const res = await api.getCashFlow(symbol, period, 5);
			if (res.success && res.data) {
				cashflowData = res.data;
				// Chart rendering disabled
			}
		} catch (err) {
			console.error('Failed to load cash flow:', err);
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

	function handleIncomePeriodChange(period: 'annual' | 'quarter') {
		incomePeriod = period;
		loadIncomeStatement(period);
	}

	function handleBalancePeriodChange(period: 'annual' | 'quarter') {
		balancePeriod = period;
		loadBalanceSheet(period);
	}

	function handleCashflowPeriodChange(period: 'annual' | 'quarter') {
		cashflowPeriod = period;
		loadCashFlow(period);
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

	// Sync WebSocket updates to local quoteData state
	$effect(() => {
		const wsQuote = quotes.quotes.get(symbol.toUpperCase());
		if (wsQuote && wsQuote.price !== quoteData?.price) {
			quoteData = wsQuote;
		}
	});

	// Helper functions
	function formatPeriodLabel(date: string, period: string): string {
		const d = new Date(date);
		if (period === 'Q1' || period === 'Q2' || period === 'Q3' || period === 'Q4' || period?.toLowerCase().includes('q')) {
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

	// Chart data for LayerChart
	const incomeChartData = $derived.by(() => {
		if (incomeData.length === 0) return [];
		return [...incomeData].reverse().map(d => {
			const date = new Date(d.date);
			const label = d.period?.includes('Q')
				? `Q${Math.ceil((date.getMonth() + 1) / 3)}-${date.getFullYear().toString().slice(-2)}`
				: date.getFullYear().toString();
			return {
				label,
				revenue: (d.revenue || 0) / 1e9,
				netIncome: (d.netIncome || 0) / 1e9
			};
		});
	});

	const cashflowChartData = $derived.by(() => {
		if (cashflowData.length === 0) return [];
		return [...cashflowData].reverse().map(d => {
			const date = new Date(d.date);
			const label = d.period?.includes('Q')
				? `Q${Math.ceil((date.getMonth() + 1) / 3)}-${date.getFullYear().toString().slice(-2)}`
				: date.getFullYear().toString();
			return {
				label,
				operating: (d.operatingCashFlow || 0) / 1e9,
				investing: (d.investingCashFlow || 0) / 1e9,
				financing: (d.financingCashFlow || 0) / 1e9
			};
		});
	});

	// Balance sheet chart data (horizontal bar comparison)
	const balanceChartData = $derived.by(() => {
		if (balanceData.length === 0) return [];
		return [...balanceData].reverse().map(d => {
			const date = new Date(d.date);
			const label = d.period?.includes('Q')
				? `Q${Math.ceil((date.getMonth() + 1) / 3)}-${date.getFullYear().toString().slice(-2)}`
				: date.getFullYear().toString();
			return {
				label,
				assets: (d.totalAssets || 0) / 1e9,
				liabilities: (d.totalLiabilities || 0) / 1e9,
				equity: (d.totalEquity || 0) / 1e9
			};
		});
	});
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
								<span class={getPriceClass(periodChange.changePercent)}>
									{periodChange.changePercent >= 0 ? '^' : 'v'} {formatPercent(Math.abs(periodChange.changePercent))}
									({periodChange.change >= 0 ? '+' : ''}{formatCurrency(periodChange.change, 'USD', 2)})
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
				{:else if priceChartData.length > 0}
					<div class="chart-container">
						<PriceChart data={priceChartData} height={400} color="#f59e0b" />
					</div>
				{:else}
					<div class="chart-empty">No historical data available</div>
				{/if}
				<TechnicalIndicators {symbol} />
			</section>

			<!-- Income Statement -->
			<section class="financial-section">
				<div class="section-header-row">
					<h2>Income Statement</h2>
					<div class="period-toggle">
						<button
							class="toggle-btn"
							class:active={incomePeriod === 'quarter'}
							onclick={() => handleIncomePeriodChange('quarter')}
						>Quarterly</button>
						<button
							class="toggle-btn"
							class:active={incomePeriod === 'annual'}
							onclick={() => handleIncomePeriodChange('annual')}
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
					{#if incomeChartData.length > 0}
						<div class="financial-chart">
							<div class="chart-header">
								<span class="chart-title">Revenue & Profitability</span>
							</div>
							<div class="chart-wrapper">
								<RevenueChart data={incomeChartData} height={200} />
							</div>
						</div>
					{/if}
				{:else}
					<p class="no-data">No income statement data available</p>
				{/if}
			</section>

			<!-- Balance Statement -->
			<section class="financial-section">
				<div class="section-header-row">
					<h2>Balance Statement</h2>
					<div class="period-toggle">
						<button class="toggle-btn" class:active={balancePeriod === 'quarter'} onclick={() => handleBalancePeriodChange('quarter')}>Quarterly</button>
						<button class="toggle-btn" class:active={balancePeriod === 'annual'} onclick={() => handleBalancePeriodChange('annual')}>Annually</button>
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
					{#if balanceChartData.length > 0}
						<div class="financial-chart">
							<div class="chart-header">
								<span class="chart-title">Balance Sheet Overview</span>
							</div>
							<div class="chart-wrapper">
								<BalanceSheetChart data={balanceChartData} height={200} />
							</div>
						</div>
					{/if}
				{:else}
					<p class="no-data">No balance sheet data available</p>
				{/if}
			</section>

			<!-- Cash Flow Statement -->
			<section class="financial-section">
				<div class="section-header-row">
					<h2>Cash Flow Statement</h2>
					<div class="period-toggle">
						<button class="toggle-btn" class:active={cashflowPeriod === 'quarter'} onclick={() => handleCashflowPeriodChange('quarter')}>Quarterly</button>
						<button class="toggle-btn" class:active={cashflowPeriod === 'annual'} onclick={() => handleCashflowPeriodChange('annual')}>Annually</button>
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
					{#if cashflowChartData.length > 0}
						<div class="financial-chart">
							<div class="chart-header">
								<span class="chart-title">Cash Flow Breakdown</span>
							</div>
							<div class="chart-wrapper">
								<CashFlowChart data={cashflowChartData} height={200} />
							</div>
						</div>
					{/if}
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
						{#each news.slice(0, 5) as article, i (article.url ?? `news-${i}`)}
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

			<!-- Sentiment Gauge -->
			<section class="sentiment-section">
				<h3>Market Sentiment</h3>
				<SentimentGauge
					ratingScore={rating?.ratingScore}
					grades={analystGrades}
					{priceTarget}
					currentPrice={quoteData?.price}
					{insiderTrades}
				/>
			</section>

			<!-- About Section with CEO Portrait -->
			<section class="about-section">
				<div class="about-header">
					{#if ceo || profile?.ceo}
						{@const ceoName = formatExecutiveName(ceo?.name || profile?.ceo)}
						<div class="ceo-portrait-container">
							{#if ceoPortrait}
								<img
									src={ceoPortrait}
									alt={ceoName}
									class="ceo-portrait"
									onerror={(e) => { e.currentTarget.src = getAvatarFallback(ceoName || 'CEO'); }}
								/>
							{:else}
								<img
									src={getAvatarFallback(ceoName || 'CEO')}
									alt={ceoName}
									class="ceo-portrait"
								/>
							{/if}
							<div class="ceo-label">
								<span class="ceo-title">CEO</span>
								<span class="ceo-name">{ceoName}</span>
							</div>
						</div>
					{/if}
					<div class="about-content">
						<h3>About {profile?.name || symbol}</h3>
						{#if profile?.website}
							<a href={profile.website} target="_blank" rel="noopener" class="website-link">
								{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
							</a>
						{/if}
						{#if summarizedDescription}
							<p class="description">{summarizedDescription}</p>
						{/if}
					</div>
				</div>
			</section>

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
							{#each splits as split, i (split.date ?? `split-${i}`)}
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

			<!-- Dividend History -->
			<section class="dividend-section">
				<DividendHistory
					{dividends}
					{dividendInfo}
					currentPrice={quoteData?.price ?? undefined}
					ticker={symbol}
				/>
			</section>

			<!-- Ratings Snapshot -->
			{#if rating}
				<section class="ratings-section">
					<h3>Ratings Snapshot</h3>
					<div class="ratings-layout">
						<div class="ratings-chart">
							<RatingRadarChart {rating} height={180} />
						</div>
						<div class="ratings-info">
							<div class="rating-display">
								<span class="rating-label">Rating:</span>
								<span class="rating-value">{rating.rating}</span>
							</div>
							<table class="ratings-detail-table">
								<tbody>
									<tr><td>DCF</td><td>{rating.ratingDetailsDCFScore ?? '-'}</td></tr>
									<tr><td>ROE</td><td>{rating.ratingDetailsROEScore ?? '-'}</td></tr>
									<tr><td>ROA</td><td>{rating.ratingDetailsROAScore ?? '-'}</td></tr>
									<tr><td>D/E</td><td>{rating.ratingDetailsDEScore ?? '-'}</td></tr>
									<tr><td>P/E</td><td>{rating.ratingDetailsPEScore ?? '-'}</td></tr>
									<tr><td>P/B</td><td>{rating.ratingDetailsPBScore ?? '-'}</td></tr>
									<tr class="overall"><td>Overall</td><td>{rating.ratingScore}</td></tr>
								</tbody>
							</table>
						</div>
					</div>
				</section>
			{/if}

			<!-- SWOT Analysis -->
			<section class="swot-section">
				<h3>SWOT Analysis</h3>
				<SWOTAnalysis ticker={symbol} />
			</section>

			<!-- Analyst Grades -->
			{#if analystGrades.length > 0}
				<section class="analyst-section">
					<h3>Most Recent Analyst Grades</h3>
					<div class="analyst-content">
						<div class="analyst-list">
							{#each analystGrades.slice(0, 10) as grade, i (grade.publishedDate && grade.gradingCompany ? `${grade.publishedDate}-${grade.gradingCompany}` : `grade-${i}`)}
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

			<!-- Analyst Estimates -->
			<section class="estimates-section">
				<AnalystEstimates {symbol} />
			</section>

			<!-- Institutional Ownership -->
			{#if institutionalHolders.length > 0}
				<section class="institutional-section">
					<h3>Institutional Ownership</h3>
					<div class="institutional-content">
						<div class="holders-list">
							{#each institutionalHolders.slice(0, 10) as holder, i (holder.holder ?? `holder-${i}`)}
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
							{#each senateTrades.slice(0, 4) as trade, i (trade.id ?? `senate-${i}`)}
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
							{#each houseTrades.slice(0, 4) as trade, i (trade.id ?? `house-${i}`)}
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
							{#each peers.slice(0, 10) as peer, i (peer ?? `peer-${i}`)}
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
		font-size: 1.25rem;
		font-weight: 700;
		margin-left: 1rem;
		color: var(--color-ink);
	}

	.price-inline span {
		font-size: 0.875rem;
		font-weight: 500;
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
		padding: 1.5rem;
		background: var(--color-paper);
	}

	.chart-container {
		height: 400px;
		position: relative;
	}

	.chart-loading {
		height: 400px;
		background: var(--color-newsprint-dark);
		animation: pulse 1.5s infinite;
	}

	.chart-empty {
		height: 400px;
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

	/* Financial Charts */
	.financial-chart {
		margin-top: 1.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-paper);
	}

	.chart-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-newsprint);
	}

	.chart-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.chart-wrapper {
		height: 220px;
		padding: 0.5rem;
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

	/* About Section with CEO Portrait */
	.about-section {
		padding: 1rem;
		border: 1px solid var(--color-border);
		background: var(--color-paper);
		margin-bottom: 1rem;
	}

	.about-header {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.ceo-portrait-container {
		flex-shrink: 0;
		width: 100px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.ceo-portrait {
		width: 100%;
		aspect-ratio: 3/4;
		object-fit: cover;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
	}

	.ceo-label {
		display: flex;
		flex-direction: column;
		margin-top: 0.5rem;
		gap: 0.125rem;
	}

	.ceo-title {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--color-ink-muted);
		letter-spacing: 0.05em;
	}

	.ceo-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.about-content {
		flex: 1;
		min-width: 0;
	}

	.about-content h3 {
		font-size: 0.875rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.about-section .website-link {
		display: inline-block;
		font-size: 0.75rem;
		color: var(--color-gain);
		text-decoration: none;
		margin-bottom: 0.5rem;
	}

	.about-section .website-link:hover {
		text-decoration: underline;
	}

	.about-section .description {
		font-size: 0.8125rem;
		line-height: 1.6;
		color: var(--color-ink-muted);
		margin: 0;
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

	/* Dividends */
	.dividend-section {
		margin-top: 1.5rem;
	}

	/* Ratings */
	.ratings-layout {
		display: grid;
		grid-template-columns: 180px 1fr;
		gap: 1rem;
		align-items: start;
	}

	.ratings-chart {
		min-width: 0;
	}

	.ratings-info {
		min-width: 0;
	}

	.rating-display {
		margin-bottom: 0.75rem;
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
