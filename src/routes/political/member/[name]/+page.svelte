<script lang="ts">
	import { page } from '$app/state';
	import { formatDate, formatCurrency } from '$lib/utils/formatters';
	import { getCongressPortraitUrl } from '$lib/utils/urls';
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

	const memberName = $derived(decodeURIComponent(page.params.name || ''));

	let official = $state<Official | null>(null);
	let allTrades = $state<Trade[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

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

		return {
			totalTrades: allTrades.length,
			buyCount: buyTrades.length,
			sellCount: sellTrades.length,
			topTickers,
			latestTrade: allTrades[0]?.transactionDate || null
		};
	});

	function getPortraitUrl(name: string, title?: string | null): string {
		const chamber = title?.toLowerCase().includes('senator') ? 'senate' : 'house';
		return getCongressPortraitUrl(name, chamber);
	}

	function getPartyClass(party?: string | null): string {
		if (!party) return 'bg-gray-100 text-gray-700';
		const p = party.toLowerCase();
		if (p.includes('democrat')) return 'bg-blue-100 text-blue-800';
		if (p.includes('republican')) return 'bg-red-100 text-red-800';
		return 'bg-gray-100 text-gray-700';
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
			// Fetch official details
			const officialRes = await api.getPoliticalOfficial(memberName);
			if (officialRes.success && officialRes.data) {
				official = officialRes.data;
				allTrades = officialRes.data.recentTrades || [];
			} else {
				// Fallback: Get all trades and filter by name
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
	<!-- Back link -->
	<section class="col-span-full">
		<a href="/political" class="text-sm text-ink-muted hover:text-ink">
			&larr; Back to Congress Trades
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
				<a href="/political" class="btn btn-primary">Back to Congress Trades</a>
			</div>
		</section>
	{:else if official}
		<!-- Header with Portrait -->
		<section class="col-span-full">
			<div class="card">
				<div class="flex gap-6">
					<!-- Portrait -->
					<div class="flex-shrink-0">
						{#if !portraitError}
							<img
								src={getPortraitUrl(official.name, official.title)}
								alt={official.name}
								class="w-32 h-40 object-contain border-2 border-ink-light bg-newsprint"
								onerror={() => (portraitError = true)}
							/>
						{:else}
							<div
								class="w-32 h-40 flex items-center justify-center text-3xl font-bold border-2 border-ink-light {getPartyClass(
									official.party
								)}"
							>
								{getInitials(official.name)}
							</div>
						{/if}
					</div>

					<!-- Info -->
					<div class="flex-1">
						<div class="flex items-start justify-between">
							<div>
								<h1 class="headline headline-xl">{official.name}</h1>
								<p class="text-lg text-ink-muted mt-1">
									{official.title || 'Official'}
									{#if official.state}
										({getPartyAbbrev(official.party)}-{official.state})
									{/if}
								</p>
							</div>
							<span
								class="text-lg px-4 py-2 rounded font-bold {getPartyClass(official.party)}"
							>
								{getPartyAbbrev(official.party)}
							</span>
						</div>

						{#if stats}
							<div class="grid grid-cols-4 gap-4 mt-6">
								<div class="text-center p-3 bg-newsprint-dark rounded">
									<p class="text-2xl font-bold">{stats.totalTrades}</p>
									<p class="text-xs text-ink-muted">Total Trades</p>
								</div>
								<div class="text-center p-3 bg-newsprint-dark rounded">
									<p class="text-2xl font-bold text-blue-600">{stats.buyCount}</p>
									<p class="text-xs text-ink-muted">Buys</p>
								</div>
								<div class="text-center p-3 bg-newsprint-dark rounded">
									<p class="text-2xl font-bold text-red-600">{stats.sellCount}</p>
									<p class="text-xs text-ink-muted">Sells</p>
								</div>
								<div class="text-center p-3 bg-newsprint-dark rounded">
									<p class="text-sm font-bold">
										{stats.latestTrade ? formatDate(stats.latestTrade) : 'N/A'}
									</p>
									<p class="text-xs text-ink-muted">Latest Trade</p>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</section>

		<!-- Top Tickers -->
		{#if stats && stats.topTickers.length > 0}
			<section class="col-span-4">
				<div class="card">
					<h2 class="headline headline-md">Most Traded Stocks</h2>
					<div class="space-y-2 mt-4">
						{#each stats.topTickers as [ticker, count] (ticker)}
							<div class="flex items-center justify-between p-2 bg-newsprint-dark rounded">
								<a href="/ticker/{ticker}" class="ticker-symbol text-lg">{ticker}</a>
								<span class="badge">{count} trade{count > 1 ? 's' : ''}</span>
							</div>
						{/each}
					</div>
				</div>
			</section>
		{/if}

		<!-- Trade History -->
		<section class={stats && stats.topTickers.length > 0 ? 'col-span-8' : 'col-span-full'}>
			<div class="card">
				<h2 class="headline headline-md">Trading History</h2>

				{#if allTrades.length === 0}
					<p class="text-ink-muted py-4 text-center">No trades found for this official.</p>
				{:else}
					<div class="overflow-x-auto mt-4">
						<table class="data-table">
							<thead>
								<tr>
									<th>Ticker</th>
									<th>Type</th>
									<th>Amount</th>
									<th>Transaction</th>
									<th>Reported</th>
									<th>Gap</th>
								</tr>
							</thead>
							<tbody>
								{#each allTrades as trade (trade.id)}
									{@const gap = getReportingGapDays(trade.transactionDate, trade.reportedDate)}
									<tr>
										<td>
											<a href="/ticker/{trade.ticker}" class="ticker-symbol">
												{trade.ticker}
											</a>
											{#if trade.assetDescription}
												<div class="text-xs text-ink-muted truncate max-w-48">
													{trade.assetDescription}
												</div>
											{/if}
										</td>
										<td>
											<span
												class={trade.transactionType === 'BUY'
													? 'badge badge-gain'
													: trade.transactionType === 'SELL'
														? 'badge badge-loss'
														: 'badge'}
											>
												{trade.transactionType}
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
											class={gap !== null
												? gap > 45
													? 'text-red-600 font-semibold'
													: gap > 30
														? 'text-yellow-600'
														: 'text-ink-muted'
												: 'text-ink-muted'}
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
