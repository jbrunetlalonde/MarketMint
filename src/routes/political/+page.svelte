<script lang="ts">
	import { formatDate } from '$lib/utils/formatters';
	import api from '$lib/utils/api';
	import PoliticalTradeCard from '$lib/components/PoliticalTradeCard.svelte';
	import { getPortraitUrl as getPortrait, getCongressPortraitUrl } from '$lib/utils/urls';

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

	let trades = $state<PoliticalTrade[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let filterParty = $state('all');
	let filterType = $state('all');
	let filterTicker = $state('');
	let viewMode = $state<'table' | 'cards'>('cards');

	const filteredTrades = $derived.by(() => {
		let result = trades;

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

		return result;
	});

	async function fetchTrades() {
		loading = true;
		error = null;

		try {
			const response = await api.getPoliticalTrades({ limit: 100 });
			if (response.success && response.data) {
				trades = response.data;
			} else {
				error = 'Failed to load political trades';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load trades';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		fetchTrades();
	});

	function getPartyAbbrev(party?: string | null): string {
		if (!party) return '?';
		const p = party.toLowerCase();
		if (p.includes('democrat')) return 'D';
		if (p.includes('republican')) return 'R';
		return party.charAt(0).toUpperCase();
	}

	function getChamberLabel(title?: string | null): string {
		if (!title) return '';
		const t = title.toLowerCase();
		if (t.includes('senator')) return 'Senator';
		if (t.includes('representative')) return 'Rep.';
		return title;
	}

	function getPortraitUrl(name: string, title?: string | null): string {
		const chamber = title?.toLowerCase().includes('senator') ? 'senate' : 'house';
		return getCongressPortraitUrl(name, chamber);
	}
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
			<div class="flex gap-4 flex-wrap items-end">
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
	</section>

	<!-- Loading State -->
	{#if loading && trades.length === 0}
		<section class="col-span-full">
			<div class="card text-center py-8">
				<p class="text-ink-muted">Loading congressional trades...</p>
			</div>
		</section>
	{:else if error}
		<section class="col-span-full">
			<div class="card text-center py-8">
				<p class="text-red-600 mb-4">{error}</p>
				<button onclick={fetchTrades} class="btn btn-primary">Try Again</button>
			</div>
		</section>
	{:else}
		<!-- Trades Display -->
		<section class="col-span-full">
			{#if filteredTrades.length === 0}
				<div class="card text-center py-8">
					<p class="text-ink-muted">No trades found matching your filters.</p>
				</div>
			{:else if viewMode === 'cards'}
				<!-- Card View -->
				<div class="grid gap-4 md:grid-cols-2">
					{#each filteredTrades as trade (trade.id)}
						<PoliticalTradeCard {trade} />
					{/each}
				</div>
			{:else}
				<!-- Table View -->
				<div class="card overflow-x-auto">
					<table class="data-table">
						<thead>
							<tr>
								<th>Official</th>
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
										<div class="flex items-center gap-3">
											<img
												src={trade.portraitUrl ? getPortrait(trade.portraitUrl) : getPortraitUrl(trade.officialName, trade.title)}
												alt={trade.officialName}
												class="w-10 h-12 object-contain border border-ink-light bg-newsprint flex-shrink-0"
												onerror={(e) => e.currentTarget.style.display = 'none'}
											/>
											<div>
												<a href="/political/member/{encodeURIComponent(trade.officialName)}" class="font-semibold hover:underline">{trade.officialName}</a>
												<div class="text-xs text-ink-muted">
													{getChamberLabel(trade.title)}
													{#if trade.party || trade.state}
														({getPartyAbbrev(trade.party)}{#if trade.state}-{trade.state}{/if})
													{/if}
												</div>
											</div>
										</div>
									</td>
									<td>
										<a href="/ticker/{trade.ticker}" class="ticker-symbol">
											{trade.ticker}
										</a>
										{#if trade.assetDescription}
											<div class="text-xs text-ink-muted truncate max-w-32">
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
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
			{#if trades.some((t) => t.isMock)}
				<p class="text-xs text-ink-muted mt-4 text-center">
					Showing sample data. Add FINNHUB_API_KEY to .env for live data.
				</p>
			{/if}
		</section>
	{/if}

	<!-- Disclaimer -->
	<section class="col-span-full">
		<p class="byline text-center mt-4">
			Data is for informational purposes only. Not financial advice.
		</p>
	</section>
</div>
