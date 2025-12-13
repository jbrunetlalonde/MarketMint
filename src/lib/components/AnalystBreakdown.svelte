<script lang="ts">
	import { formatDate, formatRelativeTime } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	interface AnalystGrade {
		symbol?: string;
		publishedDate: string;
		gradingCompany: string;
		newGrade: string;
		previousGrade?: string;
		action: string;
	}

	interface Props {
		grades: AnalystGrade[];
		loading?: boolean;
		limit?: number;
		ticker?: string;
	}

	let { grades, loading = false, limit = 10, ticker }: Props = $props();

	const displayGrades = $derived(grades.slice(0, limit));

	// Calculate summary stats
	const stats = $derived.by(() => {
		if (!grades || grades.length === 0) return null;

		const upgrades = grades.filter(g => g.action?.toLowerCase() === 'upgrade').length;
		const downgrades = grades.filter(g => g.action?.toLowerCase() === 'downgrade').length;
		const maintains = grades.filter(g => g.action?.toLowerCase() === 'maintain').length;
		const inits = grades.filter(g => g.action?.toLowerCase() === 'init').length;
		const total = upgrades + downgrades + maintains + inits;

		// Calculate sentiment score (-100 to +100)
		const sentimentScore = total > 0 ? Math.round(((upgrades - downgrades) / total) * 100) : 0;

		return { upgrades, downgrades, maintains, inits, total, sentimentScore };
	});

	function getActionClass(action: string): string {
		const a = action?.toLowerCase() || '';
		if (a === 'upgrade') return 'upgrade';
		if (a === 'downgrade') return 'downgrade';
		if (a === 'maintain') return 'maintain';
		if (a === 'init') return 'init';
		return '';
	}

	function getActionLabel(action: string): string {
		const a = action?.toLowerCase() || '';
		if (a === 'upgrade') return 'Upgrade';
		if (a === 'downgrade') return 'Downgrade';
		if (a === 'maintain') return 'Maintain';
		if (a === 'init') return 'Initiate';
		return action || '--';
	}

	function getActionIcon(action: string): string {
		const a = action?.toLowerCase() || '';
		if (a === 'upgrade') return 'M5 10l7-7m0 0l7 7m-7-7v18';
		if (a === 'downgrade') return 'M19 14l-7 7m0 0l-7-7m7 7V3';
		if (a === 'maintain') return 'M5 12h14';
		if (a === 'init') return 'M12 4v16m8-8H4';
		return '';
	}

	function truncateCompany(name: string, maxLength = 18): string {
		if (!name) return 'Unknown';
		if (name.length <= maxLength) return name;
		return name.slice(0, maxLength).trim() + '...';
	}

	function getSentimentLabel(score: number): string {
		if (score >= 50) return 'Very Bullish';
		if (score >= 20) return 'Bullish';
		if (score > -20) return 'Neutral';
		if (score > -50) return 'Bearish';
		return 'Very Bearish';
	}

	function getSentimentClass(score: number): string {
		if (score >= 20) return 'bullish';
		if (score > -20) return 'neutral';
		return 'bearish';
	}
</script>

