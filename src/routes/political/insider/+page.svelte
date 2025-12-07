<script lang="ts">
	import { formatDate, formatCurrency } from '$lib/utils/formatters';
	import api from '$lib/utils/api';
	import { getCeoPortraitUrl } from '$lib/utils/urls';

	interface InsiderTrade {
		id: number;
		symbol: string;
		companyName: string;
		reporterName: string;
		reporterTitle: string;
		transactionType: string;
		transactionDate: string;
		filingDate: string;
		sharesTransacted: number;
		sharePrice: number;
		totalValue: number;
		sharesOwned: number;
		isMock?: boolean;
	}

	interface Stats {
		totalTrades: number;
		purchaseCount: number;
		saleCount: number;
		totalValue: number;
		topBuyers: { name: string; value: number }[];
		topSellers: { name: string; value: number }[];
	}

	let trades = $state<InsiderTrade[]>([]);
	let stats = $state<Stats | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let filterType = $state('all');
	let filterTicker = $state('');
	let viewMode = $state<'table' | 'cards'>('cards');

	const filteredTrades = $derived.by(() => {
		let result = trades;

		if (filterType !== 'all') {
			if (filterType === 'buy') {
				result = result.filter((t) => t.transactionType === 'PURCHASE');
			} else if (filterType === 'sell') {
				result = result.filter((t) => t.transactionType === 'SALE');
			}
		}

		if (filterTicker.trim()) {
			const search = filterTicker.trim().toUpperCase();
			result = result.filter((t) => t.symbol.toUpperCase().includes(search));
		}

		return result;
	});

	async function fetchTrades() {
		loading = true;
		error = null;

		try {
			const [tradesRes, statsRes] = await Promise.all([
				api.getInsiderTrades({ limit: 100 }),
				api.getInsiderStats()
			]);

			if (tradesRes.success && tradesRes.data) {
				trades = tradesRes.data;
			}

			if (statsRes.success && statsRes.data) {
				stats = statsRes.data;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load insider trades';
		} finally {
			loading = false;
		}
	}

	function getPortraitUrl(name: string): string {
		return getCeoPortraitUrl(name);
	}

	function formatShares(shares: number): string {
		if (shares >= 1000000) {
			return `${(shares / 1000000).toFixed(2)}M`;
		}
		if (shares >= 1000) {
			return `${(shares / 1000).toFixed(0)}K`;
		}
		return shares.toLocaleString();
	}

	function formatValue(value: number): string {
		if (value >= 1000000000) {
			return `$${(value / 1000000000).toFixed(2)}B`;
		}
		if (value >= 1000000) {
			return `$${(value / 1000000).toFixed(2)}M`;
		}
		if (value >= 1000) {
			return `$${(value / 1000).toFixed(0)}K`;
		}
		return formatCurrency(value);
	}

	$effect(() => {
		fetchTrades();
	});
</script>

<svelte:head>
	<title>Insider Trading - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">Corporate Insider Trading</h1>
		<p class="text-ink-muted mt-2">
			Track stock trades by company executives and directors. Data from SEC Form 4 filings.
		</p>
	</section>

	<!-- Stats Cards -->
	{#if stats && !loading}
		<section class="col-span-4">
			<div class="card">
				<h2 class="headline headline-md mb-4">Market Overview</h2>
				<div class="grid grid-cols-3 gap-4">
					<div class="stat-box">
						<p class="text-2xl font-bold">{stats.totalTrades}</p>
						<p class="text-xs text-ink-muted">Total Trades</p>
					</div>
					<div class="stat-box">
						<p class="text-2xl font-bold text-emerald-600">{stats.purchaseCount}</p>
						<p class="text-xs text-ink-muted">Purchases</p>
					</div>
					<div class="stat-box">
						<p class="text-2xl font-bold text-red-600">{stats.saleCount}</p>
						<p class="text-xs text-ink-muted">Sales</p>
					</div>
				</div>

				{#if stats.topBuyers && stats.topBuyers.length > 0}
					<h3 class="byline mt-4 mb-2">Largest Buyers</h3>
					<div class="space-y-1">
						{#each stats.topBuyers as buyer (buyer.name)}
							<div class="stat-row">
								<span class="text-sm truncate">{buyer.name}</span>
								<span class="text-xs text-emerald-600">{formatValue(buyer.value)}</span>
							</div>
						{/each}
					</div>
				{/if}

				{#if stats.topSellers && stats.topSellers.length > 0}
					<h3 class="byline mt-4 mb-2">Largest Sellers</h3>
					<div class="space-y-1">
						{#each stats.topSellers as seller (seller.name)}
							<div class="stat-row">
								<span class="text-sm truncate">{seller.name}</span>
								<span class="text-xs text-red-600">{formatValue(seller.value)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Filters and Trades -->
	<section class={stats && !loading ? 'col-span-8' : 'col-span-full'}>
		<div class="card mb-4">
			<div class="flex gap-4 flex-wrap items-end">
				<div>
					<label for="filter-type" class="byline block mb-1">Transaction Type</label>
					<select id="filter-type" bind:value={filterType} class="input">
						<option value="all">All Types</option>
						<option value="buy">Purchases</option>
						<option value="sell">Sales</option>
					</select>
				</div>
				<div>
					<label for="filter-ticker" class="byline block mb-1">Ticker</label>
					<input
						type="text"
						id="filter-ticker"
						bind:value={filterTicker}
						placeholder="Search ticker..."
						class="input"
					/>
				</div>
				<button onclick={fetchTrades} class="btn btn-secondary" disabled={loading}>
					{loading ? 'Loading...' : 'Refresh'}
				</button>

				<div class="ml-auto flex gap-1">
					<button
						onclick={() => (viewMode = 'table')}
						class="btn btn-sm {viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}"
						title="Table view"
					>
						Table
					</button>
					<button
						onclick={() => (viewMode = 'cards')}
						class="btn btn-sm {viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}"
						title="Card view"
					>
						Cards
					</button>
				</div>
			</div>
		</div>

		{#if loading && trades.length === 0}
			<div class="card text-center py-8">
				<p class="text-ink-muted">Loading insider trades...</p>
			</div>
		{:else if error}
			<div class="card text-center py-8">
				<p class="text-red-600 mb-4">{error}</p>
				<button onclick={fetchTrades} class="btn btn-primary">Try Again</button>
			</div>
		{:else if filteredTrades.length === 0}
			<div class="card text-center py-8">
				<p class="text-ink-muted">No insider trades found matching your filters.</p>
			</div>
		{:else if viewMode === 'cards'}
			<div class="grid gap-4 md:grid-cols-2">
				{#each filteredTrades as trade (trade.id)}
					<div class="insider-card">
						<div class="insider-card-header">
							<img
								src={getPortraitUrl(trade.reporterName)}
								alt={trade.reporterName}
								class="insider-portrait"
								loading="lazy"
								decoding="async"
								onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'}
							/>
							<div class="insider-info">
								<span class="insider-name">{trade.reporterName}</span>
								<span class="insider-title">{trade.reporterTitle}</span>
							</div>
							<a href="/ticker/{trade.symbol}" class="ticker-chip">{trade.symbol}</a>
						</div>

						<div class="insider-card-body">
							<div class="trade-row">
								<span class="trade-label">Company</span>
								<span class="trade-value">{trade.companyName}</span>
							</div>
							<div class="trade-row">
								<span class="trade-label">Transaction</span>
								<span
									class="trade-badge"
									class:purchase={trade.transactionType === 'PURCHASE'}
									class:sale={trade.transactionType === 'SALE'}
								>
									{trade.transactionType === 'PURCHASE' ? 'Purchase' : 'Sale'}
								</span>
							</div>
							<div class="trade-row">
								<span class="trade-label">Shares</span>
								<span class="trade-value font-semibold">{formatShares(trade.sharesTransacted)}</span>
							</div>
							<div class="trade-row">
								<span class="trade-label">Price</span>
								<span class="trade-value">{trade.sharePrice ? formatCurrency(trade.sharePrice) : '-'}</span>
							</div>
							<div class="trade-row">
								<span class="trade-label">Total Value</span>
								<span class="trade-value font-bold {trade.transactionType === 'PURCHASE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
									{formatValue(trade.totalValue)}
								</span>
							</div>
						</div>

						<div class="insider-card-footer">
							<span class="text-xs text-ink-muted">
								Transaction: {trade.transactionDate ? formatDate(trade.transactionDate) : '-'}
							</span>
							<span class="text-xs text-ink-muted">
								Filed: {trade.filingDate ? formatDate(trade.filingDate) : '-'}
							</span>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="card overflow-x-auto">
				<table class="data-table">
					<thead>
						<tr>
							<th>Insider</th>
							<th>Ticker</th>
							<th>Type</th>
							<th>Shares</th>
							<th>Price</th>
							<th>Total Value</th>
							<th>Transaction</th>
							<th>Filed</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredTrades as trade (trade.id)}
							<tr>
								<td>
									<div class="flex items-center gap-3">
										<img
											src={getPortraitUrl(trade.reporterName)}
											alt={trade.reporterName}
											class="w-10 h-12 object-contain border border-ink-light bg-newsprint flex-shrink-0"
											loading="lazy"
											decoding="async"
											onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'}
										/>
										<div>
											<div class="font-semibold">{trade.reporterName}</div>
											<div class="text-xs text-ink-muted">{trade.reporterTitle}</div>
										</div>
									</div>
								</td>
								<td>
									<a href="/ticker/{trade.symbol}" class="ticker-symbol">
										{trade.symbol}
									</a>
								</td>
								<td>
									<span
										class={trade.transactionType === 'PURCHASE'
											? 'badge badge-gain'
											: trade.transactionType === 'SALE'
												? 'badge badge-loss'
												: 'badge'}
									>
										{trade.transactionType === 'PURCHASE' ? 'Buy' : 'Sell'}
									</span>
								</td>
								<td class="whitespace-nowrap">{formatShares(trade.sharesTransacted)}</td>
								<td class="whitespace-nowrap">{trade.sharePrice ? formatCurrency(trade.sharePrice) : '-'}</td>
								<td class="font-semibold whitespace-nowrap {trade.transactionType === 'PURCHASE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">
									{formatValue(trade.totalValue)}
								</td>
								<td class="whitespace-nowrap">
									{trade.transactionDate ? formatDate(trade.transactionDate) : '-'}
								</td>
								<td class="text-ink-muted whitespace-nowrap">
									{trade.filingDate ? formatDate(trade.filingDate) : '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<section class="col-span-full">
		<p class="byline text-center mt-4">
			Data from SEC Form 4 filings. For informational purposes only. Not financial advice.
		</p>
	</section>
</div>

<style>
	.stat-box {
		text-align: center;
		padding: 0.75rem;
		background-color: var(--color-newsprint-dark, #e0e0d8);
		border: 1px solid var(--color-border, #aaa);
	}

	[data-theme="dark"] .stat-box {
		background-color: var(--color-newsprint-dark, #1e1e1e);
		border-color: var(--color-border, #3d3d3d);
	}

	.stat-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem;
		background-color: var(--color-newsprint-dark, #e0e0d8);
		border: 1px solid var(--color-border, #aaa);
	}

	[data-theme="dark"] .stat-row {
		background-color: var(--color-newsprint-dark, #1e1e1e);
		border-color: var(--color-border, #3d3d3d);
	}

	.insider-card {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-ink-light, #e5e7eb);
		background-color: var(--color-newsprint, #fafaf9);
	}

	:global(.dark) .insider-card {
		background-color: var(--color-bg-secondary, #1f2937);
		border-color: var(--color-border, #374151);
	}

	.insider-card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-bottom: 1px dotted var(--color-ink-light, #e5e7eb);
	}

	:global(.dark) .insider-card-header {
		border-color: var(--color-border, #374151);
	}

	.insider-portrait {
		width: 3rem;
		height: 3.75rem;
		object-fit: contain;
		border: 1px solid var(--color-ink-light, #e5e7eb);
		background-color: white;
		flex-shrink: 0;
	}

	.insider-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.insider-name {
		font-weight: 600;
		font-size: 0.875rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.insider-title {
		font-size: 0.75rem;
		color: var(--color-ink-muted, #6b7280);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ticker-chip {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		font-family: var(--font-mono, monospace);
		background-color: var(--color-newsprint-dark, #e5e7eb);
		text-decoration: none;
		color: inherit;
		flex-shrink: 0;
	}

	:global(.dark) .ticker-chip {
		background-color: var(--color-bg-tertiary, #374151);
	}

	.ticker-chip:hover {
		text-decoration: underline;
	}

	.insider-card-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.trade-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.trade-label {
		font-size: 0.75rem;
		color: var(--color-ink-muted, #6b7280);
	}

	.trade-value {
		font-size: 0.875rem;
	}

	.trade-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
	}

	.trade-badge.purchase {
		background-color: rgba(16, 185, 129, 0.1);
		color: #059669;
	}

	:global(.dark) .trade-badge.purchase {
		background-color: rgba(16, 185, 129, 0.2);
		color: #34d399;
	}

	.trade-badge.sale {
		background-color: rgba(239, 68, 68, 0.1);
		color: #dc2626;
	}

	:global(.dark) .trade-badge.sale {
		background-color: rgba(239, 68, 68, 0.2);
		color: #f87171;
	}

	.insider-card-footer {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-top: 1px dotted var(--color-ink-light, #e5e7eb);
		background-color: var(--color-newsprint-dark, #f3f4f6);
	}

	:global(.dark) .insider-card-footer {
		background-color: var(--color-bg-tertiary, #374151);
		border-color: var(--color-border, #374151);
	}
</style>
