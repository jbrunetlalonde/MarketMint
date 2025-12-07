<script lang="ts">
	import { formatDate } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	interface Split {
		date: string;
		label: string;
		numerator: number;
		denominator: number;
	}

	interface Props {
		splits: Split[];
		loading?: boolean;
	}

	let { splits, loading = false }: Props = $props();

	function formatRatio(num: number, denom: number): string {
		return `${num}:${denom}`;
	}

	function getSplitDescription(num: number, denom: number): string {
		if (num > denom) {
			return `${num}-for-${denom} split`;
		} else {
			return `${denom}-for-${num} reverse split`;
		}
	}
</script>

<div class="split-history">
	<div class="section-header">
		<h3 class="section-title">Stock Splits</h3>
	</div>

	{#if loading}
		<div class="loading">Loading split history...</div>
	{:else if splits.length === 0}
		<EmptyState
			title="No stock splits on record"
			description="Many companies never split their stock."
			compact
		/>
	{:else}
		<div class="content">
			<table>
				<thead>
					<tr>
						<th class="date">Date</th>
						<th class="ratio">Ratio</th>
						<th class="description">Type</th>
					</tr>
				</thead>
				<tbody>
					{#each splits as split (split.date)}
						<tr>
							<td class="date">{formatDate(split.date)}</td>
							<td class="ratio">
								<span class="ratio-badge">
									{formatRatio(split.numerator, split.denominator)}
								</span>
							</td>
							<td class="description">
								{getSplitDescription(split.numerator, split.denominator)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.split-history {
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

	td {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-ink);
	}

	.ratio-badge {
		display: inline-block;
		padding: 2px 8px;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		font-weight: 600;
	}

	.description {
		color: var(--color-ink-muted);
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background: var(--color-newsprint-dark);
	}
</style>
