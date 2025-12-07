<script lang="ts">
	import { page } from '$app/state';
	import { formatDate } from '$lib/utils/formatters';
	import { getCongressPortraitUrl, getPortraitUrl as getLogoUrl } from '$lib/utils/urls';
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
		logo: string | null;
		lastTransactionType: string;
		lastTransactionDate: string;
		tradeCount: number;
	}

	const memberName = $derived(decodeURIComponent(page.params.name || ''));

	let official = $state<Official | null>(null);
	let allTrades = $state<Trade[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let stockLogos = $state<Record<string, string>>({});

	// Computed: Stocks owned at one point
	const stocksOwned = $derived.by(() => {
		if (allTrades.length === 0) return [];

		const stockMap: Record<string, StockOwned> = {};

		allTrades.forEach((trade) => {
			if (!stockMap[trade.ticker]) {
				stockMap[trade.ticker] = {
					ticker: trade.ticker,
					companyName: trade.assetDescription?.split(' - ')[0] || trade.ticker,
					logo: stockLogos[trade.ticker] || null,
					lastTransactionType: trade.transactionType,
					lastTransactionDate: trade.transactionDate,
					tradeCount: 1
				};
			} else {
				stockMap[trade.ticker].tradeCount++;
				if (
					new Date(trade.transactionDate) >
					new Date(stockMap[trade.ticker].lastTransactionDate)
				) {
					stockMap[trade.ticker].lastTransactionType = trade.transactionType;
					stockMap[trade.ticker].lastTransactionDate = trade.transactionDate;
				}
			}
		});

		return Object.values(stockMap).sort((a, b) => b.tradeCount - a.tradeCount);
	});

	// Computed stats
	const stats = $derived.by(() => {
		if (allTrades.length === 0) return null;

		const buyTrades = allTrades.filter((t) => t.transactionType === 'BUY');
		const sellTrades = allTrades.filter((t) => t.transactionType === 'SELL');

		const tickerCounts: Record<string, number> = {};
		allTrades.forEach((t) => {
			tickerCounts[t.ticker] = (tickerCounts[t.ticker] || 0) + 1;
		});

		const topTickers = Object.entries(tickerCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);

		// Calculate average reporting delay
		let totalGap = 0;
		let gapCount = 0;
		allTrades.forEach((t) => {
			if (t.transactionDate && t.reportedDate) {
				const gap = Math.ceil(
					(new Date(t.reportedDate).getTime() - new Date(t.transactionDate).getTime()) /
						(1000 * 60 * 60 * 24)
				);
				if (gap > 0) {
					totalGap += gap;
					gapCount++;
				}
			}
		});

		return {
			totalTrades: allTrades.length,
			buyCount: buyTrades.length,
			sellCount: sellTrades.length,
			topTickers,
			latestTrade: allTrades[0]?.transactionDate || null,
			uniqueStocks: Object.keys(tickerCounts).length,
			avgReportingDelay: gapCount > 0 ? Math.round(totalGap / gapCount) : null
		};
	});

	function getPortraitUrl(name: string, title?: string | null): string {
		const chamber = title?.toLowerCase().includes('senator') ? 'senate' : 'house';
		return getCongressPortraitUrl(name, chamber);
	}

	function getPartyClass(party?: string | null): string {
		if (!party) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
		const p = party.toLowerCase();
		if (p.includes('democrat')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
		if (p.includes('republican')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
		return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
	}

	function getPartyAbbrev(party?: string | null): string {
		if (!party) return '?';
		const p = party.toLowerCase();
		if (p.includes('democrat')) return 'D';
		if (p.includes('republican')) return 'R';
		return party.charAt(0).toUpperCase();
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n.charAt(0))
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function getReportingGapDays(txDate: string, rptDate: string): number | null {
		if (!txDate || !rptDate) return null;
		const tx = new Date(txDate);
		const rpt = new Date(rptDate);
		const diffTime = rpt.getTime() - tx.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

			// Load stock logos for unique tickers
			const uniqueTickers = [...new Set(allTrades.map((t) => t.ticker))];
			for (const ticker of uniqueTickers.slice(0, 10)) {
				try {
					const profileRes = await api.getProfile(ticker);
					if (profileRes.success && profileRes.data?.image) {
						stockLogos = { ...stockLogos, [ticker]: profileRes.data.image };
					}
				} catch {
					// Ignore logo fetch errors
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	let portraitError = $state(false);

	$effect(() => {
		if (memberName) {
			loadData();
		}
	});
</script>

<svelte:head>
	<title>{memberName} - Congress Trades - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<a href="/political/members" class="text-sm text-ink-muted hover:text-ink">
			&larr; Back to Members Directory
		</a>
	</section>

	{#if loading}
		<section class="col-span-full">
			<div class="card text-center py-8">
				<p class="text-ink-muted">Loading official data...</p>
			</div>
		</section>
	{:else if error}
		<section class="col-span-full">
			<div class="card text-center py-8">
				<p class="text-red-600 mb-4">{error}</p>
				<a href="/political/members" class="btn btn-primary">Back to Members</a>
			</div>
		</section>
	{:else if official}
		<!-- Header with Large Portrait -->
		<section class="col-span-full">
			<div class="card">
				<div class="flex flex-col md:flex-row gap-6">
					<!-- Large Portrait -->
					<div class="flex-shrink-0 mx-auto md:mx-0">
						{#if !portraitError}
							<img
								src={getPortraitUrl(official.name, official.title)}
								alt={official.name}
								class="w-40 h-52 object-contain border-2 border-ink-light bg-newsprint"
								onerror={() => (portraitError = true)}
							/>
						{:else}
							<div
								class="w-40 h-52 flex items-center justify-center text-4xl font-bold border-2 border-ink-light {getPartyClass(
									official.party
								)}"
							>
								{getInitials(official.name)}
							</div>
						{/if}
					</div>

					<!-- Info -->
					<div class="flex-1">
						<div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
							<div>
								<h1 class="headline headline-xl text-center md:text-left">{official.name}</h1>
								<p class="text-lg text-ink-muted mt-1 text-center md:text-left">
									{official.title || 'Official'}
									{#if official.state}
										({getPartyAbbrev(official.party)}-{official.state})
									{/if}
								</p>
							</div>
							<span
								class="text-lg px-4 py-2 rounded font-bold self-center md:self-start {getPartyClass(official.party)}"
							>
								{getPartyAbbrev(official.party)}
							</span>
						</div>

						{#if stats}
							<div class="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
								<div class="text-center p-3 bg-newsprint-dark dark:bg-gray-800 rounded">
									<p class="text-2xl font-bold">{stats.totalTrades}</p>
									<p class="text-xs text-ink-muted">Total Trades</p>
								</div>
								<div class="text-center p-3 bg-newsprint-dark dark:bg-gray-800 rounded">
									<p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.buyCount}</p>
									<p class="text-xs text-ink-muted">Buys</p>
								</div>
								<div class="text-center p-3 bg-newsprint-dark dark:bg-gray-800 rounded">
									<p class="text-2xl font-bold text-red-600 dark:text-red-400">{stats.sellCount}</p>
									<p class="text-xs text-ink-muted">Sells</p>
								</div>
								<div class="text-center p-3 bg-newsprint-dark dark:bg-gray-800 rounded">
									<p class="text-2xl font-bold">{stats.uniqueStocks}</p>
									<p class="text-xs text-ink-muted">Unique Stocks</p>
								</div>
								<div class="text-center p-3 bg-newsprint-dark dark:bg-gray-800 rounded">
									<p class="text-xl font-bold">
										{stats.avgReportingDelay ? `${stats.avgReportingDelay}d` : 'N/A'}
									</p>
									<p class="text-xs text-ink-muted">Avg Delay</p>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</section>

		<!-- Stocks Owned at One Point -->
		{#if stocksOwned.length > 0}
			<section class="col-span-full">
				<div class="card">
					<h2 class="headline headline-md mb-4">Stocks Owned at One Point</h2>
					<div class="stock-cards-grid">
						{#each stocksOwned.slice(0, 12) as stock (stock.ticker)}
							<a href="/ticker/{stock.ticker}" class="stock-card">
								<div class="stock-card-header">
									{#if stockLogos[stock.ticker]}
										<img
											src={stockLogos[stock.ticker]}
											alt={stock.ticker}
											class="stock-logo"
											onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'}
										/>
									{:else}
										<div class="stock-logo-placeholder">
											{stock.ticker.slice(0, 2)}
										</div>
									{/if}
									<div class="stock-info">
										<span class="ticker-symbol">{stock.ticker}</span>
										<span class="company-name">{stock.companyName}</span>
									</div>
								</div>
								<div class="stock-card-footer">
									<span
										class="transaction-badge"
										class:buy={stock.lastTransactionType === 'BUY'}
										class:sell={stock.lastTransactionType === 'SELL'}
									>
										{stock.lastTransactionType === 'BUY' ? 'Purchase' : 'Sale'}
									</span>
									<span class="transaction-date">
										{formatDate(stock.lastTransactionDate)}
									</span>
								</div>
							</a>
						{/each}
					</div>
				</div>
			</section>
		{/if}

		<!-- Trade Timeline -->
		<section class="col-span-full">
			<div class="card">
				<h2 class="headline headline-md mb-4">Trade Timeline</h2>

				{#if allTrades.length === 0}
					<p class="text-ink-muted py-4 text-center">No trades found for this official.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="data-table">
							<thead>
								<tr>
									<th>Stock</th>
									<th>Type</th>
									<th>Amount Range</th>
									<th>Date</th>
									<th>Reported</th>
									<th>Gap</th>
								</tr>
							</thead>
							<tbody>
								{#each allTrades as trade (trade.id)}
									{@const gap = getReportingGapDays(trade.transactionDate, trade.reportedDate)}
									<tr>
										<td>
											<div class="flex items-center gap-2">
												{#if stockLogos[trade.ticker]}
													<img
														src={stockLogos[trade.ticker]}
														alt={trade.ticker}
														class="w-6 h-6 object-contain"
													/>
												{/if}
												<div>
													<a href="/ticker/{trade.ticker}" class="ticker-symbol">
														{trade.ticker}
													</a>
													{#if trade.assetDescription}
														<div class="text-xs text-ink-muted truncate max-w-48">
															{trade.assetDescription}
														</div>
													{/if}
												</div>
											</div>
										</td>
										<td>
											<span
												class="inline-block px-2 py-1 text-xs font-semibold rounded"
												class:bg-emerald-100={trade.transactionType === 'BUY'}
												class:text-emerald-800={trade.transactionType === 'BUY'}
												class:dark:bg-emerald-900={trade.transactionType === 'BUY'}
												class:dark:text-emerald-200={trade.transactionType === 'BUY'}
												class:bg-red-100={trade.transactionType === 'SELL'}
												class:text-red-800={trade.transactionType === 'SELL'}
												class:dark:bg-red-900={trade.transactionType === 'SELL'}
												class:dark:text-red-200={trade.transactionType === 'SELL'}
												class:bg-gray-100={trade.transactionType !== 'BUY' && trade.transactionType !== 'SELL'}
												class:text-gray-800={trade.transactionType !== 'BUY' && trade.transactionType !== 'SELL'}
											>
												{trade.transactionType === 'BUY' ? 'Purchase' : trade.transactionType === 'SELL' ? 'Sale' : trade.transactionType}
											</span>
										</td>
										<td class="font-semibold whitespace-nowrap">{trade.amountDisplay}</td>
										<td class="whitespace-nowrap">
											{trade.transactionDate ? formatDate(trade.transactionDate) : '-'}
										</td>
										<td class="text-ink-muted whitespace-nowrap">
											{trade.reportedDate ? formatDate(trade.reportedDate) : '-'}
										</td>
										<td
											class:text-red-600={gap !== null && gap > 45}
											class:dark:text-red-400={gap !== null && gap > 45}
											class:font-semibold={gap !== null && gap > 45}
											class:text-yellow-600={gap !== null && gap > 30 && gap <= 45}
											class:dark:text-yellow-400={gap !== null && gap > 30 && gap <= 45}
											class:text-ink-muted={gap === null || gap <= 30}
										>
											{gap !== null ? `${gap}d` : '-'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</section>

		<!-- Disclaimer -->
		<section class="col-span-full">
			<p class="byline text-center mt-4">
				Data from STOCK Act filings. For informational purposes only. Not financial advice.
			</p>
		</section>
	{/if}
</div>

<style>
	.stock-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1rem;
	}

	.stock-card {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		border: 1px solid var(--color-ink-light, #e5e7eb);
		background-color: var(--color-newsprint, #fafaf9);
		text-decoration: none;
		color: inherit;
		transition: box-shadow 0.15s, transform 0.15s;
	}

	:global(.dark) .stock-card {
		background-color: var(--color-bg-secondary, #1f2937);
		border-color: var(--color-border, #374151);
	}

	.stock-card:hover {
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.stock-card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.stock-logo {
		width: 2.5rem;
		height: 2.5rem;
		object-fit: contain;
		border-radius: 0.25rem;
		flex-shrink: 0;
	}

	.stock-logo-placeholder {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.75rem;
		background-color: var(--color-newsprint-dark, #e5e7eb);
		border-radius: 0.25rem;
		flex-shrink: 0;
	}

	:global(.dark) .stock-logo-placeholder {
		background-color: var(--color-bg-tertiary, #374151);
	}

	.stock-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.stock-info .ticker-symbol {
		font-weight: 600;
		font-size: 1rem;
	}

	.company-name {
		font-size: 0.75rem;
		color: var(--color-ink-muted, #6b7280);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.stock-card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.5rem;
		border-top: 1px dotted var(--color-ink-light, #e5e7eb);
	}

	:global(.dark) .stock-card-footer {
		border-color: var(--color-border, #374151);
	}

	.transaction-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
	}

	.transaction-badge.buy {
		background-color: rgba(16, 185, 129, 0.1);
		color: #059669;
	}

	:global(.dark) .transaction-badge.buy {
		background-color: rgba(16, 185, 129, 0.2);
		color: #34d399;
	}

	.transaction-badge.sell {
		background-color: rgba(239, 68, 68, 0.1);
		color: #dc2626;
	}

	:global(.dark) .transaction-badge.sell {
		background-color: rgba(239, 68, 68, 0.2);
		color: #f87171;
	}

	.transaction-date {
		font-size: 0.75rem;
		color: var(--color-ink-muted, #6b7280);
	}

	@media (max-width: 640px) {
		.stock-cards-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
