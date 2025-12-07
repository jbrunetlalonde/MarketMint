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
		loading?: boolean;
		limit?: number;
	}

	let { holders, loading = false, limit = 10 }: Props = $props();

	const displayHolders = $derived(holders.slice(0, limit));
	const totalShares = $derived(holders.reduce((sum, h) => sum + h.shares, 0));
</script>

<div class="institutional-owners">
	<div class="section-header">
		<h3 class="section-title">Institutional Ownership</h3>
		{#if holders.length > 0}
			<span class="holder-count">{holders.length} institutions</span>
		{/if}
	</div>

	{#if loading}
		<div class="loading">Loading institutional data...</div>
	{:else if holders.length === 0}
		<EmptyState
			title="No institutional ownership data"
			description="Smaller companies may not have reportable institutional holdings."
			compact
		/>
	{:else}
		<div class="content">
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

	.loading,
	.empty {
		padding: 2rem;
		text-align: center;
		color: var(--color-ink-muted);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
	}

	.content {
		padding: 0;
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
