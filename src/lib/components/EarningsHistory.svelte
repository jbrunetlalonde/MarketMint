<script lang="ts">
	import { formatCurrency, formatCompact, formatDate } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	interface EarningsData {
		date: string;
		symbol?: string;
		actualEarningsResult: number | null;
		estimatedEarning: number | null;
		revenue?: number | null;
		revenueEstimated?: number | null;
		surprisePercent: number | null;
		revenueSurprisePercent?: number | null;
	}

	interface Props {
		earnings: EarningsData[];
		loading?: boolean;
		limit?: number;
		ticker?: string;
	}

	let { earnings, loading = false, limit = 8, ticker }: Props = $props();

	const displayEarnings = $derived(earnings.slice(0, limit));

	// Calculate beat/miss stats
	const stats = $derived.by(() => {
		if (!earnings || earnings.length === 0) return null;

		const beats = earnings.filter(e => e.surprisePercent !== null && e.surprisePercent > 0).length;
		const misses = earnings.filter(e => e.surprisePercent !== null && e.surprisePercent < 0).length;
		const meets = earnings.filter(e => e.surprisePercent !== null && e.surprisePercent === 0).length;
		const total = beats + misses + meets;

		return {
			beats,
			misses,
			meets,
			total,
			beatRate: total > 0 ? (beats / total) * 100 : 0
		};
	});

	function getSurpriseClass(percent: number | null): string {
		if (percent === null) return '';
		if (percent > 0) return 'beat';
		if (percent < 0) return 'miss';
		return 'meet';
	}

	function formatSurprise(percent: number | null): string {
		if (percent === null) return '--';
		const sign = percent > 0 ? '+' : '';
		return `${sign}${percent.toFixed(1)}%`;
	}
</script>

<div class="earnings-history">
	<div class="section-header">
		<h3 class="section-title">Earnings History</h3>
		{#if stats}
			<span class="beat-rate" class:good={stats.beatRate >= 75}>
				{stats.beats}/{stats.total} beats
			</span>
		{/if}
	</div>

	{#if loading}
		<div class="loading">
			<div class="skeleton-stats"></div>
			{#each Array(4) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if earnings.length === 0}
		<EmptyState
			title="No earnings data"
			description="Earnings history is not available for {ticker || 'this stock'}."
			compact
		/>
	{:else}
		<div class="content">
			<!-- Summary Stats -->
			{#if stats}
				<div class="summary-stats">
					<div class="stat beat">
						<span class="stat-value">{stats.beats}</span>
						<span class="stat-label">Beats</span>
					</div>
					<div class="stat miss">
						<span class="stat-value">{stats.misses}</span>
						<span class="stat-label">Misses</span>
					</div>
					<div class="stat meet">
						<span class="stat-value">{stats.meets}</span>
						<span class="stat-label">Meets</span>
					</div>
					<div class="stat rate">
						<span class="stat-value">{stats.beatRate.toFixed(0)}%</span>
						<span class="stat-label">Beat Rate</span>
					</div>
				</div>
			{/if}

			<!-- Earnings Table -->
			<div class="earnings-table">
				<table>
					<thead>
						<tr>
							<th class="col-date">Quarter</th>
							<th class="col-eps">EPS</th>
							<th class="col-estimate">Est.</th>
							<th class="col-surprise">Surprise</th>
						</tr>
					</thead>
					<tbody>
						{#each displayEarnings as earning (earning.date)}
							<tr>
								<td class="col-date">{formatDate(earning.date)}</td>
								<td class="col-eps">
									{earning.actualEarningsResult !== null
										? formatCurrency(earning.actualEarningsResult, 'USD', 2)
										: '--'}
								</td>
								<td class="col-estimate">
									{earning.estimatedEarning !== null
										? formatCurrency(earning.estimatedEarning, 'USD', 2)
										: '--'}
								</td>
								<td class="col-surprise">
									<span class="surprise-badge {getSurpriseClass(earning.surprisePercent)}">
										{formatSurprise(earning.surprisePercent)}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if earnings.length > limit}
				<div class="more-earnings">
					+{earnings.length - limit} more quarters
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.earnings-history {
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

	.beat-rate {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 2px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.beat-rate.good {
		background: rgba(13, 122, 62, 0.15);
		color: var(--color-gain);
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
		height: 1.5rem;
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
		font-size: 0.5625rem;
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

	.stat.beat .stat-value {
		color: var(--color-gain);
	}

	.stat.miss .stat-value {
		color: var(--color-loss);
	}

	.stat.rate .stat-value {
		color: var(--color-ink);
	}

	.earnings-table {
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
	}

	td {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background: var(--color-newsprint-dark);
	}

	.col-eps,
	.col-estimate,
	.col-surprise {
		text-align: right;
	}

	th.col-eps,
	th.col-estimate,
	th.col-surprise {
		text-align: right;
	}

	.col-date {
		white-space: nowrap;
	}

	.surprise-badge {
		display: inline-block;
		padding: 2px 6px;
		font-size: 0.625rem;
		font-weight: 600;
		border-radius: 2px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.surprise-badge.beat {
		background: rgba(13, 122, 62, 0.15);
		color: var(--color-gain);
	}

	.surprise-badge.miss {
		background: rgba(196, 30, 58, 0.15);
		color: var(--color-loss);
	}

	.surprise-badge.meet {
		background: rgba(37, 99, 235, 0.15);
		color: #2563eb;
	}

	.more-earnings {
		padding: 0.75rem;
		text-align: center;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		border-top: 1px solid var(--color-border);
	}
</style>
