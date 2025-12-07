<script lang="ts">
	import { onMount } from 'svelte';
	import { formatCurrency, formatPercent, getPriceClass } from '$lib/utils/formatters';
	import { auth } from '$lib/stores/auth.svelte';
	import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
	import api from '$lib/utils/api';

	interface WatchlistItem {
		id: string;
		ticker: string;
		notes: string;
		added_at: string;
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

	let watchlist = $state<WatchlistItem[]>([]);
	let quotes = $state<Record<string, QuoteData>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);

	// For adding new stock with notes
	let pendingAdd = $state<PendingAdd | null>(null);
	let pendingNotes = $state('');

	// For editing existing notes
	let editingTicker = $state<string | null>(null);
	let editingNotes = $state('');

	async function loadWatchlist() {
		if (!auth.isAuthenticated || !auth.accessToken) return;

		loading = true;
		error = null;
		try {
			const response = await api.getWatchlist(auth.accessToken);
			if (response.success && response.data) {
				watchlist = response.data;

				// Fetch quotes for all tickers
				if (watchlist.length > 0) {
					const tickers = watchlist.map((item) => item.ticker);
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
			error = 'Failed to load watchlist';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	function handleSelectStock(result: { symbol: string; name: string; exchange: string }) {
		pendingAdd = result;
		pendingNotes = '';
		error = null;
	}

	function cancelAdd() {
		pendingAdd = null;
		pendingNotes = '';
	}

	async function confirmAdd() {
		if (!auth.isAuthenticated || !auth.accessToken || !pendingAdd) return;

		error = null;
		try {
			const response = await api.addToWatchlist(auth.accessToken, pendingAdd.symbol, pendingNotes || undefined);
			if (response.success) {
				pendingAdd = null;
				pendingNotes = '';
				await loadWatchlist();
			} else {
				error = response.error?.message || 'Failed to add ticker';
			}
		} catch (err) {
			error = 'Failed to add ticker';
			console.error(err);
		}
	}

	function startEditing(stock: WatchlistItem) {
		editingTicker = stock.ticker;
		editingNotes = stock.notes || '';
	}

	function cancelEditing() {
		editingTicker = null;
		editingNotes = '';
	}

	async function saveNotes() {
		if (!auth.isAuthenticated || !auth.accessToken || !editingTicker) return;

		error = null;
		try {
			const response = await api.updateWatchlistNotes(auth.accessToken, editingTicker, editingNotes);
			if (response.success && response.data) {
				// Update local state
				watchlist = watchlist.map((item) =>
					item.ticker === editingTicker ? { ...item, notes: response.data!.notes } : item
				);
				editingTicker = null;
				editingNotes = '';
			} else {
				error = response.error?.message || 'Failed to update notes';
			}
		} catch (err) {
			error = 'Failed to update notes';
			console.error(err);
		}
	}

	async function handleRemoveTicker(ticker: string) {
		if (!auth.isAuthenticated || !auth.accessToken) return;

		error = null;
		try {
			const response = await api.removeFromWatchlist(auth.accessToken, ticker);
			if (response.success) {
				watchlist = watchlist.filter((item) => item.ticker !== ticker);
			} else {
				error = response.error?.message || 'Failed to remove ticker';
			}
		} catch (err) {
			error = 'Failed to remove ticker';
			console.error(err);
		}
	}

	onMount(() => {
		if (auth.isAuthenticated) {
			loadWatchlist();
		}
	});
</script>

<svelte:head>
	<title>Watchlist - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">Your Watchlist</h1>

		{#if !auth.isAuthenticated}
			<div class="card mt-4">
				<p class="text-center py-8">
					<a href="/auth/login" class="underline font-semibold">Sign in</a> to view and manage your
					watchlist.
				</p>
			</div>
		{:else}
			<!-- Add to Watchlist -->
			<div class="card mt-4">
				<h3 class="headline headline-md">Add to Watchlist</h3>

				{#if pendingAdd}
					<!-- Confirm add with optional notes -->
					<div class="pending-add">
						<div class="pending-stock">
							<span class="ticker-symbol">{pendingAdd.symbol}</span>
							<span class="text-ink-muted">{pendingAdd.name}</span>
							<span class="badge">{pendingAdd.exchange}</span>
						</div>
						<div class="mt-3">
							<label for="notes-input" class="byline block mb-1">Notes (optional)</label>
							<input
								id="notes-input"
								type="text"
								bind:value={pendingNotes}
								placeholder="e.g., Long-term hold, AI play, Watching for entry..."
								class="input"
								maxlength="200"
							/>
						</div>
						<div class="flex gap-2 mt-3">
							<button class="btn btn-primary" onclick={confirmAdd}>Add to Watchlist</button>
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

			<!-- Watchlist Table -->
			<div class="card mt-4">
				{#if loading}
					<div class="animate-pulse space-y-3 py-4">
						{#each Array(3) as _, i (i)}
							<div class="h-10 bg-gray-200 rounded"></div>
						{/each}
					</div>
				{:else if watchlist.length === 0}
					<p class="text-center py-8 text-ink-muted">
						Your watchlist is empty. Search for a stock above to start tracking.
					</p>
				{:else}
					<table class="watchlist-table">
						<thead>
							<tr>
								<th class="col-symbol">Symbol</th>
								<th class="col-price">Price</th>
								<th class="col-change">Change</th>
								<th class="col-notes">Notes</th>
								<th class="col-actions">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each watchlist as stock (stock.ticker)}
								{@const quote = quotes[stock.ticker]}
								<tr>
									<td class="col-symbol">
										<a href="/ticker/{stock.ticker}" class="ticker-symbol">
											{stock.ticker}
										</a>
									</td>
									<td class="col-price font-semibold">
										{quote ? formatCurrency(quote.price) : '--'}
									</td>
									<td class="col-change {quote ? getPriceClass(quote.changePercent) : 'price-neutral'}">
										{quote ? formatPercent(quote.changePercent) : '--'}
									</td>
									<td class="col-notes">
										{#if editingTicker === stock.ticker}
											<div class="inline-edit">
												<input
													type="text"
													bind:value={editingNotes}
													class="input input-small"
													placeholder="Add notes..."
													maxlength="200"
												/>
												<button class="btn btn-small" onclick={saveNotes}>Save</button>
												<button class="btn btn-small" onclick={cancelEditing}>Cancel</button>
											</div>
										{:else}
											<span class="notes-text">{stock.notes || 'No notes'}</span>
											<button
												class="edit-btn"
												onclick={() => startEditing(stock)}
												title="Edit notes"
											>
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
													<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
												</svg>
											</button>
										{/if}
									</td>
									<td class="col-actions">
										<button class="btn btn-small btn-danger" onclick={() => handleRemoveTicker(stock.ticker)}>
											Remove
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		{/if}
	</section>
</div>

<style>
	.pending-add {
		padding: 1rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
	}

	.pending-stock {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.pending-stock .badge {
		font-size: 0.65rem;
		padding: 0.125rem 0.375rem;
		background: var(--color-newsprint-dark);
	}

	/* Watchlist Table - Improved Layout */
	.watchlist-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.watchlist-table th,
	.watchlist-table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
		text-align: left;
	}

	.watchlist-table th {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		background: var(--color-newsprint);
	}

	.watchlist-table tbody tr:hover {
		background: var(--color-newsprint);
	}

	/* Column Widths & Alignment */
	.watchlist-table .col-symbol {
		width: 15%;
	}

	.watchlist-table .col-price {
		width: 15%;
		text-align: right;
	}

	.watchlist-table .col-change {
		width: 12%;
		text-align: right;
	}

	.watchlist-table .col-notes {
		width: 43%;
		text-align: left;
	}

	.watchlist-table .col-actions {
		width: 15%;
		text-align: right;
	}

	/* Notes styling */
	.notes-text {
		color: var(--color-ink-muted);
		font-size: 0.8rem;
		font-style: italic;
	}

	.col-notes:has(.notes-text:not(:empty)) .notes-text {
		font-style: normal;
		color: var(--color-ink-light);
	}

	.inline-edit {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.inline-edit .input-small {
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
		flex: 1;
		min-width: 0;
	}

	.edit-btn {
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s ease;
		vertical-align: middle;
		margin-left: 0.5rem;
	}

	.edit-btn svg {
		width: 0.875rem;
		height: 0.875rem;
		color: var(--color-ink-muted);
	}

	.edit-btn:hover svg {
		color: var(--color-ink);
	}

	tr:hover .edit-btn {
		opacity: 1;
	}

	/* Danger button variant */
	.btn-danger {
		color: var(--color-loss);
		border-color: var(--color-loss);
	}

	.btn-danger:hover {
		background: var(--color-loss);
		color: white;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.watchlist-table .col-symbol,
		.watchlist-table .col-price,
		.watchlist-table .col-change,
		.watchlist-table .col-notes,
		.watchlist-table .col-actions {
			width: auto;
		}

		.watchlist-table th,
		.watchlist-table td {
			padding: 0.5rem;
			font-size: 0.8rem;
		}

		.inline-edit {
			flex-wrap: wrap;
		}
	}
</style>
