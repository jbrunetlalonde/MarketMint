<script lang="ts">
	import { formatDate } from '$lib/utils/formatters';
	import api from '$lib/utils/api';
	import PoliticalTradeCard from '$lib/components/PoliticalTradeCard.svelte';
	import { getCongressPortraitUrl } from '$lib/utils/urls';
	import { getPartyAbbrev } from '$lib/utils/political';
	import type { PageData } from './$types';

	interface PoliticalTrade {
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
		portraitUrl?: string | null;
		chamber?: string | null;
		isMock?: boolean;
	}

	const BATCH_SIZE = 50;

	let { data }: { data: PageData } = $props();
	const { config } = data;

	let trades = $state<PoliticalTrade[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let offset = $state(0);
	let hasMore = $state(true);

	let filterParty = $state('all');
	let filterType = $state('all');
	let filterTicker = $state('');
	let filterMember = $state('');
	let filterDateRange = $state('all');
	let viewMode = $state<'table' | 'cards'>('cards');
	let lastUpdated = $state<Date | null>(null);

	function getAvatarFallback(name: string): string {
		return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=374151`;
	}

	function matchesChamber(title: string | null | undefined): boolean {
		if (!title) return false;
		const lower = title.toLowerCase();
		return config.titleFilter.some((filter) => lower.includes(filter));
	}

	function isWithinDateRange(dateStr: string): boolean {
		if (filterDateRange === 'all') return true;
		const date = new Date(dateStr);
		const now = new Date();
		const days = parseInt(filterDateRange);
		const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
		return date >= cutoff;
	}

	const activeFilterCount = $derived(
		(filterParty !== 'all' ? 1 : 0) +
		(filterType !== 'all' ? 1 : 0) +
		(filterTicker.trim() ? 1 : 0) +
		(filterMember.trim() ? 1 : 0) +
		(filterDateRange !== 'all' ? 1 : 0)
	);

	function clearAllFilters() {
		filterParty = 'all';
		filterType = 'all';
		filterTicker = '';
		filterMember = '';
		filterDateRange = 'all';
	}

	const filteredTrades = $derived.by(() => {
		let result = trades.filter((t) => matchesChamber(t.title));

		if (filterParty !== 'all') {
			result = result.filter((t) => {
				const party = t.party?.toLowerCase() || '';
				if (filterParty === 'D') return party.includes('democrat') || party === 'd';
				if (filterParty === 'R') return party.includes('republican') || party === 'r';
				return true;
			});
		}

		if (filterType !== 'all') {
			result = result.filter((t) => t.transactionType === filterType);
		}

		if (filterTicker.trim()) {
			const search = filterTicker.trim().toUpperCase();
			result = result.filter((t) => t.ticker.toUpperCase().includes(search));
		}

		if (filterMember.trim()) {
			const search = filterMember.trim().toLowerCase();
			result = result.filter((t) => t.officialName.toLowerCase().includes(search));
		}

		if (filterDateRange !== 'all') {
			result = result.filter((t) => isWithinDateRange(t.transactionDate));
		}

		return result;
	});

	const stats = $derived.by(() => {
		const chamberTrades = trades.filter((t) => matchesChamber(t.title));
		if (chamberTrades.length === 0) return null;

		const buyCount = chamberTrades.filter((t) => t.transactionType === 'BUY').length;
		const sellCount = chamberTrades.filter((t) => t.transactionType === 'SELL').length;
		const buyRatio = chamberTrades.length > 0 ? Math.round((buyCount / chamberTrades.length) * 100) : 0;

		const topTraders: Record<string, number> = {};
		chamberTrades.forEach((t) => {
			topTraders[t.officialName] = (topTraders[t.officialName] || 0) + 1;
		});

		const sortedTraders = Object.entries(topTraders)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);

		const topStocks: Record<string, number> = {};
		chamberTrades.forEach((t) => {
			topStocks[t.ticker] = (topStocks[t.ticker] || 0) + 1;
		});

		const sortedStocks = Object.entries(topStocks)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);

		return {
			totalTrades: chamberTrades.length,
			buyCount,
			sellCount,
			buyRatio,
			topTraders: sortedTraders,
			topStocks: sortedStocks
		};
	});

	function filterByMember(name: string) {
		filterMember = name;
	}

	function filterByTicker(ticker: string) {
		filterTicker = ticker;
	}

	async function fetchTrades(append = false) {
		if (append) {
			loadingMore = true;
		} else {
			loading = true;
			offset = 0;
			trades = [];
		}
		error = null;

		try {
			const response = await api.getPoliticalTrades({
				chamber: config.chamber,
				limit: BATCH_SIZE,
				offset: append ? offset : 0
			});
			if (response.success && response.data) {
				if (append) {
					trades = [...trades, ...response.data];
				} else {
					trades = response.data;
				}
				hasMore = response.pagination?.hasMore ?? response.data.length === BATCH_SIZE;
				offset = (append ? offset : 0) + response.data.length;
				lastUpdated = new Date();
			} else {
				error = `Failed to load ${config.title} trades`;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load trades';
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	function loadMore() {
		fetchTrades(true);
	}

	function getPortraitUrl(name: string): string {
		return getCongressPortraitUrl(name, config.chamber);
	}

	$effect(() => {
		fetchTrades();
	});
</script>

<svelte:head>
	<title>{config.chamber === 'house' ? 'House' : 'Senate'} Trades - MarketMint</title>
</svelte:head>

<div class="chamber-page">
	<header class="page-header">
		<h1 class="page-title">{config.pageTitle}</h1>
		<p class="page-subtitle">{config.description}</p>
	</header>

	<div class="content-grid">
		{#if stats}
			<aside class="sidebar">
				<div class="sidebar-card">
					<h2 class="sidebar-title">{config.chamber === 'house' ? 'House' : 'Senate'} Stats</h2>
					<div class="stats-grid">
						<div class="stat-box">
							<p class="stat-value">{stats.totalTrades}</p>
							<p class="stat-label">Total</p>
						</div>
						<div class="stat-box stat-buy">
							<p class="stat-value">{stats.buyCount}</p>
							<p class="stat-label">Buys</p>
						</div>
						<div class="stat-box stat-sell">
							<p class="stat-value">{stats.sellCount}</p>
							<p class="stat-label">Sells</p>
						</div>
					</div>

					<div class="ratio-bar">
						<div class="ratio-fill" style="width: {stats.buyRatio}%"></div>
					</div>
					<p class="ratio-label">{stats.buyRatio}% buying activity</p>

					{#if stats.topTraders.length > 0}
						<h3 class="section-label">Most Active {config.titlePlural}</h3>
						<div class="stat-list">
							{#each stats.topTraders as [name, count] (name)}
								<button
									type="button"
									onclick={() => filterByMember(name)}
									class="stat-row"
								>
									<span class="stat-name">{name}</span>
									<span class="stat-count">{count}</span>
								</button>
							{/each}
						</div>
					{/if}

					{#if stats.topStocks.length > 0}
						<h3 class="section-label">Most Traded Stocks</h3>
						<div class="stat-list">
							{#each stats.topStocks as [ticker, count] (ticker)}
								<button
									type="button"
									onclick={() => filterByTicker(ticker)}
									class="stat-row"
								>
									<span class="ticker-symbol">{ticker}</span>
									<span class="stat-count">{count}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</aside>
		{/if}

		<main class={stats ? 'main-content' : 'main-content-full'}>
			<div class="filter-card">
				<div class="filter-header">
					<span class="filter-title">
						Filters
						{#if activeFilterCount > 0}
							<span class="filter-count">{activeFilterCount}</span>
						{/if}
					</span>
					{#if activeFilterCount > 0}
						<button type="button" onclick={clearAllFilters} class="clear-filters">
							Clear all
						</button>
					{/if}
				</div>
				<div class="filter-grid">
					<div class="filter-field">
						<label for="filter-member" class="filter-label">Member</label>
						<input
							type="text"
							id="filter-member"
							bind:value={filterMember}
							placeholder="Search name..."
							class="filter-input"
						/>
					</div>
					<div class="filter-field">
						<label for="filter-party" class="filter-label">Party</label>
						<select id="filter-party" bind:value={filterParty} class="filter-input">
							<option value="all">All</option>
							<option value="D">Democrat</option>
							<option value="R">Republican</option>
						</select>
					</div>
					<div class="filter-field">
						<label for="filter-type" class="filter-label">Type</label>
						<select id="filter-type" bind:value={filterType} class="filter-input">
							<option value="all">All</option>
							<option value="BUY">Buy</option>
							<option value="SELL">Sell</option>
						</select>
					</div>
					<div class="filter-field">
						<label for="filter-ticker" class="filter-label">Ticker</label>
						<input
							type="text"
							id="filter-ticker"
							bind:value={filterTicker}
							placeholder="AAPL..."
							class="filter-input"
						/>
					</div>
					<div class="filter-field">
						<label for="filter-date" class="filter-label">Date Range</label>
						<select id="filter-date" bind:value={filterDateRange} class="filter-input">
							<option value="all">All Time</option>
							<option value="7">Last 7 days</option>
							<option value="30">Last 30 days</option>
							<option value="90">Last 90 days</option>
						</select>
					</div>
				</div>
				<div class="filter-footer">
					<div class="view-toggle">
						<button
							type="button"
							onclick={() => (viewMode = 'cards')}
							class="view-btn"
							class:active={viewMode === 'cards'}
						>
							Cards
						</button>
						<button
							type="button"
							onclick={() => (viewMode = 'table')}
							class="view-btn"
							class:active={viewMode === 'table'}
						>
							Table
						</button>
					</div>
					<button type="button" onclick={() => fetchTrades()} class="refresh-btn" disabled={loading}>
						{loading ? 'Loading...' : 'Refresh'}
					</button>
				</div>
				{#if lastUpdated}
					<div class="last-updated">
						Updated {lastUpdated.toLocaleTimeString()}
					</div>
				{/if}
			</div>

			{#if loading && trades.length === 0}
				<div class="empty-state">
					<p>Loading {config.chamber === 'house' ? 'House' : 'Senate'} trades...</p>
				</div>
			{:else if error}
				<div class="empty-state">
					<p class="error-text">{error}</p>
					<button type="button" onclick={() => fetchTrades()} class="retry-btn">Try Again</button>
				</div>
			{:else if filteredTrades.length === 0}
				<div class="empty-state">
					<p>No trades found matching your filters.</p>
					{#if activeFilterCount > 0}
						<button type="button" onclick={clearAllFilters} class="retry-btn">Clear Filters</button>
					{/if}
				</div>
			{:else if viewMode === 'cards'}
				<div class="trades-list">
					{#each filteredTrades as trade (trade.id)}
						<PoliticalTradeCard {trade} />
					{/each}
				</div>
			{:else}
				<div class="table-container">
					<table class="data-table">
						<thead>
							<tr>
								<th>{config.title}</th>
								<th>Ticker</th>
								<th>Type</th>
								<th>Amount</th>
								<th>Transaction</th>
								<th>Reported</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredTrades as trade (trade.id)}
								<tr>
									<td>
										<div class="table-member">
											<img
												src={getPortraitUrl(trade.officialName)}
												alt={trade.officialName}
												class="table-portrait"
												loading="lazy"
												decoding="async"
												onerror={(e) => {
													const img = e.currentTarget as HTMLImageElement;
													img.onerror = null;
													img.src = getAvatarFallback(trade.officialName);
												}}
											/>
											<div>
												<a href="/political/member/{encodeURIComponent(trade.officialName)}" class="table-name">{trade.officialName}</a>
												<div class="table-meta">
													{getPartyAbbrev(trade.party)}{#if trade.state}-{trade.state}{/if}
												</div>
											</div>
										</div>
									</td>
									<td>
										<a href="/ticker/{trade.ticker}" class="ticker-link">
											{trade.ticker}
										</a>
									</td>
									<td>
										<span class="type-badge" class:buy={trade.transactionType === 'BUY'} class:sell={trade.transactionType === 'SELL'}>
											{trade.transactionType}
										</span>
									</td>
									<td class="amount-cell">{trade.amountDisplay}</td>
									<td class="date-cell">
										{trade.transactionDate ? formatDate(trade.transactionDate) : '-'}
									</td>
									<td class="date-cell muted">
										{trade.reportedDate ? formatDate(trade.reportedDate) : '-'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			{#if hasMore && filteredTrades.length > 0}
				<div class="load-more">
					<button type="button" onclick={loadMore} class="load-more-btn" disabled={loadingMore}>
						{loadingMore ? 'Loading...' : 'Load More Trades'}
					</button>
					<p class="results-count">Showing {filteredTrades.length} trades</p>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	.chamber-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: var(--font-mono);
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0;
		color: var(--color-ink);
	}

	.page-subtitle {
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		margin: 0.5rem 0 0;
	}

	.content-grid {
		display: grid;
		grid-template-columns: 320px 1fr;
		gap: 1.5rem;
		align-items: start;
	}

	.sidebar {
		position: sticky;
		top: 1rem;
	}

	.sidebar-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.25rem;
	}

	.sidebar-title {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 1rem;
		color: var(--color-ink);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.stat-box {
		text-align: center;
		padding: 0.75rem 0.5rem;
		background: var(--color-newsprint);
		border-radius: 6px;
	}

	.stat-box.stat-buy .stat-value {
		color: #047857;
	}

	.stat-box.stat-sell .stat-value {
		color: #b91c1c;
	}

	:global([data-theme='dark']) .stat-box.stat-buy .stat-value {
		color: #6ee7b7;
	}

	:global([data-theme='dark']) .stat-box.stat-sell .stat-value {
		color: #fca5a5;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-ink);
		margin: 0;
	}

	.stat-label {
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		margin: 0.125rem 0 0;
	}

	.ratio-bar {
		height: 6px;
		background: #fee2e2;
		border-radius: 3px;
		overflow: hidden;
		margin: 0.75rem 0 0.375rem;
	}

	:global([data-theme='dark']) .ratio-bar {
		background: #450a0a;
	}

	.ratio-fill {
		height: 100%;
		background: #047857;
		border-radius: 3px;
	}

	:global([data-theme='dark']) .ratio-fill {
		background: #6ee7b7;
	}

	.ratio-label {
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		text-align: center;
		margin: 0;
	}

	.section-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink-muted);
		margin: 1.25rem 0 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.stat-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.625rem;
		background: var(--color-newsprint);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		transition: background-color 0.15s;
		width: 100%;
	}

	.stat-row:hover {
		background: var(--color-newsprint-dark);
	}

	.stat-name {
		font-size: 0.8125rem;
		color: var(--color-ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
	}

	.ticker-symbol {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.stat-count {
		font-size: 0.75rem;
		font-weight: 600;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		padding: 0.125rem 0.5rem;
		border-radius: 3px;
		color: var(--color-ink-muted);
	}

	.main-content {
		min-width: 0;
	}

	.main-content-full {
		grid-column: 1 / -1;
	}

	.filter-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1rem 1.25rem;
		margin-bottom: 1rem;
	}

	.filter-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.875rem;
	}

	.filter-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-count {
		font-size: 0.6875rem;
		font-weight: 700;
		background: var(--color-ink);
		color: var(--color-paper);
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
	}

	.clear-filters {
		font-family: inherit;
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: underline;
	}

	.clear-filters:hover {
		color: var(--color-ink);
	}

	.filter-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.75rem;
	}

	.filter-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.filter-label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.filter-input {
		font-family: inherit;
		font-size: 0.8125rem;
		padding: 0.5rem 0.625rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-ink);
	}

	.filter-input:focus {
		outline: none;
		border-color: var(--color-ink-muted);
	}

	.filter-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1rem;
		padding-top: 0.875rem;
		border-top: 1px solid var(--color-border);
	}

	.view-toggle {
		display: flex;
		gap: 0.25rem;
		background: var(--color-newsprint);
		padding: 0.25rem;
		border-radius: 6px;
	}

	.view-btn {
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.375rem 0.75rem;
		background: transparent;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		color: var(--color-ink-muted);
		transition: all 0.15s;
	}

	.view-btn.active {
		background: var(--color-paper);
		color: var(--color-ink);
		box-shadow: 0 1px 2px rgba(0,0,0,0.05);
	}

	.refresh-btn {
		font-family: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.5rem 1rem;
		background: var(--color-ink);
		color: var(--color-paper);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.refresh-btn:hover:not(:disabled) {
		background: var(--color-ink-light);
	}

	.refresh-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.last-updated {
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		margin-top: 0.75rem;
		text-align: right;
	}

	.empty-state {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--color-ink-muted);
	}

	.empty-state .error-text {
		color: var(--color-loss);
		margin-bottom: 1rem;
	}

	.retry-btn {
		font-family: inherit;
		font-size: 0.8125rem;
		padding: 0.5rem 1.25rem;
		background: var(--color-ink);
		color: var(--color-paper);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		margin-top: 0.75rem;
	}

	.trades-list {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		overflow: hidden;
	}

	.trades-list :global(.trade-card:first-child) {
		border-top: none;
	}

	.trades-list :global(.trade-card:last-child) {
		border-bottom: none;
	}

	.table-container {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		overflow: hidden;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.data-table th {
		text-align: left;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		color: var(--color-ink-muted);
		padding: 0.875rem 1rem;
		background: var(--color-newsprint);
		border-bottom: 1px solid var(--color-border);
	}

	.data-table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
	}

	.data-table tr:last-child td {
		border-bottom: none;
	}

	.data-table tr:hover td {
		background: var(--color-newsprint);
	}

	.table-member {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.table-portrait {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
		object-position: top;
		background: var(--color-newsprint);
		border: 2px solid var(--color-border);
		flex-shrink: 0;
	}

	.table-name {
		font-weight: 600;
		color: var(--color-ink);
		text-decoration: none;
	}

	.table-name:hover {
		text-decoration: underline;
	}

	.table-meta {
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		margin-top: 0.125rem;
	}

	.ticker-link {
		font-weight: 700;
		color: var(--color-ink);
		text-decoration: none;
	}

	.ticker-link:hover {
		text-decoration: underline;
	}

	.type-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.type-badge.buy {
		background: #d1fae5;
		color: #047857;
	}

	.type-badge.sell {
		background: #fee2e2;
		color: #b91c1c;
	}

	:global([data-theme='dark']) .type-badge.buy {
		background: #064e3b;
		color: #6ee7b7;
	}

	:global([data-theme='dark']) .type-badge.sell {
		background: #450a0a;
		color: #fca5a5;
	}

	.amount-cell {
		font-weight: 600;
		white-space: nowrap;
	}

	.date-cell {
		white-space: nowrap;
	}

	.date-cell.muted {
		color: var(--color-ink-muted);
	}

	.load-more {
		text-align: center;
		margin-top: 1.5rem;
	}

	.load-more-btn {
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		padding: 0.75rem 2rem;
		background: var(--color-ink);
		color: var(--color-paper);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.load-more-btn:hover:not(:disabled) {
		background: var(--color-ink-light);
	}

	.load-more-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.results-count {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin-top: 0.5rem;
	}

	@media (max-width: 900px) {
		.content-grid {
			grid-template-columns: 1fr;
		}

		.sidebar {
			position: static;
			order: -1;
		}

		.filter-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 540px) {
		.chamber-page {
			padding: 1rem;
		}

		.filter-grid {
			grid-template-columns: 1fr;
		}

		.filter-footer {
			flex-direction: column;
			gap: 0.75rem;
		}

		.view-toggle {
			width: 100%;
			justify-content: center;
		}

		.refresh-btn {
			width: 100%;
		}
	}
</style>
