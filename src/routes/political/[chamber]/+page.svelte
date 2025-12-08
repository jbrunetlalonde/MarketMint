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

	let { data }: { data: PageData } = $props();
	const { config } = data;

	let trades = $state<PoliticalTrade[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let filterParty = $state('all');
	let filterType = $state('all');
	let filterTicker = $state('');
	let viewMode = $state<'table' | 'cards'>('cards');

	function matchesChamber(title: string | null | undefined): boolean {
		if (!title) return false;
		const lower = title.toLowerCase();
		return config.titleFilter.some((filter) => lower.includes(filter));
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

		return result;
	});

	const stats = $derived.by(() => {
		const chamberTrades = trades.filter((t) => matchesChamber(t.title));
		if (chamberTrades.length === 0) return null;

		const buyCount = chamberTrades.filter((t) => t.transactionType === 'BUY').length;
		const sellCount = chamberTrades.filter((t) => t.transactionType === 'SELL').length;

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
			topTraders: sortedTraders,
			topStocks: sortedStocks
		};
	});

	async function fetchTrades() {
		loading = true;
		error = null;

		try {
			const response = await api.getPoliticalTrades({ chamber: config.chamber, limit: 200 });
			if (response.success && response.data) {
				trades = response.data;
			} else {
				error = `Failed to load ${config.title} trades`;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load trades';
		} finally {
			loading = false;
		}
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

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">{config.pageTitle}</h1>
		<p class="text-ink-muted mt-2">{config.description}</p>
	</section>

	{#if stats}
		<section class="col-span-4">
			<div class="card">
				<h2 class="headline headline-md mb-4">{config.chamber === 'house' ? 'House' : 'Senate'} Stats</h2>
				<div class="stats-grid">
					<div class="stat-box">
						<p class="text-2xl font-bold">{stats.totalTrades}</p>
						<p class="text-xs text-ink-muted">Total Trades</p>
					</div>
					<div class="stat-box">
						<p class="text-2xl font-bold text-emerald-600">{stats.buyCount}</p>
						<p class="text-xs text-ink-muted">Buys</p>
					</div>
					<div class="stat-box">
						<p class="text-2xl font-bold text-red-600">{stats.sellCount}</p>
						<p class="text-xs text-ink-muted">Sells</p>
					</div>
				</div>

				{#if stats.topTraders.length > 0}
					<h3 class="byline mt-4 mb-2">Most Active {config.titlePlural}</h3>
					<div class="space-y-1">
						{#each stats.topTraders as [name, count] (name)}
							<a
								href="/political/member/{encodeURIComponent(name)}"
								class="stat-row"
							>
								<span class="text-sm truncate">{name}</span>
								<span class="badge">{count}</span>
							</a>
						{/each}
					</div>
				{/if}

				{#if stats.topStocks.length > 0}
					<h3 class="byline mt-4 mb-2">Most Traded Stocks</h3>
					<div class="space-y-1">
						{#each stats.topStocks as [ticker, count] (ticker)}
							<a
								href="/ticker/{ticker}"
								class="stat-row"
							>
								<span class="ticker-symbol">{ticker}</span>
								<span class="badge">{count}</span>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<section class={stats ? 'col-span-8' : 'col-span-full'}>
		<div class="card mb-4">
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

		{#if loading && trades.length === 0}
			<div class="card text-center py-8">
				<p class="text-ink-muted">Loading {config.chamber === 'house' ? 'House' : 'Senate'} trades...</p>
			</div>
		{:else if error}
			<div class="card text-center py-8">
				<p class="text-red-600 mb-4">{error}</p>
				<button onclick={fetchTrades} class="btn btn-primary">Try Again</button>
			</div>
		{:else if filteredTrades.length === 0}
			<div class="card text-center py-8">
				<p class="text-ink-muted">No {config.chamber === 'house' ? 'House' : 'Senate'} trades found matching your filters.</p>
			</div>
		{:else if viewMode === 'cards'}
			<div class="grid gap-4 md:grid-cols-2">
				{#each filteredTrades as trade (trade.id)}
					<PoliticalTradeCard {trade} />
				{/each}
			</div>
		{:else}
			<div class="card overflow-x-auto">
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
									<div class="flex items-center gap-3">
										<img
											src={getPortraitUrl(trade.officialName)}
											alt={trade.officialName}
											class="w-10 h-12 object-contain border border-ink-light bg-newsprint flex-shrink-0"
											loading="lazy"
											decoding="async"
											onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'}
										/>
										<div>
											<a href="/political/member/{encodeURIComponent(trade.officialName)}" class="font-semibold hover:underline">{trade.officialName}</a>
											<div class="text-xs text-ink-muted">
												{getPartyAbbrev(trade.party)}{#if trade.state}-{trade.state}{/if}
											</div>
										</div>
									</div>
								</td>
								<td>
									<a href="/ticker/{trade.ticker}" class="ticker-symbol">
										{trade.ticker}
									</a>
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
	</section>

</div>

<style>
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

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
		text-decoration: none;
		color: inherit;
		transition: background-color 0.15s;
	}

	.stat-row:hover {
		background-color: var(--color-newsprint, #f5f5f0);
	}

	[data-theme="dark"] .stat-row {
		background-color: var(--color-newsprint-dark, #1e1e1e);
		border-color: var(--color-border, #3d3d3d);
	}

	[data-theme="dark"] .stat-row:hover {
		background-color: #2a2a2a;
	}
</style>
