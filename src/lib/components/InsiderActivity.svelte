<script lang="ts">
	import { formatCurrency, formatCompact } from '$lib/utils/formatters';
	import AIExplainButton from './AIExplainButton.svelte';

	interface Props {
		stats: {
			totalBought: number;
			totalSold: number;
			buyCount: number;
			sellCount: number;
			periodStart: string | null;
			periodEnd: string | null;
		} | null;
		ticker?: string;
	}

	let { stats, ticker = '' }: Props = $props();

	const netValue = $derived(stats ? stats.totalBought - stats.totalSold : 0);
	const totalTransactions = $derived(stats ? stats.buyCount + stats.sellCount : 0);

	function getSentiment(): { label: string; color: string } {
		if (!stats || totalTransactions === 0) return { label: 'No Activity', color: 'muted' };
		if (netValue > 0) return { label: 'Bullish', color: 'gain' };
		if (netValue < 0) return { label: 'Bearish', color: 'loss' };
		return { label: 'Neutral', color: 'neutral' };
	}

	const sentiment = $derived(getSentiment());

	function formatPeriod(): string {
		if (stats?.periodStart) return stats.periodStart;
		return 'Recent';
	}
</script>

{#if stats && totalTransactions > 0}
	<div class="insider-activity">
		<div class="header">
			<h3 class="section-title">Insider Activity</h3>
			<span class="period">{formatPeriod()}</span>
		</div>

		<div class="stats-row">
			<div class="stat buy">
				<span class="stat-label">Buys</span>
				<span class="stat-value">{stats.buyCount}</span>
				<span class="stat-amount">{formatCompact(stats.totalBought)}</span>
			</div>

			<div class="divider"></div>

			<div class="stat sell">
				<span class="stat-label">Sells</span>
				<span class="stat-value">{stats.sellCount}</span>
				<span class="stat-amount">{formatCompact(stats.totalSold)}</span>
			</div>
		</div>

		<div class="net-row">
			<span class="net-label">Net:</span>
			<span class="net-value" class:gain={netValue > 0} class:loss={netValue < 0}>
				{netValue >= 0 ? '+' : ''}{formatCompact(Math.abs(netValue))}
			</span>
			<span
				class="sentiment-badge"
				class:gain={sentiment.color === 'gain'}
				class:loss={sentiment.color === 'loss'}
				class:neutral={sentiment.color === 'neutral'}
			>
				{sentiment.label}
			</span>
		</div>

		{#if ticker}
			<div class="section-ai-button">
				<AIExplainButton
					{ticker}
					sectionType="insider"
					data={{
						buyCount: stats.buyCount,
						sellCount: stats.sellCount,
						buyValue: stats.totalBought,
						sellValue: stats.totalSold,
						netValue: stats.totalBought - stats.totalSold
					}}
					label="Explain Activity"
				/>
			</div>
		{/if}
	</div>
{/if}

<style>
	.insider-activity {
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.75rem;
		background: var(--color-paper);
		margin-bottom: 1rem;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.section-ai-button {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px dotted var(--color-border);
		display: flex;
		justify-content: flex-end;
	}

	.section-title {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink);
		margin: 0;
	}

	.period {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.stats-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
	}

	.stat-label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-ink-muted);
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-family: var(--font-mono);
		font-size: 1.125rem;
		font-weight: 700;
	}

	.stat.buy .stat-value {
		color: var(--color-gain);
	}

	.stat.sell .stat-value {
		color: var(--color-loss);
	}

	.stat-amount {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
	}

	.divider {
		width: 1px;
		height: 40px;
		background: var(--color-border);
	}

	.net-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px dotted var(--color-border);
	}

	.net-label {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-ink-muted);
	}

	.net-value {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.net-value.gain {
		color: var(--color-gain);
	}

	.net-value.loss {
		color: var(--color-loss);
	}

	.sentiment-badge {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
	}

	.sentiment-badge.gain {
		background: rgba(13, 122, 62, 0.1);
		color: var(--color-gain);
	}

	.sentiment-badge.loss {
		background: rgba(196, 30, 58, 0.1);
		color: var(--color-loss);
	}

	.sentiment-badge.neutral {
		background: rgba(245, 158, 11, 0.1);
		color: #f59e0b;
	}
</style>
