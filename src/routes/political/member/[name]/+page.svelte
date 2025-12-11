<script lang="ts">
	import { page } from '$app/state';
	import { formatDate } from '$lib/utils/formatters';
	import { getCongressPortraitUrl, getAvatarFallback, getCompanyLogoUrl } from '$lib/utils/urls';
	import { getPartyAbbrev, getInitials } from '$lib/utils/political';
	import api from '$lib/utils/api';

	interface Trade {
		id: number;
		officialName: string;
		ticker: string;
		assetDescription?: string | null;
		transactionType: string;
		transactionDate: string;
		reportedDate: string;
		amountDisplay: string;
		party?: string | null;
		title?: string | null;
		state?: string | null;
		chamber?: string | null;
	}

	interface Official {
		id: string;
		name: string;
		title: string | null;
		party: string | null;
		state: string | null;
		district: string | null;
		portraitUrl: string | null;
		chamber: string;
		recentTrades?: Trade[];
	}

	interface StockOwned {
		ticker: string;
		companyName: string;
		lastTransactionType: string;
		lastTransactionDate: string;
		tradeCount: number;
	}

	const memberName = $derived(decodeURIComponent(page.params.name || ''));

	let official = $state<Official | null>(null);
	let allTrades = $state<Trade[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let portraitError = $state(false);

	// Stats computed from trades
	const stats = $derived.by(() => {
		if (allTrades.length === 0) return null;

		const buyCount = allTrades.filter(t => t.transactionType === 'BUY').length;
		const sellCount = allTrades.filter(t => t.transactionType === 'SELL').length;

		const sortedByDate = [...allTrades].sort(
			(a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
		);
		const lastTradeDate = sortedByDate[0]?.transactionDate || null;

		return {
			totalTrades: allTrades.length,
			buyCount,
			sellCount,
			lastTradeDate
		};
	});

	// Stocks owned at one point
	const stocksOwned = $derived.by(() => {
		if (allTrades.length === 0) return [];

		const stockMap: Record<string, StockOwned> = {};

		allTrades.forEach((trade) => {
			if (!stockMap[trade.ticker]) {
				stockMap[trade.ticker] = {
					ticker: trade.ticker,
					companyName: trade.assetDescription?.split(' - ')[0] || trade.ticker,
					lastTransactionType: trade.transactionType,
					lastTransactionDate: trade.transactionDate,
					tradeCount: 1
				};
			} else {
				stockMap[trade.ticker].tradeCount++;
				if (new Date(trade.transactionDate) > new Date(stockMap[trade.ticker].lastTransactionDate)) {
					stockMap[trade.ticker].lastTransactionType = trade.transactionType;
					stockMap[trade.ticker].lastTransactionDate = trade.transactionDate;
				}
			}
		});

		return Object.values(stockMap).sort((a, b) => b.tradeCount - a.tradeCount);
	});

	function getPortraitUrl(name: string, title?: string | null): string {
		const chamber = title?.toLowerCase().includes('senator') ? 'senate' : 'house';
		return getCongressPortraitUrl(name, chamber);
	}

	function getTitle(official: Official): string {
		if (official.title?.toLowerCase().includes('senator')) return 'Senator';
		return 'Representative';
	}

	function isRepublican(party: string | null): boolean {
		return party?.toLowerCase().includes('republican') || false;
	}

	function isDemocrat(party: string | null): boolean {
		return party?.toLowerCase().includes('democrat') || false;
	}

	async function loadData() {
		loading = true;
		error = null;

		try {
			const officialRes = await api.getPoliticalOfficial(memberName);
			if (officialRes.success && officialRes.data) {
				official = officialRes.data;
				allTrades = officialRes.data.recentTrades || [];
			} else {
				const tradesRes = await api.getPoliticalTrades({ limit: 500 });
				if (tradesRes.success && tradesRes.data) {
					const filtered = tradesRes.data.filter(
						(t) => t.officialName.toLowerCase() === memberName.toLowerCase()
					);
					allTrades = filtered;
					if (filtered.length > 0) {
						const first = filtered[0];
						official = {
							id: '',
							name: first.officialName,
							title: first.title,
							party: first.party,
							state: first.state,
							district: null,
							portraitUrl: null,
							chamber: first.chamber || 'house'
						};
					}
				}
			}

			if (!official) {
				error = `Official "${memberName}" not found`;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (memberName) {
			loadData();
		}
	});
</script>

<svelte:head>
	<title>{memberName} - Congress Trades - MarketMint</title>
</svelte:head>

<div class="politician-page">
	{#if loading}
		<div class="loading-state">
			<p>Loading official data...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p class="error-message">{error}</p>
			<a href="/political/members" class="back-btn">Back to Members</a>
		</div>
	{:else if official}
		<!-- Page Header -->
		<header class="page-header">
			<a href="/political/members" class="back-link">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="back-icon">
					<path d="M15 18l-6-6 6-6"></path>
				</svg>
				Back to Politicians
			</a>
		</header>

		<!-- Profile Card -->
		<div class="profile-card">
			<div class="profile-main">
				<div class="portrait-wrapper">
					{#if !portraitError}
						<img
							src={getPortraitUrl(official.name, official.title)}
							alt={official.name}
							class="portrait"
							onerror={() => (portraitError = true)}
						/>
					{:else}
						<div class="portrait-fallback">
							{getInitials(official.name)}
						</div>
					{/if}
				</div>
				<div class="profile-info">
					<h1 class="official-name">{official.name}</h1>
					<div class="official-meta">
						<span class="official-title">{getTitle(official)}</span>
						<span
							class="party-badge"
							class:republican={isRepublican(official.party)}
							class:democrat={isDemocrat(official.party)}
						>
							{getPartyAbbrev(official.party)}
						</span>
						{#if official.state}
							<span class="state">{official.state}</span>
						{/if}
					</div>
				</div>
			</div>

			{#if stats}
				<div class="stats-row">
					<div class="stat-item">
						<span class="stat-value">{stats.totalTrades}</span>
						<span class="stat-label">Total Trades</span>
					</div>
					<div class="stat-item">
						<span class="stat-value stat-buy">{stats.buyCount}</span>
						<span class="stat-label">Purchases</span>
					</div>
					<div class="stat-item">
						<span class="stat-value stat-sell">{stats.sellCount}</span>
						<span class="stat-label">Sales</span>
					</div>
					<div class="stat-item">
						<span class="stat-value">{stats.lastTradeDate ? formatDate(stats.lastTradeDate) : '-'}</span>
						<span class="stat-label">Last Trade</span>
					</div>
				</div>
			{/if}
		</div>

		<div class="main-content">
			<!-- Stocks Owned -->
			{#if stocksOwned.length > 0}
				<section class="section">
					<h2 class="section-title">Stocks Traded</h2>
					<div class="stocks-grid">
						{#each stocksOwned.slice(0, 16) as stock (stock.ticker)}
							<a href="/ticker/{stock.ticker}" class="stock-card">
								<img
									src={getCompanyLogoUrl(stock.ticker)}
									alt=""
									class="stock-logo"
									onerror={(e) => {
										(e.currentTarget as HTMLImageElement).style.display = 'none';
									}}
								/>
								<div class="stock-info">
									<span class="stock-ticker">{stock.ticker}</span>
									<span class="stock-trades">{stock.tradeCount} trade{stock.tradeCount !== 1 ? 's' : ''}</span>
								</div>
							</a>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Trade Timeline -->
			<section class="section">
				<h2 class="section-title">Trade History</h2>

				{#if allTrades.length === 0}
					<p class="empty-message">No trades found for this official.</p>
				{:else}
					<div class="table-container">
						<table class="trades-table">
							<thead>
								<tr>
									<th>Stock</th>
									<th>Type</th>
									<th>Amount</th>
									<th>Date</th>
									<th class="hide-mobile">Reported</th>
								</tr>
							</thead>
							<tbody>
								{#each allTrades as trade (trade.id)}
									<tr>
										<td>
											<a href="/ticker/{trade.ticker}" class="stock-link">
												<img
													src={getCompanyLogoUrl(trade.ticker)}
													alt=""
													class="table-logo"
													onerror={(e) => {
														(e.currentTarget as HTMLImageElement).style.display = 'none';
													}}
												/>
												<span class="table-ticker">{trade.ticker}</span>
											</a>
										</td>
										<td>
											<span
												class="type-badge"
												class:purchase={trade.transactionType === 'BUY'}
												class:sale={trade.transactionType === 'SELL'}
											>
												{trade.transactionType === 'BUY' ? 'Purchase' : trade.transactionType === 'SELL' ? 'Sale' : trade.transactionType}
											</span>
										</td>
										<td class="amount-cell">{trade.amountDisplay}</td>
										<td class="date-cell">
											{trade.transactionDate ? formatDate(trade.transactionDate) : '-'}
										</td>
										<td class="date-cell hide-mobile">
											{trade.reportedDate ? formatDate(trade.reportedDate) : '-'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		</div>
	{/if}
</div>

<style>
	.politician-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: 1.5rem 1rem;
		font-family: var(--font-mono);
	}

	.loading-state,
	.error-state {
		text-align: center;
		padding: 3rem 1rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
	}

	.error-message {
		color: var(--color-loss);
		margin-bottom: 1rem;
	}

	.back-btn {
		display: inline-block;
		padding: 0.5rem 1.5rem;
		background: var(--color-ink);
		color: var(--color-paper);
		text-decoration: none;
		font-family: inherit;
		border-radius: 6px;
	}

	.back-btn:hover {
		background: var(--color-ink-light);
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		text-decoration: none;
	}

	.back-link:hover {
		color: var(--color-ink);
	}

	.back-icon {
		width: 1rem;
		height: 1rem;
	}

	.profile-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.profile-main {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	.portrait-wrapper {
		flex-shrink: 0;
	}

	.portrait {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		object-fit: cover;
		object-position: top;
		background: var(--color-newsprint);
		border: 3px solid var(--color-border);
	}

	.portrait-fallback {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: var(--color-newsprint-dark);
		border: 3px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-ink-muted);
	}

	.profile-info {
		min-width: 0;
	}

	.official-name {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
		color: var(--color-ink);
	}

	.official-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.official-title {
		font-size: 0.875rem;
		color: var(--color-ink-muted);
	}

	.party-badge {
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.25rem 0.625rem;
		border-radius: 4px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.party-badge.republican {
		background: #fee2e2;
		color: #b91c1c;
	}

	.party-badge.democrat {
		background: #dbeafe;
		color: #1d4ed8;
	}

	:global([data-theme='dark']) .party-badge.republican {
		background: #450a0a;
		color: #fca5a5;
	}

	:global([data-theme='dark']) .party-badge.democrat {
		background: #1e3a5f;
		color: #93c5fd;
	}

	.state {
		font-size: 0.875rem;
		color: var(--color-ink-muted);
	}

	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.stat-value.stat-buy {
		color: var(--color-gain, #047857);
	}

	.stat-value.stat-sell {
		color: var(--color-loss, #b91c1c);
	}

	.stat-label {
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.25rem;
	}

	.section-title {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-ink);
		margin: 0 0 1rem;
	}

	.stocks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 0.75rem;
	}

	.stock-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 0.5rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		text-decoration: none;
		color: inherit;
		transition: background-color 0.15s, transform 0.15s;
	}

	.stock-card:hover {
		background: var(--color-newsprint-dark);
		transform: translateY(-2px);
	}

	.stock-logo {
		width: 36px;
		height: 36px;
		object-fit: contain;
	}

	.stock-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
	}

	.stock-ticker {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.stock-trades {
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
	}

	.table-container {
		overflow-x: auto;
		margin: -0.25rem;
		padding: 0.25rem;
	}

	.trades-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.trades-table th {
		text-align: left;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		padding: 0.625rem 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.trades-table td {
		padding: 0.75rem 0.5rem;
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
	}

	.trades-table tbody tr:last-child td {
		border-bottom: none;
	}

	.trades-table tbody tr:hover {
		background: var(--color-newsprint);
	}

	.stock-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: inherit;
	}

	.stock-link:hover .table-ticker {
		text-decoration: underline;
	}

	.table-logo {
		width: 24px;
		height: 24px;
		object-fit: contain;
		border-radius: 4px;
	}

	.table-ticker {
		font-weight: 600;
		color: var(--color-ink);
	}

	.type-badge {
		display: inline-block;
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: 4px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.type-badge.purchase {
		background: #d1fae5;
		color: #047857;
	}

	.type-badge.sale {
		background: #fee2e2;
		color: #b91c1c;
	}

	:global([data-theme='dark']) .type-badge.purchase {
		background: #064e3b;
		color: #6ee7b7;
	}

	:global([data-theme='dark']) .type-badge.sale {
		background: #450a0a;
		color: #fca5a5;
	}

	.amount-cell {
		font-weight: 500;
		white-space: nowrap;
	}

	.date-cell {
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	.hide-mobile {
		display: table-cell;
	}

	.empty-message {
		text-align: center;
		color: var(--color-ink-muted);
		padding: 2rem;
	}

	@media (max-width: 640px) {
		.stats-row {
			grid-template-columns: repeat(2, 1fr);
		}

		.hide-mobile {
			display: none;
		}

		.stocks-grid {
			grid-template-columns: repeat(3, 1fr);
		}

		.official-name {
			font-size: 1.25rem;
		}
	}

	@media (max-width: 400px) {
		.profile-main {
			flex-direction: column;
			text-align: center;
		}

		.official-meta {
			justify-content: center;
		}

		.stocks-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
