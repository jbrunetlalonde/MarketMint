<script lang="ts">
	import { formatCompact, formatPercent, formatDate } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	interface Holder {
		holder: string;
		shares: number;
		dateReported: string;
		change: number;
		changePercentage: number;
	}

	interface Props {
		holders: Holder[];
		sharesOutstanding?: number | null;
		loading?: boolean;
		limit?: number;
		ticker?: string;
	}

	let { holders, sharesOutstanding, loading = false, limit = 10, ticker }: Props = $props();

	const displayHolders = $derived(holders.slice(0, limit));
	const totalShares = $derived(holders.reduce((sum, h) => sum + h.shares, 0));

	// Calculate stats
	const stats = $derived.by(() => {
		if (!holders || holders.length === 0) return null;

		const netChange = holders.reduce((sum, h) => sum + (h.change || 0), 0);
		const buyers = holders.filter(h => h.change > 0).length;
		const sellers = holders.filter(h => h.change < 0).length;
		const unchanged = holders.filter(h => h.change === 0).length;

		const ownershipPercent = sharesOutstanding && sharesOutstanding > 0
			? (totalShares / sharesOutstanding) * 100
			: null;

		return {
			totalShares,
			netChange,
			buyers,
			sellers,
			unchanged,
			ownershipPercent
		};
	});
</script>

<div class="institutional-owners">
	<div class="section-header">
		<h3 class="section-title">Institutional Ownership</h3>
		{#if holders.length > 0}
			<span class="holder-count">{holders.length} institutions</span>
		{/if}
	</div>

	{#if loading}
		<div class="loading">
			<div class="skeleton-stats"></div>
			{#each Array(4) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if holders.length === 0}
		<EmptyState
			title="No institutional ownership data"
			description="Institutional holdings are not available for {ticker || 'this stock'}."
			compact
		/>
	{:else}
		<div class="content">
			<!-- Summary Stats -->
			{#if stats}
				<div class="summary-stats">
					<div class="stat">
						<span class="stat-value">{formatCompact(stats.totalShares)}</span>
						<span class="stat-label">Total Shares</span>
					</div>
					<div class="stat">
						<span class="stat-value" class:positive={stats.netChange > 0} class:negative={stats.netChange < 0}>
							{#if stats.netChange > 0}+{/if}{formatCompact(stats.netChange)}
						</span>
						<span class="stat-label">Net Change</span>
					</div>
					<div class="stat">
						<span class="stat-value buyer">{stats.buyers}</span>
						<span class="stat-label">Buying</span>
					</div>
					<div class="stat">
						<span class="stat-value seller">{stats.sellers}</span>
						<span class="stat-label">Selling</span>
					</div>
				</div>
			{/if}

			<table>
				<thead>
					<tr>
						<th class="holder-name">Holder</th>
						<th class="shares">Shares</th>
						<th class="change">Change</th>
					</tr>
				</thead>
				<tbody>
					{#each displayHolders as holder (holder.holder)}
						<tr>
							<td class="holder-name">
								<span class="name">{holder.holder}</span>
								<span class="date">Reported: {formatDate(holder.dateReported)}</span>
							</td>
							<td class="shares">
								{formatCompact(holder.shares)}
							</td>
							<td class="change">
								<span
									class="change-value"
									class:positive={holder.change > 0}
									class:negative={holder.change < 0}
								>
									{#if holder.change > 0}+{/if}{formatCompact(holder.change)}
								</span>
								<span
									class="change-percent"
									class:positive={holder.changePercentage > 0}
									class:negative={holder.changePercentage < 0}
								>
									({formatPercent(holder.changePercentage, 1)})
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			{#if holders.length > limit}
				<div class="more-holders">
					+{holders.length - limit} more institutions
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.institutional-owners {
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

	.holder-count {
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

	.skeleton-stats {
		height: 3rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		animation: pulse 1.5s infinite;
		margin-bottom: 0.5rem;
	}

	.skeleton-row {
		height: 2rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.content {
		padding: 0;
	}

	.summary-stats {
		display: flex;
		border-bottom: 1px solid var(--color-border);
	}

	.stat {
		flex: 1;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		border-right: 1px solid var(--color-border);
	}

	.stat:last-child {
		border-right: none;
	}

	.stat-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.stat-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.stat-value.buyer {
		color: var(--color-gain);
	}

	.stat-value.seller {
		color: var(--color-loss);
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
	}

	th.shares,
	th.change {
		text-align: right;
	}

	td {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	td.holder-name {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	td.shares,
	td.change {
		text-align: right;
	}

	.name {
		font-weight: 500;
		color: var(--color-ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	.date {
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.change-value {
		display: block;
	}

	.change-percent {
		font-size: 0.625rem;
	}

	.positive {
		color: var(--color-gain);
	}

	.negative {
		color: var(--color-loss);
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background: var(--color-newsprint-dark);
	}

	.more-holders {
		padding: 0.75rem;
		text-align: center;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		border-top: 1px solid var(--color-border);
	}
</style>
