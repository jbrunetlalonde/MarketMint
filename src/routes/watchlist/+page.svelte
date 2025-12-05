<script lang="ts">
	import { formatCurrency, formatPercent, getPriceClass } from '$lib/utils/formatters';
	import { auth } from '$lib/stores/auth.svelte';

	// Mock watchlist data
	const watchlist = [
		{ ticker: 'AAPL', name: 'Apple Inc', price: 185.92, change: 0.67, notes: 'Long-term hold' },
		{ ticker: 'NVDA', name: 'NVIDIA Corp', price: 878.35, change: 4.23, notes: 'AI play' },
		{ ticker: 'TSLA', name: 'Tesla Inc', price: 201.88, change: 1.24, notes: '' },
		{ ticker: 'MSFT', name: 'Microsoft', price: 415.50, change: -0.32, notes: 'Cloud growth' }
	];

	let newTicker = $state('');
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
					<a href="/auth/login" class="underline font-semibold">Sign in</a> to view and manage your watchlist.
				</p>
			</div>
		{:else}
			<!-- Add to Watchlist -->
			<div class="card mt-4">
				<form class="flex gap-4" onsubmit={(e) => e.preventDefault()}>
					<input
						type="text"
						bind:value={newTicker}
						placeholder="Enter ticker symbol..."
						class="input flex-1"
						maxlength="5"
					/>
					<button type="submit" class="btn btn-primary">Add</button>
				</form>
			</div>

			<!-- Watchlist Table -->
			<div class="card mt-4">
				{#if watchlist.length === 0}
					<p class="text-center py-8 text-ink-muted">
						Your watchlist is empty. Add tickers above to start tracking.
					</p>
				{:else}
					<table class="data-table">
						<thead>
							<tr>
								<th>Symbol</th>
								<th>Price</th>
								<th>Change</th>
								<th>Notes</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each watchlist as stock (stock.ticker)}
								<tr>
									<td>
										<a href="/ticker/{stock.ticker}" class="ticker-symbol">
											{stock.ticker}
										</a>
										<div class="text-xs text-ink-muted">{stock.name}</div>
									</td>
									<td class="font-semibold">{formatCurrency(stock.price)}</td>
									<td class={getPriceClass(stock.change)}>
										{formatPercent(stock.change)}
									</td>
									<td class="text-ink-muted text-sm">{stock.notes || '-'}</td>
									<td>
										<button class="btn btn-small">Remove</button>
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
