<script lang="ts">
	import { page } from '$app/state';
	import { formatDate } from '$lib/utils/formatters';
	import { getCongressPortraitUrl, getAvatarFallback, getCompanyLogoUrl } from '$lib/utils/urls';
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

	function getPartyAbbrev(party?: string | null): string {
		if (!party) return '?';
		const p = party.toLowerCase();
		if (p.includes('democrat')) return 'D';
		if (p.includes('republican')) return 'R';
		return party.charAt(0).toUpperCase();
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
			<a href="/political/members" class="back-link">&larr; Back to Politicians List</a>
			<h1 class="page-title">Stock Trades Associated with {official.name}</h1>
		</header>

		<div class="main-layout">
			<!-- Left Sidebar - Portrait & Info -->
			<aside class="sidebar">
				<div class="portrait-section">
					{#if !portraitError}
						<img
							src={getPortraitUrl(official.name, official.title)}
							alt={official.name}
							class="portrait"
							onerror={() => (portraitError = true)}
						/>
					{:else}
						<img
							src={getAvatarFallback(official.name)}
							alt={official.name}
							class="portrait"
						/>
					{/if}
				</div>

				<div class="official-info">
					<h2 class="official-name">{official.name}</h2>
					<p class="official-title">{getTitle(official)}</p>
					{#if official.state}
						<p class="official-location">
							{getPartyAbbrev(official.party)}-{official.state}
						</p>
					{/if}
				</div>

				<a href="/political/member/{encodeURIComponent(official.name)}/insider" class="insider-link">
					View Insider Trades
				</a>
			</aside>

			<!-- Main Content -->
			<main class="content">
				<!-- Stocks Owned at One Point -->
				{#if stocksOwned.length > 0}
					<section class="section stocks-section">
						<h2 class="section-title">STOCKS OWNED AT ONE POINT</h2>
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
									<span class="stock-ticker">{stock.ticker}</span>
								</a>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Trade Timeline -->
				<section class="section">
					<h2 class="section-title">TRADE TIMELINE</h2>

					{#if allTrades.length === 0}
						<p class="empty-message">No trades found for this official.</p>
					{:else}
						<div class="table-container">
							<table class="trades-table">
								<thead>
									<tr>
										<th>STOCK</th>
										<th>TYPE</th>
										<th>AMOUNT RANGE</th>
										<th>DATE</th>
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
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</section>
			</main>
		</div>
	{/if}
</div>

<style>
	.politician-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: 'IBM Plex Mono', monospace;
	}

	.loading-state,
	.error-state {
		text-align: center;
		padding: 3rem 1rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
	}

	.error-message {
		color: var(--color-loss);
		margin-bottom: 1rem;
	}

	.back-btn {
		display: inline-block;
		padding: 0.5rem 1.5rem;
		background: var(--color-ink);
		color: var(--color-newsprint);
		text-decoration: none;
		font-family: inherit;
	}

	.back-btn:hover {
		background: var(--color-ink-light);
	}

	.page-header {
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--color-ink);
	}

	.back-link {
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		text-decoration: none;
		display: inline-block;
		margin-bottom: 0.5rem;
	}

	.back-link:hover {
		color: var(--color-ink);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		color: var(--color-ink);
	}

	.main-layout {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: 2rem;
	}

	.sidebar {
		text-align: center;
	}

	.portrait-section {
		margin-bottom: 1rem;
	}

	.portrait {
		width: 160px;
		height: 200px;
		object-fit: contain;
		background: var(--color-paper, #fff);
		border: 2px solid var(--color-ink);
	}

	.official-info {
		margin-bottom: 1.5rem;
	}

	.official-name {
		font-size: 1.125rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
		color: var(--color-ink);
	}

	.official-title {
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		margin: 0 0 0.25rem;
	}

	.official-location {
		font-size: 0.875rem;
		color: var(--color-ink-faint);
		margin: 0;
	}

	.insider-link {
		display: inline-block;
		padding: 0.5rem 1rem;
		background: var(--color-ink);
		color: var(--color-newsprint);
		text-decoration: none;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.insider-link:hover {
		background: var(--color-ink-light);
	}

	.content {
		min-width: 0;
	}

	.section {
		margin-bottom: 2rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		padding: 1.5rem;
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-ink-faint);
		margin: 0 0 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px dotted var(--color-border);
	}

	.stocks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		gap: 0.75rem;
	}

	.stock-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--color-newsprint-dark);
		border: 1px solid var(--color-border);
		text-decoration: none;
		color: inherit;
		transition: box-shadow 0.15s, transform 0.15s;
	}

	.stock-card:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		transform: translateY(-2px);
	}

	.stock-logo {
		width: 40px;
		height: 40px;
		object-fit: contain;
	}

	.stock-ticker {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.table-container {
		overflow-x: auto;
	}

	.trades-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.trades-table th {
		text-align: left;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-faint);
		padding: 0.75rem 0.5rem;
		border-bottom: 2px solid var(--color-ink);
	}

	.trades-table td {
		padding: 0.75rem 0.5rem;
		border-bottom: 1px dotted var(--color-border);
		vertical-align: middle;
	}

	.trades-table tbody tr:hover {
		background: var(--color-newsprint-dark);
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
	}

	.table-ticker {
		font-weight: 600;
		color: var(--color-ink);
	}

	.type-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: 2px;
	}

	.type-badge.purchase {
		background: var(--color-gain-light);
		color: var(--color-gain);
	}

	.type-badge.sale {
		background: var(--color-loss-light);
		color: var(--color-loss);
	}

	.amount-cell {
		font-weight: 500;
		white-space: nowrap;
	}

	.date-cell {
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	.empty-message {
		text-align: center;
		color: var(--color-ink-faint);
		padding: 2rem;
	}

	@media (max-width: 768px) {
		.main-layout {
			grid-template-columns: 1fr;
		}

		.sidebar {
			display: flex;
			gap: 1.5rem;
			align-items: center;
			text-align: left;
		}

		.portrait-section {
			margin-bottom: 0;
		}

		.portrait {
			width: 100px;
			height: 130px;
		}

		.stocks-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	@media (max-width: 500px) {
		.stocks-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