<div class="analyst-breakdown">
	<div class="section-header">
		<h3 class="section-title">Analyst Activity</h3>
		{#if stats}
			<div class="sentiment-badge {getSentimentClass(stats.sentimentScore)}">
				{getSentimentLabel(stats.sentimentScore)}
			</div>
		{/if}
	</div>

	{#if loading}
		<div class="loading">
			<div class="skeleton-sentiment"></div>
			<div class="skeleton-stats"></div>
			{#each Array(4) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if grades.length === 0}
		<EmptyState
			title="No analyst activity"
			description="No recent analyst ratings for {ticker || 'this stock'}."
			compact
		/>
	{:else}
		<div class="content">
			<!-- Sentiment Overview -->
			{#if stats}
				<div class="sentiment-overview">
					<div class="sentiment-meter">
						<div class="meter-track">
							<div
								class="meter-fill {getSentimentClass(stats.sentimentScore)}"
								style="width: {Math.abs(stats.sentimentScore)}%; {stats.sentimentScore >= 0 ? 'left: 50%' : 'right: 50%'}"
							></div>
							<div class="meter-center"></div>
						</div>
						<div class="meter-labels">
							<span>Bearish</span>
							<span>Bullish</span>
						</div>
					</div>
					<div class="sentiment-stats">
						<div class="stat-row">
							<div class="stat-item upgrade">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
									<path d="M5 10l7-7m0 0l7 7m-7-7v18"/>
								</svg>
								<span class="stat-count">{stats.upgrades}</span>
								<span class="stat-label">Upgrades</span>
							</div>
							<div class="stat-item downgrade">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
									<path d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
								</svg>
								<span class="stat-count">{stats.downgrades}</span>
								<span class="stat-label">Downgrades</span>
							</div>
						</div>
						<div class="stat-row secondary">
							<div class="stat-item neutral">
								<span class="stat-count">{stats.maintains}</span>
								<span class="stat-label">Maintains</span>
							</div>
							<div class="stat-item init">
								<span class="stat-count">{stats.inits}</span>
								<span class="stat-label">New Coverage</span>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Grades List -->
			<div class="grades-list">
				<div class="list-header">Recent Actions</div>
				{#each displayGrades as grade (grade.publishedDate + grade.gradingCompany)}
					<div class="grade-item">
						<div class="grade-action">
							<span class="action-icon {getActionClass(grade.action)}">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
									<path d="{getActionIcon(grade.action)}"/>
								</svg>
							</span>
						</div>
						<div class="grade-info">
							<div class="grade-main">
								<span class="grade-company" title={grade.gradingCompany}>{truncateCompany(grade.gradingCompany)}</span>
								<span class="action-text {getActionClass(grade.action)}">{getActionLabel(grade.action)}</span>
							</div>
							<div class="grade-details">
								{#if grade.previousGrade && grade.previousGrade !== grade.newGrade}
									<span class="prev-grade">{grade.previousGrade}</span>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" class="arrow-icon">
										<path d="M5 12h14M12 5l7 7-7 7"/>
									</svg>
								{/if}
								<span class="new-grade">{grade.newGrade}</span>
							</div>
						</div>
						<div class="grade-date">
							{formatRelativeTime(grade.publishedDate)}
						</div>
					</div>
				{/each}
			</div>

			{#if grades.length > limit}
				<button class="more-grades" type="button">
					View all {grades.length} ratings
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
						<path d="M5 12h14M12 5l7 7-7 7"/>
					</svg>
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.analyst-breakdown {
		border: 1px solid var(--color-border);
		background: var(--color-paper);
		border-radius: 4px;
		overflow: hidden;
	}

	.section-header {
		padding: 0.875rem 1rem;
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
		letter-spacing: 0.08em;
		margin: 0;
		color: var(--color-ink);
	}

	.sentiment-badge {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.25rem 0.625rem;
		border-radius: 3px;
	}

	.sentiment-badge.bullish {
		background: rgba(13, 122, 62, 0.15);
		color: var(--color-gain);
	}

	.sentiment-badge.bearish {
		background: rgba(196, 30, 58, 0.15);
		color: var(--color-loss);
	}

	.sentiment-badge.neutral {
		background: var(--color-newsprint);
		color: var(--color-ink-muted);
	}

	.loading {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skeleton-sentiment {
		height: 2.5rem;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		animation: pulse 1.5s infinite;
	}

	.skeleton-stats {
		height: 4rem;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		animation: pulse 1.5s infinite;
	}

	.skeleton-row {
		height: 3rem;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.content {
		padding: 0;
	}

	/* Sentiment Overview */
	.sentiment-overview {
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-newsprint);
	}

	.sentiment-meter {
		margin-bottom: 1rem;
	}

	.meter-track {
		position: relative;
		height: 8px;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		overflow: hidden;
	}

	.meter-fill {
		position: absolute;
		top: 0;
		height: 100%;
		max-width: 50%;
		transition: width 0.5s ease;
	}

	.meter-fill.bullish {
		background: linear-gradient(90deg, var(--color-newsprint-dark), var(--color-gain));
	}

	.meter-fill.bearish {
		background: linear-gradient(-90deg, var(--color-newsprint-dark), var(--color-loss));
	}

	.meter-fill.neutral {
		background: var(--color-ink-muted);
		opacity: 0.3;
	}

	.meter-center {
		position: absolute;
		top: -2px;
		left: 50%;
		transform: translateX(-50%);
		width: 3px;
		height: 12px;
		background: var(--color-ink);
		border-radius: 1px;
	}

	.meter-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 6px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.sentiment-stats {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.stat-row {
		display: flex;
		gap: 0.75rem;
	}

	.stat-row.secondary {
		padding-top: 0.5rem;
		border-top: 1px dashed var(--color-border);
	}

	.stat-item {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-paper);
		border-radius: 4px;
		border: 1px solid var(--color-border);
	}

	.stat-item svg {
		flex-shrink: 0;
	}

	.stat-item.upgrade {
		color: var(--color-gain);
	}

	.stat-item.downgrade {
		color: var(--color-loss);
	}

	.stat-item.neutral, .stat-item.init {
		color: var(--color-ink-muted);
	}

	.stat-count {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1rem;
		font-weight: 700;
	}

	.stat-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-ink-muted);
	}

	/* Grades List */
	.grades-list {
		display: flex;
		flex-direction: column;
	}

	.list-header {
		padding: 0.625rem 1rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		background: var(--color-newsprint-dark);
		border-bottom: 1px solid var(--color-border);
	}

	.grade-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		transition: background 0.15s ease;
	}

	.grade-item:last-child {
		border-bottom: none;
	}

	.grade-item:hover {
		background: var(--color-newsprint);
	}

	.grade-action {
		flex-shrink: 0;
	}

	.action-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.action-icon.upgrade {
		background: rgba(13, 122, 62, 0.15);
		color: var(--color-gain);
	}

	.action-icon.downgrade {
		background: rgba(196, 30, 58, 0.15);
		color: var(--color-loss);
	}

	.action-icon.maintain {
		background: rgba(37, 99, 235, 0.1);
		color: #2563eb;
	}

	.action-icon.init {
		background: rgba(147, 51, 234, 0.1);
		color: #9333ea;
	}

	.grade-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.grade-main {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.grade-company {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.action-text {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.action-text.upgrade { color: var(--color-gain); }
	.action-text.downgrade { color: var(--color-loss); }
	.action-text.maintain { color: #2563eb; }
	.action-text.init { color: #9333ea; }

	.grade-details {
		display: flex;
		align-items: center;
		gap: 4px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
	}

	.prev-grade {
		color: var(--color-ink-muted);
		text-decoration: line-through;
		text-decoration-color: var(--color-ink-muted);
	}

	.arrow-icon {
		color: var(--color-ink-muted);
		opacity: 0.6;
	}

	.new-grade {
		color: var(--color-ink);
		font-weight: 600;
	}

	.grade-date {
		flex-shrink: 0;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	.more-grades {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.875rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-accent);
		background: var(--color-newsprint);
		border: none;
		border-top: 1px solid var(--color-border);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.more-grades:hover {
		background: var(--color-newsprint-dark);
		color: var(--color-ink);
	}

	.more-grades svg {
		transition: transform 0.2s ease;
	}

	.more-grades:hover svg {
		transform: translateX(3px);
	}

	@media (max-width: 640px) {
		.stat-row {
			flex-direction: column;
			gap: 0.5rem;
		}

		.stat-row.secondary {
			flex-direction: row;
		}

		.grade-main {
			flex-direction: column;
			align-items: flex-start;
			gap: 2px;
		}
	}
</style>
