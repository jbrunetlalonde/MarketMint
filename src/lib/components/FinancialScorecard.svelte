<script lang="ts">
	import { formatPercent, formatNumber } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	interface Metrics {
		peRatio?: number | null;
		pbRatio?: number | null;
		debtToEquity?: number | null;
		currentRatio?: number | null;
		roe?: number | null;
		roa?: number | null;
		dividendYield?: number | null;
		grossProfitMargin?: number | null;
		operatingProfitMargin?: number | null;
		netProfitMargin?: number | null;
	}

	interface Props {
		metrics: Metrics | null;
		loading?: boolean;
		ticker?: string;
	}

	let { metrics, loading = false, ticker }: Props = $props();

	// Define metric thresholds and grades
	function gradeMetric(value: number | null | undefined, metric: string): { grade: string; class: string } {
		if (value === null || value === undefined) return { grade: '--', class: '' };

		switch (metric) {
			case 'peRatio':
				if (value < 0) return { grade: 'N/A', class: 'neutral' };
				if (value < 15) return { grade: 'A', class: 'excellent' };
				if (value < 20) return { grade: 'B', class: 'good' };
				if (value < 30) return { grade: 'C', class: 'average' };
				return { grade: 'D', class: 'poor' };

			case 'pbRatio':
				if (value < 1) return { grade: 'A', class: 'excellent' };
				if (value < 3) return { grade: 'B', class: 'good' };
				if (value < 5) return { grade: 'C', class: 'average' };
				return { grade: 'D', class: 'poor' };

			case 'debtToEquity':
				if (value < 0.5) return { grade: 'A', class: 'excellent' };
				if (value < 1) return { grade: 'B', class: 'good' };
				if (value < 2) return { grade: 'C', class: 'average' };
				return { grade: 'D', class: 'poor' };

			case 'currentRatio':
				if (value > 2) return { grade: 'A', class: 'excellent' };
				if (value > 1.5) return { grade: 'B', class: 'good' };
				if (value > 1) return { grade: 'C', class: 'average' };
				return { grade: 'D', class: 'poor' };

			case 'roe':
			case 'roa':
				const pct = value * 100;
				if (pct > 20) return { grade: 'A', class: 'excellent' };
				if (pct > 15) return { grade: 'B', class: 'good' };
				if (pct > 10) return { grade: 'C', class: 'average' };
				if (pct > 0) return { grade: 'D', class: 'poor' };
				return { grade: 'F', class: 'poor' };

			case 'grossProfitMargin':
				const gpm = value * 100;
				if (gpm > 50) return { grade: 'A', class: 'excellent' };
				if (gpm > 30) return { grade: 'B', class: 'good' };
				if (gpm > 15) return { grade: 'C', class: 'average' };
				return { grade: 'D', class: 'poor' };

			case 'netProfitMargin':
				const npm = value * 100;
				if (npm > 20) return { grade: 'A', class: 'excellent' };
				if (npm > 10) return { grade: 'B', class: 'good' };
				if (npm > 5) return { grade: 'C', class: 'average' };
				if (npm > 0) return { grade: 'D', class: 'poor' };
				return { grade: 'F', class: 'poor' };

			case 'dividendYield':
				const dy = value * 100;
				if (dy > 4) return { grade: 'A', class: 'excellent' };
				if (dy > 2) return { grade: 'B', class: 'good' };
				if (dy > 0) return { grade: 'C', class: 'average' };
				return { grade: '--', class: 'neutral' };

			default:
				return { grade: '--', class: '' };
		}
	}

	function formatMetricValue(value: number | null | undefined, metric: string): string {
		if (value === null || value === undefined) return '--';

		switch (metric) {
			case 'peRatio':
			case 'pbRatio':
				return formatNumber(value, 1);
			case 'debtToEquity':
			case 'currentRatio':
				return formatNumber(value, 2);
			case 'roe':
			case 'roa':
			case 'dividendYield':
			case 'grossProfitMargin':
			case 'operatingProfitMargin':
			case 'netProfitMargin':
				return formatPercent(value);
			default:
				return String(value);
		}
	}

	// Calculate overall score
	const overallScore = $derived.by(() => {
		if (!metrics) return null;

		const scores: number[] = [];
		const gradeToScore: Record<string, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };

		const metricKeys = ['peRatio', 'pbRatio', 'debtToEquity', 'currentRatio', 'roe', 'netProfitMargin'];

		for (const key of metricKeys) {
			const value = metrics[key as keyof Metrics];
			const { grade } = gradeMetric(value, key);
			if (grade in gradeToScore) {
				scores.push(gradeToScore[grade]);
			}
		}

		if (scores.length === 0) return null;
		return scores.reduce((a, b) => a + b, 0) / scores.length;
	});

	const overallGrade = $derived.by(() => {
		if (overallScore === null) return { grade: '--', class: '' };
		if (overallScore >= 3.5) return { grade: 'A', class: 'excellent' };
		if (overallScore >= 2.5) return { grade: 'B', class: 'good' };
		if (overallScore >= 1.5) return { grade: 'C', class: 'average' };
		if (overallScore >= 0.5) return { grade: 'D', class: 'poor' };
		return { grade: 'F', class: 'poor' };
	});

	const hasData = $derived(
		metrics &&
		(metrics.peRatio != null || metrics.pbRatio != null ||
		 metrics.roe != null || metrics.debtToEquity != null)
	);
