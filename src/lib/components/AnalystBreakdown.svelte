<script lang="ts">
	import { formatDate } from '$lib/utils/formatters';
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

		return { upgrades, downgrades, maintains, inits };
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
		if (a === 'upgrade') return 'UP';
		if (a === 'downgrade') return 'DOWN';
		if (a === 'maintain') return 'HOLD';
		if (a === 'init') return 'INIT';
		return action?.toUpperCase().slice(0, 4) || '--';
	}

	function truncateCompany(name: string, maxLength = 20): string {
		if (!name) return 'Unknown';
		if (name.length <= maxLength) return name;
		return name.slice(0, maxLength).trim() + '...';
	}
</script>

<div class="analyst-breakdown">
	<div class="section-header">
		<h3 class="section-title">Analyst Activity</h3>
		{#if stats}
			<span class="action-summary">
				<span class="up">{stats.upgrades}</span> /
				<span class="down">{stats.downgrades}</span>
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
	{:else if grades.length === 0}
		<EmptyState
			title="No analyst activity"
			description="No recent analyst ratings for {ticker || 'this stock'}."
			compact
		/>
	{:else}
		<div class="content">
			<!-- Summary Stats -->
			{#if stats}
				<div class="summary-stats">
					<div class="stat upgrade">
						<span class="stat-value">{stats.upgrades}</span>
						<span class="stat-label">Upgrades</span>
					</div>
					<div class="stat downgrade">
						<span class="stat-value">{stats.downgrades}</span>
						<span class="stat-label">Downgrades</span>
					</div>
					<div class="stat maintain">
						<span class="stat-value">{stats.maintains}</span>
						<span class="stat-label">Maintains</span>
					</div>
					<div class="stat init">
						<span class="stat-value">{stats.inits}</span>
						<span class="stat-label">Initiations</span>
					</div>
				</div>
			{/if}

			<!-- Grades List -->
			<div class="grades-list">
				{#each displayGrades as grade (grade.publishedDate + grade.gradingCompany)}
					<div class="grade-item">
						<div class="grade-action">
							<span class="action-badge {getActionClass(grade.action)}">
								{getActionLabel(grade.action)}
							</span>
						</div>
						<div class="grade-info">
							<span class="grade-company">{truncateCompany(grade.gradingCompany)}</span>
							<div class="grade-details">
								{#if grade.previousGrade && grade.previousGrade !== grade.newGrade}
									<span class="prev-grade">{grade.previousGrade}</span>
									<span class="arrow">-></span>
								{/if}
								<span class="new-grade">{grade.newGrade}</span>
							</div>
						</div>
						<div class="grade-date">
							{formatDate(grade.publishedDate)}
						</div>
					</div>
				{/each}
			</div>

			{#if grades.length > limit}
				<div class="more-grades">
					+{grades.length - limit} more ratings
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.analyst-breakdown {
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

	.action-summary {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.action-summary .up {
		color: var(--color-gain);
		font-weight: 600;
	}

	.action-summary .down {
		color: var(--color-loss);
		font-weight: 600;
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

	.stat.upgrade .stat-value {
		color: var(--color-gain);
	}

	.stat.downgrade .stat-value {
		color: var(--color-loss);
	}

	.grades-list {
		display: flex;
		flex-direction: column;
	}

	.grade-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	.grade-item:last-child {
		border-bottom: none;
	}

	.grade-item:hover {
		background: var(--color-newsprint-dark);
	}

	.grade-action {
		flex-shrink: 0;
	}

	.action-badge {
		display: inline-block;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 700;
		padding: 3px 6px;
		border-radius: 2px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
		min-width: 36px;
		text-align: center;
	}

	.action-badge.upgrade {
		background: rgba(13, 122, 62, 0.15);
		color: var(--color-gain);
	}

	.action-badge.downgrade {
		background: rgba(196, 30, 58, 0.15);
		color: var(--color-loss);
	}

	.action-badge.maintain {
		background: rgba(37, 99, 235, 0.15);
		color: #2563eb;
	}

	.action-badge.init {
		background: rgba(147, 51, 234, 0.15);
		color: #9333ea;
	}

	.grade-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.grade-company {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.grade-details {
		display: flex;
		align-items: center;
		gap: 4px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
	}

	.prev-grade {
		color: var(--color-ink-muted);
	}

	.arrow {
		color: var(--color-ink-muted);
	}

	.new-grade {
		color: var(--color-ink);
		font-weight: 500;
	}

	.grade-date {
		flex-shrink: 0;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	.more-grades {
		padding: 0.75rem;
		text-align: center;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		border-top: 1px solid var(--color-border);
	}
</style>
