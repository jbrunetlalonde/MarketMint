<script lang="ts">
	import { onMount } from 'svelte';
	import { formatCurrency, formatPercent, getPriceClass } from '$lib/utils/formatters';
	import { auth } from '$lib/stores/auth.svelte';
	import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
	import api from '$lib/utils/api';
	import { getCompanyLogoUrl } from '$lib/utils/urls';

	interface Holding {
		id: string;
		ticker: string;
		shares: number;
		costBasis: number;
		purchaseDate: string | null;
		notes: string | null;
		createdAt: string;
		updatedAt: string;
	}

	interface QuoteData {
		price: number;
		change: number;
		changePercent: number;
	}

	interface PendingAdd {
		symbol: string;
		name: string;
		exchange: string;
	}

	let holdings = $state<Holding[]>([]);
	let quotes = $state<Record<string, QuoteData>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Add form state
	let pendingAdd = $state<PendingAdd | null>(null);
	let addShares = $state('');
	let addCostBasis = $state('');
	let addPurchaseDate = $state('');
	let addNotes = $state('');

	// Edit state
	let editingId = $state<string | null>(null);
	let editShares = $state('');
	let editCostBasis = $state('');
	let editNotes = $state('');

	// Portfolio summary calculations
	const portfolioSummary = $derived.by(() => {
		let totalCost = 0;
		let totalValue = 0;
		let dayChange = 0;

		for (const holding of holdings) {
			const quote = quotes[holding.ticker];
			totalCost += holding.shares * holding.costBasis;
			if (quote) {
				totalValue += holding.shares * quote.price;
				dayChange += holding.shares * quote.change;
			}
		}

		const totalGain = totalValue - totalCost;
		const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
		const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

		return { totalCost, totalValue, totalGain, totalGainPercent, dayChange, dayChangePercent };
	});

	// Portfolio allocation calculations
	const allocations = $derived.by(() => {
		if (portfolioSummary.totalValue <= 0) return [];

		const allocList = holdings.map((h) => {
			const quote = quotes[h.ticker];
			const value = quote ? h.shares * quote.price : 0;
			const percent = (value / portfolioSummary.totalValue) * 100;
			return { ticker: h.ticker, value, percent };
		});

		return allocList.sort((a, b) => b.percent - a.percent);
	});

	// Top allocation for chart (top 5 + other)
	const topAllocations = $derived.by(() => {
		if (allocations.length <= 6) return allocations;

		const top5 = allocations.slice(0, 5);
		const otherPercent = allocations.slice(5).reduce((sum, a) => sum + a.percent, 0);
		const otherValue = allocations.slice(5).reduce((sum, a) => sum + a.value, 0);

		return [...top5, { ticker: 'Other', value: otherValue, percent: otherPercent }];
	});

	// Performance insights
	const performers = $derived.by(() => {
		const withGains = holdings
			.map((h) => {
				const quote = quotes[h.ticker];
				if (!quote) return null;
				const gainPercent = ((quote.price - h.costBasis) / h.costBasis) * 100;
				return { ticker: h.ticker, gainPercent };
			})
			.filter((x): x is { ticker: string; gainPercent: number } => x !== null);

		const sorted = [...withGains].sort((a, b) => b.gainPercent - a.gainPercent);

		return {
			top: sorted.slice(0, 3),
			bottom: sorted.length > 3 ? sorted.slice(-3).reverse() : []
		};
	});

	async function loadPortfolio() {
		if (!auth.isAuthenticated || !auth.accessToken) return;

		loading = true;
		error = null;

		try {
			const response = await api.getPortfolio(auth.accessToken);
			if (response.success && response.data) {
				holdings = response.data;

				if (holdings.length > 0) {
					const tickers = [...new Set(holdings.map((h) => h.ticker))];
					const quotesResponse = await api.getBulkQuotes(tickers);
					if (quotesResponse.success && quotesResponse.data) {
						const quoteMap: Record<string, QuoteData> = {};
						for (const q of quotesResponse.data) {
							quoteMap[q.ticker] = {
								price: q.price,
								change: q.change,
								changePercent: q.changePercent
							};
						}
						quotes = quoteMap;
					}
				}
			}
		} catch (err) {
			error = 'Failed to load portfolio';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	function handleSelectStock(result: { symbol: string; name: string; exchange: string }) {
		pendingAdd = result;
		addShares = '';
		addCostBasis = '';
		addPurchaseDate = '';
		addNotes = '';
		error = null;
	}

	function cancelAdd() {
		pendingAdd = null;
		addShares = '';
		addCostBasis = '';
		addPurchaseDate = '';
		addNotes = '';
	}

	async function confirmAdd() {
		if (!auth.isAuthenticated || !auth.accessToken || !pendingAdd) return;

		const shares = parseFloat(addShares);
		const costBasis = parseFloat(addCostBasis);

		if (isNaN(shares) || shares <= 0) {
			error = 'Please enter a valid number of shares';
			return;
		}

		if (isNaN(costBasis) || costBasis <= 0) {
			error = 'Please enter a valid cost basis';
			return;
		}

		error = null;

		try {
			const response = await api.addPortfolioHolding(auth.accessToken, {
				ticker: pendingAdd.symbol,
				shares,
				costBasis,
				purchaseDate: addPurchaseDate || undefined,
				notes: addNotes || undefined
			});

			if (response.success) {
				cancelAdd();
				await loadPortfolio();
			} else {
				error = response.error?.message || 'Failed to add holding';
			}
		} catch (err) {
			error = 'Failed to add holding';
			console.error(err);
		}
	}

	function startEditing(holding: Holding) {
		editingId = holding.id;
		editShares = String(holding.shares);
		editCostBasis = String(holding.costBasis);
		editNotes = holding.notes || '';
	}

	function cancelEditing() {
		editingId = null;
		editShares = '';
		editCostBasis = '';
		editNotes = '';
	}

	async function saveEditing() {
		if (!auth.isAuthenticated || !auth.accessToken || !editingId) return;

		const shares = parseFloat(editShares);
		const costBasis = parseFloat(editCostBasis);

		if (isNaN(shares) || shares <= 0) {
			error = 'Please enter a valid number of shares';
			return;
		}

		if (isNaN(costBasis) || costBasis <= 0) {
			error = 'Please enter a valid cost basis';
			return;
		}

		error = null;

		try {
			const response = await api.updatePortfolioHolding(auth.accessToken, editingId, {
				shares,
				costBasis,
				notes: editNotes || undefined
			});

			if (response.success) {
				cancelEditing();
				await loadPortfolio();
			} else {
				error = response.error?.message || 'Failed to update holding';
			}
		} catch (err) {
			error = 'Failed to update holding';
			console.error(err);
		}
	}

	async function deleteHolding(id: string) {
		if (!auth.isAuthenticated || !auth.accessToken) return;

		error = null;

		try {
			const response = await api.deletePortfolioHolding(auth.accessToken, id);
			if (response.success) {
				holdings = holdings.filter((h) => h.id !== id);
			} else {
				error = response.error?.message || 'Failed to delete holding';
			}
		} catch (err) {
			error = 'Failed to delete holding';
			console.error(err);
		}
	}

	function getGainLoss(holding: Holding): { gain: number; gainPercent: number } | null {
		const quote = quotes[holding.ticker];
		if (!quote) return null;

		const currentValue = holding.shares * quote.price;
		const costValue = holding.shares * holding.costBasis;
		const gain = currentValue - costValue;
		const gainPercent = (gain / costValue) * 100;

		return { gain, gainPercent };
	}

	onMount(() => {
		if (auth.isAuthenticated) {
			loadPortfolio();
		}
	});
</script>

<svelte:head>
	<title>Portfolio - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">Portfolio Holdings</h1>

		{#if !auth.isAuthenticated}
			<div class="portfolio-card">
				<p class="text-center py-8">
					<a href="/auth/login" class="auth-link">Sign in</a> to track your portfolio holdings.
				</p>
			</div>
		{:else}
			<!-- Portfolio Summary -->
			{#if holdings.length > 0}
				<div class="summary-cards">
					<div class="summary-card">
						<span class="summary-label">Market Value</span>
						<span class="summary-value">{formatCurrency(portfolioSummary.totalValue)}</span>
					</div>
					<div class="summary-card">
						<span class="summary-label">Total P&L</span>
						<span
							class="summary-value {portfolioSummary.totalGain >= 0 ? 'price-positive' : 'price-negative'}"
						>
							{portfolioSummary.totalGain >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalGain)}
							<span class="summary-subtext">
								({portfolioSummary.totalGainPercent >= 0 ? '+' : ''}{formatPercent(portfolioSummary.totalGainPercent)})
							</span>
						</span>
					</div>
					<div class="summary-card">
						<span class="summary-label">Day's Change</span>
						<span
							class="summary-value {portfolioSummary.dayChange >= 0 ? 'price-positive' : 'price-negative'}"
						>
							{portfolioSummary.dayChange >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.dayChange)}
							<span class="summary-subtext">
								({portfolioSummary.dayChangePercent >= 0 ? '+' : ''}{formatPercent(portfolioSummary.dayChangePercent)})
							</span>
						</span>
					</div>
					<div class="summary-card">
						<span class="summary-label">Holdings</span>
						<span class="summary-value">{holdings.length}</span>
						<span class="summary-subtext">positions</span>
					</div>
				</div>
			{/if}

			<!-- Add Holding -->
			<div class="portfolio-card">
				<h3 class="headline headline-md">Add Position</h3>

				{#if pendingAdd}
					<div class="add-form">
						<div class="add-header">
							<span class="ticker-symbol">{pendingAdd.symbol}</span>
							<span class="text-ink-muted">{pendingAdd.name}</span>
							<span class="badge">{pendingAdd.exchange}</span>
						</div>

						<div class="form-grid">
							<div class="form-group">
								<label for="shares">Shares</label>
								<input
									id="shares"
									type="number"
									step="any"
									min="0"
									bind:value={addShares}
									placeholder="100"
									class="input"
								/>
							</div>
							<div class="form-group">
								<label for="cost-basis">Cost Basis (per share)</label>
								<input
									id="cost-basis"
									type="number"
									step="0.01"
									min="0"
									bind:value={addCostBasis}
									placeholder="150.00"
									class="input"
								/>
							</div>
							<div class="form-group">
								<label for="purchase-date">Purchase Date</label>
								<input id="purchase-date" type="date" bind:value={addPurchaseDate} class="input" />
							</div>
							<div class="form-group full-width">
								<label for="notes">Notes</label>
								<input
									id="notes"
									type="text"
									bind:value={addNotes}
									placeholder="Long-term hold..."
									class="input"
									maxlength="200"
								/>
							</div>
						</div>

						<div class="form-actions">
							<button class="btn btn-primary" onclick={confirmAdd}>Add Position</button>
							<button class="btn" onclick={cancelAdd}>Cancel</button>
						</div>
					</div>
				{:else}
					<SearchAutocomplete
						placeholder="Search for a stock to add..."
						onSelect={handleSelectStock}
						compact
					/>
				{/if}

				{#if error}
					<p class="text-loss text-sm mt-2">{error}</p>
				{/if}
			</div>

			<!-- Allocation Chart & Performance Insights Row -->
			{#if holdings.length > 0 && !loading}
				<div class="insights-row">
					<!-- Portfolio Allocation -->
					<div class="portfolio-card insights-card">
						<h3 class="card-title">Portfolio Allocation</h3>
						<div class="allocation-chart">
							{#each topAllocations as alloc (alloc.ticker)}
								<div class="alloc-row">
									<div class="alloc-info">
										{#if alloc.ticker !== 'Other'}
											<img
												src={getCompanyLogoUrl(alloc.ticker)}
												alt=""
												class="alloc-logo"
												loading="lazy"
												onerror={(e) => {
													(e.currentTarget as HTMLImageElement).style.display = 'none';
												}}
											/>
										{/if}
										<span class="alloc-ticker">{alloc.ticker}</span>
									</div>
									<div class="alloc-bar-container">
										<div class="alloc-bar" style="width: {alloc.percent}%"></div>
									</div>
									<span class="alloc-percent">{alloc.percent.toFixed(1)}%</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Performance Insights -->
					<div class="portfolio-card insights-card">
						<h3 class="card-title">Performance Insights</h3>
						<div class="performers-grid">
							<div class="performer-section">
								<h4 class="performer-title price-positive">Top Performers</h4>
								{#if performers.top.length > 0}
									{#each performers.top as perf, i (perf.ticker)}
										<div class="performer-row">
											<span class="performer-rank">{i + 1}.</span>
											<a href="/ticker/{perf.ticker}" class="performer-ticker">{perf.ticker}</a>
											<span class="performer-gain price-positive">
												+{formatPercent(perf.gainPercent)}
											</span>
										</div>
									{/each}
								{:else}
									<p class="no-performers">No data yet</p>
								{/if}
							</div>
							<div class="performer-section">
								<h4 class="performer-title price-negative">Biggest Losers</h4>
								{#if performers.bottom.length > 0}
									{#each performers.bottom as perf, i (perf.ticker)}
										<div class="performer-row">
											<span class="performer-rank">{i + 1}.</span>
											<a href="/ticker/{perf.ticker}" class="performer-ticker">{perf.ticker}</a>
											<span class="performer-gain price-negative">
												{formatPercent(perf.gainPercent)}
											</span>
										</div>
									{/each}
								{:else}
									<p class="no-performers">No losers</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Holdings Table -->
			<div class="portfolio-card">
				<h3 class="card-title">Your Holdings</h3>
				{#if loading}
					<div class="loading-skeleton">
						{#each Array(3) as _, i (i)}
							<div class="skeleton-row"></div>
						{/each}
					</div>
				{:else if holdings.length === 0}
					<div class="empty-state">
						<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M3 3h18v18H3V3z" />
							<path d="M3 9h18" />
							<path d="M9 21V9" />
							<path d="M12 12h3" />
							<path d="M12 15h3" />
						</svg>
						<h4>Start Building Your Portfolio</h4>
						<p>Search for a stock above to add your first position</p>
					</div>
				{:else}
					<div class="table-container">
						<table class="holdings-table">
							<thead>
								<tr>
									<th>Symbol</th>
									<th class="hide-mobile">Shares</th>
									<th class="hide-mobile">Avg Cost</th>
									<th>Price</th>
									<th class="hide-mobile">Value</th>
									<th>P&L</th>
									<th class="hide-mobile">Alloc</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each holdings as holding (holding.id)}
									{@const quote = quotes[holding.ticker]}
									{@const gainLoss = getGainLoss(holding)}
									{@const alloc = allocations.find((a) => a.ticker === holding.ticker)}
									<tr>
										<td class="col-symbol">
											<a href="/ticker/{holding.ticker}" class="stock-cell">
												<img
													src={getCompanyLogoUrl(holding.ticker)}
													alt=""
													class="stock-logo"
													loading="lazy"
													onerror={(e) => {
														(e.currentTarget as HTMLImageElement).style.display = 'none';
													}}
												/>
												<span class="ticker-symbol">{holding.ticker}</span>
											</a>
											{#if holding.notes}
												<div class="holding-notes">{holding.notes}</div>
											{/if}
										</td>
										<td class="col-shares hide-mobile">
											{#if editingId === holding.id}
												<input
													type="number"
													step="any"
													min="0"
													bind:value={editShares}
													class="input input-small"
												/>
											{:else}
												{holding.shares.toLocaleString()}
											{/if}
										</td>
										<td class="col-cost hide-mobile">
											{#if editingId === holding.id}
												<input
													type="number"
													step="0.01"
													min="0"
													bind:value={editCostBasis}
													class="input input-small"
												/>
											{:else}
												{formatCurrency(holding.costBasis)}
											{/if}
										</td>
										<td class="col-price">
											{quote ? formatCurrency(quote.price) : '--'}
											{#if quote}
												<span class={getPriceClass(quote.changePercent)}>
													{formatPercent(quote.changePercent)}
												</span>
											{/if}
										</td>
										<td class="col-value hide-mobile">
											{quote ? formatCurrency(holding.shares * quote.price) : '--'}
										</td>
										<td class="col-pnl">
											{#if gainLoss}
												<span class={gainLoss.gain >= 0 ? 'price-positive' : 'price-negative'}>
													{gainLoss.gain >= 0 ? '+' : ''}{formatCurrency(gainLoss.gain)}
													<br />
													<span class="text-xs">
														({gainLoss.gainPercent >= 0 ? '+' : ''}{formatPercent(gainLoss.gainPercent)})
													</span>
												</span>
											{:else}
												--
											{/if}
										</td>
										<td class="col-alloc hide-mobile">
											{alloc ? alloc.percent.toFixed(1) + '%' : '--'}
										</td>
										<td class="col-actions">
											{#if editingId === holding.id}
												<button class="btn btn-small" onclick={saveEditing}>Save</button>
												<button class="btn btn-small" onclick={cancelEditing}>Cancel</button>
											{:else}
												<button class="btn btn-small" onclick={() => startEditing(holding)}>
													Edit
												</button>
												<button class="btn btn-small btn-danger" onclick={() => deleteHolding(holding.id)}>
													Delete
												</button>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}
	</section>
</div>

<style>
	/* Portfolio Card - Base */
	.portfolio-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.25rem;
		margin-top: 1rem;
	}

	.portfolio-card :global(.headline) {
		border-bottom: none;
		padding-bottom: 0;
		margin-bottom: 1rem;
	}

	.auth-link {
		color: var(--color-ink);
		font-weight: 600;
		text-decoration: underline;
	}

	.card-title {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		margin: 0 0 1rem 0;
	}

	/* Summary Cards */
	.summary-cards {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-top: 1rem;
	}

	.summary-card {
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1rem;
		text-align: center;
	}

	.summary-label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		margin-bottom: 0.25rem;
	}

	.summary-value {
		display: block;
		font-size: 1.125rem;
		font-weight: 700;
		font-family: var(--font-mono);
	}

	.summary-subtext {
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
	}

	/* Add Form */
	.add-form {
		padding: 1rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		border-radius: 6px;
	}

	.add-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.add-header .badge {
		font-size: 0.65rem;
		padding: 0.125rem 0.375rem;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.form-group.full-width {
		grid-column: 1 / -1;
	}

	.form-group label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.form-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	/* Round inputs and buttons */
	.portfolio-card :global(.input) {
		border-radius: 6px;
	}

	.portfolio-card :global(.btn) {
		border-radius: 6px;
	}

	/* Insights Row */
	.insights-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1rem;
	}

	.insights-card {
		margin-top: 0;
	}

	/* Allocation Chart */
	.allocation-chart {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.alloc-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.alloc-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 70px;
	}

	.alloc-logo {
		width: 20px;
		height: 20px;
		object-fit: contain;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.alloc-ticker {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.alloc-bar-container {
		flex: 1;
		height: 8px;
		background: var(--color-newsprint);
		border-radius: 4px;
		overflow: hidden;
	}

	.alloc-bar {
		height: 100%;
		background: linear-gradient(90deg, var(--color-ink) 0%, var(--color-ink-muted) 100%);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.alloc-percent {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink-muted);
		min-width: 45px;
		text-align: right;
	}

	/* Performers */
	.performers-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.performer-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.performer-title {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.25rem 0;
	}

	.performer-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
	}

	.performer-rank {
		color: var(--color-ink-muted);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		min-width: 1rem;
	}

	.performer-ticker {
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--color-ink);
		text-decoration: none;
	}

	.performer-ticker:hover {
		text-decoration: underline;
	}

	.performer-gain {
		font-family: var(--font-mono);
		font-weight: 600;
		margin-left: auto;
	}

	.no-performers {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		font-style: italic;
		margin: 0;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 2rem 1rem;
	}

	.empty-icon {
		width: 48px;
		height: 48px;
		color: var(--color-ink-muted);
		margin: 0 auto 1rem;
	}

	.empty-state h4 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		color: var(--color-ink);
	}

	.empty-state p {
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		margin: 0;
	}

	/* Loading Skeleton */
	.loading-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 0;
	}

	.skeleton-row {
		height: 48px;
		background: linear-gradient(90deg, var(--color-newsprint) 25%, var(--color-paper) 50%, var(--color-newsprint) 75%);
		background-size: 200% 100%;
		animation: skeleton-shimmer 1.5s infinite;
		border-radius: 6px;
	}

	@keyframes skeleton-shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Holdings Table */
	.table-container {
		overflow-x: auto;
	}

	.holdings-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.holdings-table th,
	.holdings-table td {
		padding: 0.75rem;
		border-bottom: 1px solid var(--color-border);
		text-align: left;
	}

	.holdings-table th {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		background: var(--color-newsprint);
	}

	.holdings-table tbody tr:hover {
		background: var(--color-newsprint);
	}

	/* Stock cell with logo */
	.stock-cell {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: inherit;
	}

	.stock-logo {
		width: 24px;
		height: 24px;
		object-fit: contain;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.stock-cell .ticker-symbol {
		font-family: var(--font-mono);
		font-weight: 700;
		color: var(--color-ink);
	}

	.stock-cell:hover .ticker-symbol {
		text-decoration: underline;
	}

	.col-shares,
	.col-cost,
	.col-price,
	.col-value,
	.col-pnl,
	.col-alloc {
		text-align: right;
	}

	.col-actions {
		text-align: right;
		white-space: nowrap;
	}

	.col-actions .btn {
		margin-left: 0.25rem;
	}

	.holding-notes {
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		font-style: italic;
		margin-top: 0.125rem;
	}

	.input-small {
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
		width: 80px;
		border-radius: 4px;
	}

	.btn-small {
		border-radius: 4px;
	}

	.btn-danger {
		color: var(--color-loss);
		border-color: var(--color-loss);
		border-radius: 4px;
	}

	.btn-danger:hover {
		background: var(--color-loss);
		color: white;
	}

	/* Mobile Responsive */
	@media (max-width: 768px) {
		.summary-cards {
			grid-template-columns: repeat(2, 1fr);
		}

		.insights-row {
			grid-template-columns: 1fr;
		}

		.performers-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.form-grid {
			grid-template-columns: 1fr;
		}

		.hide-mobile {
			display: none;
		}

		.holdings-table th,
		.holdings-table td {
			padding: 0.5rem;
			font-size: 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.summary-cards {
			grid-template-columns: 1fr;
		}

		.alloc-info {
			min-width: 50px;
		}

		.alloc-percent {
			min-width: 35px;
		}
	}
</style>
