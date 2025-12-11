<script lang="ts">
	import { formatCurrency, formatCompact, formatDate } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	interface InsiderTrade {
		id?: number;
		symbol?: string;
		reporterName: string;
		reporterTitle?: string;
		transactionType: string;
		transactionDate: string;
		filingDate?: string;
		sharesTransacted: number;
		sharePrice?: number;
		totalValue?: number;
		sharesOwned?: number;
	}

	interface Props {
		trades: InsiderTrade[];
		loading?: boolean;
		limit?: number;
		ticker?: string;
	}

	let { trades, loading = false, limit = 8, ticker }: Props = $props();

	const displayTrades = $derived(trades.slice(0, limit));

	function getTransactionClass(type: string): string {
		const t = type.toLowerCase();
		if (t.includes('purchase') || t.includes('buy') || t === 'p') return 'buy';
		if (t.includes('sale') || t.includes('sell') || t === 's') return 'sell';
		return '';
	}

	function getTransactionLabel(type: string): string {
		const t = type.toLowerCase();
		if (t.includes('purchase') || t.includes('buy') || t === 'p') return 'BUY';
		if (t.includes('sale') || t.includes('sell') || t === 's') return 'SELL';
		if (t.includes('grant') || t.includes('award')) return 'GRANT';
		if (t.includes('exercise')) return 'EXERCISE';
		return type.toUpperCase().slice(0, 8);
	}

	function truncateTitle(title: string | undefined, maxLength = 30): string {
		if (!title) return 'Insider';
		if (title.length <= maxLength) return title;
		return title.slice(0, maxLength).trim() + '...';
	}
</script>

<div class="insider-trades">
	<div class="section-header">
		<h3 class="section-title">Insider Trading</h3>
		{#if trades.length > 0}
			<span class="trade-count">{trades.length} transactions</span>
		{/if}
	</div>

	{#if loading}
		<div class="loading">
			{#each Array(4) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if trades.length === 0}
		<EmptyState
			title="No insider trades"
			description="No recent insider trading activity for {ticker || 'this stock'}."
			compact
		/>
	{:else}
		<div class="trades-table">
			<table>
				<thead>
					<tr>
						<th class="col-insider">Insider</th>
						<th class="col-type">Type</th>
						<th class="col-shares">Shares</th>
						<th class="col-value">Value</th>
						<th class="col-date">Date</th>
					</tr>
				</thead>
				<tbody>
					{#each displayTrades as trade (trade.id || `${trade.reporterName}-${trade.transactionDate}`)}
						<tr>
							<td class="col-insider">
								<div class="insider-info">
									<span class="insider-name">{trade.reporterName}</span>
									<span class="insider-title">{truncateTitle(trade.reporterTitle)}</span>
								</div>
							</td>
							<td class="col-type">
								<span class="transaction-badge {getTransactionClass(trade.transactionType)}">
									{getTransactionLabel(trade.transactionType)}
								</span>
							</td>
							<td class="col-shares">
								{formatCompact(Math.abs(trade.sharesTransacted))}
							</td>
							<td class="col-value">
								{#if trade.totalValue}
									{formatCompact(Math.abs(trade.totalValue))}
								{:else if trade.sharePrice && trade.sharesTransacted}
									{formatCompact(Math.abs(trade.sharePrice * trade.sharesTransacted))}
								{:else}
									--
								{/if}
							</td>
							<td class="col-date">
								{formatDate(trade.transactionDate)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if trades.length > limit}
			<div class="more-trades">
				+{trades.length - limit} more transactions
			</div>
		{/if}
	{/if}
</div>

<style>
	.insider-trades {
		border: 1px solid var(--color-border);
		background: var(--color-paper);
	}

	.section-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-newsprint-dark);
		display: flex;
		justify-content: space-between;
		align-items: center;
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

	.trade-count {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.loading {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-row {
		height: 2.5rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.trades-table {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
	}

	th {
		padding: 0.5rem 0.75rem;
		text-align: left;
		font-weight: 600;
		color: var(--color-ink-muted);
		border-bottom: 1px solid var(--color-border);
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	td {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background: var(--color-newsprint-dark);
	}

	.col-shares,
	.col-value {
		text-align: right;
	}

	th.col-shares,
	th.col-value {
		text-align: right;
	}

	.col-date {
		white-space: nowrap;
	}

	.insider-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.insider-name {
		font-weight: 500;
		color: var(--color-ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 150px;
	}

	.insider-title {
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.transaction-badge {
		display: inline-block;
		padding: 2px 6px;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		border-radius: 2px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.transaction-badge.buy {
		background: rgba(13, 122, 62, 0.15);
		color: var(--color-gain);
	}

	.transaction-badge.sell {
		background: rgba(196, 30, 58, 0.15);
		color: var(--color-loss);
	}

	.more-trades {
		padding: 0.75rem;
		text-align: center;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		border-top: 1px solid var(--color-border);
	}
</style>
