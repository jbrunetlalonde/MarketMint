<script lang="ts">
	import { formatCurrency, formatDate } from '$lib/utils/formatters';

	// Mock political trades data
	const politicalTrades = [
		{
			id: 1,
			official: 'Nancy Pelosi',
			title: 'Representative',
			party: 'D',
			state: 'CA',
			ticker: 'NVDA',
			type: 'BUY',
			amount: '$1,000,001 - $5,000,000',
			transactionDate: '2024-01-15',
			reportedDate: '2024-01-30'
		},
		{
			id: 2,
			official: 'Tommy Tuberville',
			title: 'Senator',
			party: 'R',
			state: 'AL',
			ticker: 'MSFT',
			type: 'SELL',
			amount: '$100,001 - $250,000',
			transactionDate: '2024-01-10',
			reportedDate: '2024-01-25'
		},
		{
			id: 3,
			official: 'Dan Crenshaw',
			title: 'Representative',
			party: 'R',
			state: 'TX',
			ticker: 'AAPL',
			type: 'BUY',
			amount: '$15,001 - $50,000',
			transactionDate: '2024-01-08',
			reportedDate: '2024-01-22'
		}
	];

	let filterParty = $state('all');
	let filterType = $state('all');
</script>

<svelte:head>
	<title>Congress Trades - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">Congress Trading Activity</h1>
		<p class="text-ink-muted mt-2">
			Track stock trades made by members of Congress. Data sourced from public STOCK Act filings.
		</p>
	</section>

	<!-- Filters -->
	<section class="col-span-full">
		<div class="card">
			<div class="flex gap-4 flex-wrap">
				<div>
					<label for="filter-party" class="byline block mb-1">Party</label>
					<select id="filter-party" bind:value={filterParty} class="input">
						<option value="all">All Parties</option>
						<option value="D">Democrat</option>
						<option value="R">Republican</option>
					</select>
				</div>
				<div>
					<label for="filter-type" class="byline block mb-1">Transaction Type</label>
					<select id="filter-type" bind:value={filterType} class="input">
						<option value="all">All Types</option>
						<option value="BUY">Buy</option>
						<option value="SELL">Sell</option>
					</select>
				</div>
			</div>
		</div>
	</section>

	<!-- Trades Table -->
	<section class="col-span-full">
		<div class="card">
			<table class="data-table">
				<thead>
					<tr>
						<th>Official</th>
						<th>Ticker</th>
						<th>Type</th>
						<th>Amount</th>
						<th>Transaction Date</th>
						<th>Reported</th>
					</tr>
				</thead>
				<tbody>
					{#each politicalTrades as trade (trade.id)}
						<tr>
							<td>
								<div class="font-semibold">{trade.official}</div>
								<div class="text-xs text-ink-muted">
									{trade.title} ({trade.party}-{trade.state})
								</div>
							</td>
							<td>
								<a href="/ticker/{trade.ticker}" class="ticker-symbol">
									{trade.ticker}
								</a>
							</td>
							<td>
								<span class={trade.type === 'BUY' ? 'badge badge-gain' : 'badge badge-loss'}>
									{trade.type}
								</span>
							</td>
							<td class="font-semibold">{trade.amount}</td>
							<td>{formatDate(trade.transactionDate)}</td>
							<td class="text-ink-muted">{formatDate(trade.reportedDate)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Disclaimer -->
	<section class="col-span-full">
		<p class="byline text-center mt-4">
			Data is for informational purposes only. Not financial advice.
		</p>
	</section>
</div>
