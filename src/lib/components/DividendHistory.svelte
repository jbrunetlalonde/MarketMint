<script lang="ts">
	import { formatCurrency, formatDate, formatPercent } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	interface Dividend {
		date: string;
		dividend: number;
		adjDividend?: number;
		recordDate?: string;
		paymentDate?: string;
		declarationDate?: string;
	}

	interface DividendInfo {
		paysDividend: boolean;
		annualDividend: number | null;
		dividendYield: number | null;
		dividendGrowthRate: number | null;
		payoutRatio: number | null;
		consecutiveYears: number;
		frequency: string | null;
	}

	interface Props {
		dividends: Dividend[];
		dividendInfo?: DividendInfo | null;
		currentPrice?: number;
		loading?: boolean;
		limit?: number;
		ticker?: string;
	}

	let { dividends, dividendInfo = null, currentPrice, loading = false, limit = 8, ticker }: Props = $props();

	const displayDividends = $derived(dividends.slice(0, limit));

	// Calculate trailing 12-month dividend yield (fallback if dividendInfo not provided)
	const annualDividend = $derived.by(() => {
		if (dividendInfo?.annualDividend != null) return dividendInfo.annualDividend;
		if (!dividends || dividends.length === 0) return null;

		const oneYearAgo = new Date();
		oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

		const recentDividends = dividends.filter(d => new Date(d.date) >= oneYearAgo);
		if (recentDividends.length === 0) return null;

		return recentDividends.reduce((sum, d) => sum + d.dividend, 0);
	});

	const dividendYield = $derived.by(() => {
		if (dividendInfo?.dividendYield != null) return dividendInfo.dividendYield;
		if (!annualDividend || !currentPrice || currentPrice <= 0) return null;
		return (annualDividend / currentPrice) * 100;
	});

	// Calculate average frequency (fallback if dividendInfo not provided)
	const dividendFrequency = $derived.by(() => {
		if (dividendInfo?.frequency) return dividendInfo.frequency;
		if (!dividends || dividends.length < 2) return null;

		const oneYearAgo = new Date();
		oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

		const recentDividends = dividends.filter(d => new Date(d.date) >= oneYearAgo);
		if (recentDividends.length === 0) return null;

		if (recentDividends.length >= 4) return 'Quarterly';
		if (recentDividends.length >= 2) return 'Semi-Annual';
		return 'Annual';
	});

	// Additional metrics from dividendInfo
	const dividendGrowthRate = $derived(dividendInfo?.dividendGrowthRate ?? null);
	const payoutRatio = $derived(dividendInfo?.payoutRatio ?? null);
	const consecutiveYears = $derived(dividendInfo?.consecutiveYears ?? 0);
</script>

<div class="dividend-history">
	<div class="section-header">
		<h3 class="section-title">Dividends</h3>
		{#if dividendYield !== null}
			<span class="yield-badge">{dividendYield.toFixed(2)}% yield</span>
		{/if}
	</div>

	{#if loading}
		<div class="loading">
			<div class="skeleton-summary"></div>
			{#each Array(4) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if dividends.length === 0}
		<EmptyState
			title="No dividend history"
			description="{ticker || 'This stock'} does not pay dividends or has no dividend history."
			compact
		/>
	{:else}
		<div class="content">
			<!-- Summary Stats -->
			<div class="summary-stats">
				{#if annualDividend !== null}
					<div class="stat">
						<span class="stat-label">Annual Dividend</span>
						<span class="stat-value">{formatCurrency(annualDividend)}</span>
					</div>
				{/if}
				{#if dividendYield !== null}
					<div class="stat">
						<span class="stat-label">Dividend Yield</span>
						<span class="stat-value yield">{dividendYield.toFixed(2)}%</span>
					</div>
				{/if}
				{#if dividendFrequency}
					<div class="stat">
						<span class="stat-label">Frequency</span>
						<span class="stat-value">{dividendFrequency}</span>
					</div>
				{/if}
			</div>

			<!-- Additional Metrics (if available) -->
			{#if dividendGrowthRate !== null || payoutRatio !== null || consecutiveYears > 0}
				<div class="additional-stats">
					{#if dividendGrowthRate !== null}
						<div class="metric">
							<span class="metric-label">Growth Rate</span>
							<span class="metric-value" class:positive={dividendGrowthRate > 0} class:negative={dividendGrowthRate < 0}>
								{dividendGrowthRate > 0 ? '+' : ''}{dividendGrowthRate.toFixed(1)}%
							</span>
						</div>
					{/if}
					{#if payoutRatio !== null}
						<div class="metric">
							<span class="metric-label">Payout Ratio</span>
							<span class="metric-value">{payoutRatio.toFixed(0)}%</span>
						</div>
					{/if}
					{#if consecutiveYears > 0}
						<div class="metric">
							<span class="metric-label">Streak</span>
							<span class="metric-value">{consecutiveYears} yr{consecutiveYears !== 1 ? 's' : ''}</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Dividend Table -->
			<div class="dividend-table">
				<table>
					<thead>
						<tr>
							<th class="col-date">Ex-Date</th>
							<th class="col-amount">Amount</th>
							<th class="col-payment">Payment Date</th>
						</tr>
					</thead>
					<tbody>
						{#each displayDividends as dividend (dividend.date)}
							<tr>
								<td class="col-date">{formatDate(dividend.date)}</td>
								<td class="col-amount">{formatCurrency(dividend.dividend, 'USD', 4)}</td>
								<td class="col-payment">
									{#if dividend.paymentDate}
										{formatDate(dividend.paymentDate)}
									{:else}
										--
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if dividends.length > limit}
				<div class="more-dividends">
					+{dividends.length - limit} more payments
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.dividend-history {
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

	.yield-badge {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 2px;
		background: rgba(13, 122, 62, 0.15);
		color: var(--color-gain);
	}

	.loading {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-summary {
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

	.stat-value.yield {
		color: var(--color-gain);
	}

	.additional-stats {
		display: flex;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-newsprint-dark);
	}

	.metric {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.metric-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-ink-muted);
	}

	.metric-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.metric-value.positive {
		color: var(--color-gain);
	}

	.metric-value.negative {
		color: var(--color-loss);
	}

	.dividend-table {
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

	.col-amount {
		text-align: right;
		font-weight: 500;
	}

	th.col-amount {
		text-align: right;
	}

	.col-date,
	.col-payment {
		white-space: nowrap;
	}

	.more-dividends {
		padding: 0.75rem;
		text-align: center;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		border-top: 1px solid var(--color-border);
	}
</style>
