<script lang="ts">
	import { formatCurrency, formatPercent, formatCompact } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	interface PeerQuote {
		ticker: string;
		price?: number;
		change?: number;
		changePercent?: number;
		marketCap?: number;
	}

	interface Props {
		peers: string[];
		quotes?: Record<string, PeerQuote>;
		currentTicker: string;
		loading?: boolean;
	}

	let { peers, quotes = {}, currentTicker, loading = false }: Props = $props();

	const displayPeers = $derived(peers.filter((p) => p !== currentTicker).slice(0, 8));
</script>

<div class="sector-peers">
	<div class="section-header">
		<h3 class="section-title">Sector Peers</h3>
	</div>

	{#if loading}
		<div class="loading">Loading peer data...</div>
	{:else if peers.length === 0}
		<EmptyState
			title="No peer companies found"
			description="Unable to find companies in the same sector."
			compact
		/>
	{:else}
		<div class="content">
			<div class="peers-grid">
				{#each displayPeers as peer (peer)}
					{@const quote = quotes[peer]}
					<a href="/ticker/{peer}" class="peer-card">
						<div class="peer-ticker">{peer}</div>
						{#if quote}
							<div class="peer-price">
								{quote.price ? formatCurrency(quote.price) : '--'}
							</div>
							{#if quote.changePercent !== undefined}
								<div
									class="peer-change"
									class:positive={quote.changePercent > 0}
									class:negative={quote.changePercent < 0}
								>
									{formatPercent(quote.changePercent)}
								</div>
							{/if}
							{#if quote.marketCap}
								<div class="peer-cap">{formatCompact(quote.marketCap)}</div>
							{/if}
						{:else}
							<div class="peer-price muted">--</div>
						{/if}
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.sector-peers {
		border: 1px solid var(--color-border);
		background: var(--color-paper);
	}

	.section-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-newsprint-dark);
	}

	.section-title {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
		color: var(--color-ink);
	}

	.loading,
	.empty {
		padding: 2rem;
		text-align: center;
		color: var(--color-ink-muted);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
	}

	.content {
		padding: 0.75rem;
	}

	.peers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 0.5rem;
	}

	.peer-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.75rem 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-paper);
		text-decoration: none;
		transition: background-color 0.15s ease;
	}

	.peer-card:hover {
		background: var(--color-newsprint-dark);
	}

	.peer-ticker {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.peer-price {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--color-ink);
		margin-top: 4px;
	}

	.peer-price.muted {
		color: var(--color-ink-muted);
	}

	.peer-change {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		padding: 1px 4px;
		border-radius: 2px;
		margin-top: 2px;
	}

	.peer-change.positive {
		color: var(--color-gain);
		background: rgba(13, 122, 62, 0.1);
	}

	.peer-change.negative {
		color: var(--color-loss);
		background: rgba(196, 30, 58, 0.1);
	}

	.peer-cap {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5rem;
		color: var(--color-ink-muted);
		margin-top: 2px;
	}
</style>