</script>

<div class="financial-scorecard">
	<div class="section-header">
		<h3 class="section-title">Financial Health</h3>
		{#if hasData}
			<span class="overall-grade {overallGrade.class}">
				Grade: {overallGrade.grade}
			</span>
		{/if}
	</div>

	{#if loading}
		<div class="loading">
			{#each Array(6) as _, i (i)}
				<div class="skeleton-metric"></div>
			{/each}
		</div>
	{:else if !hasData}
		<EmptyState
			title="No metrics available"
			description="Financial metrics are not available for {ticker || 'this stock'}."
			compact
		/>
	{:else if metrics}
		<div class="metrics-grid">
			<!-- Valuation -->
			<div class="metric-card">
				<div class="metric-header">
					<span class="metric-label">P/E Ratio</span>
					<span class="metric-grade {gradeMetric(metrics.peRatio, 'peRatio').class}">
						{gradeMetric(metrics.peRatio, 'peRatio').grade}
					</span>
				</div>
				<span class="metric-value">{formatMetricValue(metrics.peRatio, 'peRatio')}</span>
			</div>

			<div class="metric-card">
				<div class="metric-header">
					<span class="metric-label">P/B Ratio</span>
					<span class="metric-grade {gradeMetric(metrics.pbRatio, 'pbRatio').class}">
						{gradeMetric(metrics.pbRatio, 'pbRatio').grade}
					</span>
				</div>
				<span class="metric-value">{formatMetricValue(metrics.pbRatio, 'pbRatio')}</span>
			</div>

			<!-- Profitability -->
			<div class="metric-card">
				<div class="metric-header">
					<span class="metric-label">ROE</span>
					<span class="metric-grade {gradeMetric(metrics.roe, 'roe').class}">
						{gradeMetric(metrics.roe, 'roe').grade}
					</span>
				</div>
				<span class="metric-value">{formatMetricValue(metrics.roe, 'roe')}</span>
			</div>

			<div class="metric-card">
				<div class="metric-header">
					<span class="metric-label">ROA</span>
					<span class="metric-grade {gradeMetric(metrics.roa, 'roa').class}">
						{gradeMetric(metrics.roa, 'roa').grade}
					</span>
				</div>
				<span class="metric-value">{formatMetricValue(metrics.roa, 'roa')}</span>
			</div>

			<!-- Leverage -->
			<div class="metric-card">
				<div class="metric-header">
					<span class="metric-label">Debt/Equity</span>
					<span class="metric-grade {gradeMetric(metrics.debtToEquity, 'debtToEquity').class}">
						{gradeMetric(metrics.debtToEquity, 'debtToEquity').grade}
					</span>
				</div>
				<span class="metric-value">{formatMetricValue(metrics.debtToEquity, 'debtToEquity')}</span>
			</div>

			<div class="metric-card">
				<div class="metric-header">
					<span class="metric-label">Current Ratio</span>
					<span class="metric-grade {gradeMetric(metrics.currentRatio, 'currentRatio').class}">
						{gradeMetric(metrics.currentRatio, 'currentRatio').grade}
					</span>
				</div>
				<span class="metric-value">{formatMetricValue(metrics.currentRatio, 'currentRatio')}</span>
			</div>

			<!-- Margins -->
			{#if metrics.grossProfitMargin != null}
				<div class="metric-card">
					<div class="metric-header">
						<span class="metric-label">Gross Margin</span>
						<span class="metric-grade {gradeMetric(metrics.grossProfitMargin, 'grossProfitMargin').class}">
							{gradeMetric(metrics.grossProfitMargin, 'grossProfitMargin').grade}
						</span>
					</div>
					<span class="metric-value">{formatMetricValue(metrics.grossProfitMargin, 'grossProfitMargin')}</span>
				</div>
			{/if}

			{#if metrics.netProfitMargin != null}
				<div class="metric-card">
					<div class="metric-header">
						<span class="metric-label">Net Margin</span>
						<span class="metric-grade {gradeMetric(metrics.netProfitMargin, 'netProfitMargin').class}">
							{gradeMetric(metrics.netProfitMargin, 'netProfitMargin').grade}
						</span>
					</div>
					<span class="metric-value">{formatMetricValue(metrics.netProfitMargin, 'netProfitMargin')}</span>
				</div>
			{/if}

			<!-- Dividend -->
			{#if metrics.dividendYield != null && metrics.dividendYield > 0}
				<div class="metric-card">
					<div class="metric-header">
						<span class="metric-label">Div Yield</span>
						<span class="metric-grade {gradeMetric(metrics.dividendYield, 'dividendYield').class}">
							{gradeMetric(metrics.dividendYield, 'dividendYield').grade}
						</span>
					</div>
					<span class="metric-value">{formatMetricValue(metrics.dividendYield, 'dividendYield')}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.financial-scorecard {
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

	.overall-grade {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 2px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.overall-grade.excellent {
		background: rgba(13, 122, 62, 0.15);
		color: var(--color-gain);
	}

	.overall-grade.good {
		background: rgba(37, 99, 235, 0.15);
		color: #2563eb;
	}

	.overall-grade.average {
		background: rgba(234, 179, 8, 0.15);
		color: #ca8a04;
	}

	.overall-grade.poor {
		background: rgba(196, 30, 58, 0.15);
		color: var(--color-loss);
	}

	.loading {
		padding: 0.75rem;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.skeleton-metric {
		height: 3.5rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1px;
		background: var(--color-border);
	}

	.metric-card {
		padding: 0.75rem;
		background: var(--color-paper);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.metric-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.metric-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.metric-grade {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 700;
		padding: 1px 4px;
		border-radius: 2px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.metric-grade.excellent {
		background: rgba(13, 122, 62, 0.15);
		color: var(--color-gain);
	}

	.metric-grade.good {
		background: rgba(37, 99, 235, 0.15);
		color: #2563eb;
	}

	.metric-grade.average {
		background: rgba(234, 179, 8, 0.15);
		color: #ca8a04;
	}

	.metric-grade.poor {
		background: rgba(196, 30, 58, 0.15);
		color: var(--color-loss);
	}

	.metric-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink);
	}
</style>
