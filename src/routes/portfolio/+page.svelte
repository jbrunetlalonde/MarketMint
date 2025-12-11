<script lang="ts">
	import { onMount } from 'svelte';
	import { formatCurrency, formatPercent, getPriceClass } from '$lib/utils/formatters';
	import { auth } from '$lib/stores/auth.svelte';
	import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
	import api from '$lib/utils/api';

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

		for (const holding of holdings) {
			const quote = quotes[holding.ticker];
			totalCost += holding.shares * holding.costBasis;
			if (quote) {
				totalValue += holding.shares * quote.price;
			}
		}

		const totalGain = totalValue - totalCost;
		const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

		return { totalCost, totalValue, totalGain, totalGainPercent };
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
			<div class="card mt-4">
				<p class="text-center py-8">
					<a href="/auth/login" class="underline font-semibold">Sign in</a> to track your portfolio
					holdings.
				</p>
			</div>
		{:else}
			<!-- Portfolio Summary -->
			{#if holdings.length > 0}
				<div class="summary-cards">
					<div class="summary-card">
						<span class="summary-label">Total Cost</span>
						<span class="summary-value">{formatCurrency(portfolioSummary.totalCost)}</span>
					</div>
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
							({portfolioSummary.totalGainPercent >= 0 ? '+' : ''}{formatPercent(portfolioSummary.totalGainPercent)})
						</span>
					</div>
				</div>
			{/if}

			<!-- Add Holding -->
			<div class="card mt-4">
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

			<!-- Holdings Table -->
			<div class="card mt-4">
				{#if loading}
					<div class="animate-pulse space-y-3 py-4">
						{#each Array(3) as _, i (i)}
							<div class="h-12 bg-gray-200 rounded"></div>
						{/each}
					</div>
				{:else if holdings.length === 0}
					<p class="text-center py-8 text-ink-muted">
						No holdings yet. Search for a stock above to add your first position.
					</p>
				{:else}
					<div class="table-container">
						<table class="holdings-table">
							<thead>
								<tr>
									<th>Symbol</th>
									<th>Shares</th>
									<th>Avg Cost</th>
									<th>Price</th>
									<th>Value</th>
									<th>P&L</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each holdings as holding (holding.id)}
									{@const quote = quotes[holding.ticker]}
									{@const gainLoss = getGainLoss(holding)}
									<tr>
										<td class="col-symbol">
											<a href="/ticker/{holding.ticker}" class="ticker-symbol">
												{holding.ticker}
											</a>
											{#if holding.notes}
												<div class="holding-notes">{holding.notes}</div>
											{/if}
										</td>
										<td class="col-shares">
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
										<td class="col-cost">
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
										<td class="col-value">
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
	.summary-cards {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-top: 1rem;
	}

	.summary-card {
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		padding: 1rem;
		text-align: center;
	}

	.summary-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		margin-bottom: 0.25rem;
	}

	.summary-value {
		display: block;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.add-form {
		padding: 1rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
	}

	.add-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
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
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.form-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}

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
		font-size: 0.7rem;
		color: var(--color-ink-muted);
		background: var(--color-newsprint);
	}

	.holdings-table tbody tr:hover {
		background: var(--color-newsprint);
	}

	.col-shares,
	.col-cost,
	.col-price,
	.col-value,
	.col-pnl {
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
		font-size: 0.7rem;
		color: var(--color-ink-muted);
		font-style: italic;
		margin-top: 0.125rem;
	}

	.input-small {
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
		width: 80px;
	}

	.btn-danger {
		color: var(--color-loss);
		border-color: var(--color-loss);
	}

	.btn-danger:hover {
		background: var(--color-loss);
		color: white;
	}

	@media (max-width: 768px) {
		.summary-cards {
			grid-template-columns: 1fr;
		}

		.form-grid {
			grid-template-columns: 1fr;
		}

		.holdings-table th,
		.holdings-table td {
			padding: 0.5rem;
			font-size: 0.75rem;
		}
	}
</style>
