<script lang="ts">
	import { onMount } from 'svelte';
	import { API_BASE } from '$lib/utils/api/request';
	import { formatRelativeTime } from '$lib/utils/formatters';

	interface Props {
		symbol: string;
		onClose: () => void;
	}

	let { symbol, onClose }: Props = $props();

	interface Grade {
		symbol: string;
		date: string;
		gradingCompany: string;
		previousGrade: string;
		newGrade: string;
		action: string;
	}

	interface PriceTargetSummary {
		symbol: string;
		lastMonthCount: number;
		lastMonthAvgPriceTarget: number;
		lastQuarterCount: number;
		lastQuarterAvgPriceTarget: number;
		lastYearCount: number;
		lastYearAvgPriceTarget: number;
		allTimeCount: number;
		allTimeAvgPriceTarget: number;
		publishers: string[];
	}

	let grades = $state<Grade[]>([]);
	let summary = $state<PriceTargetSummary | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let filterAction = $state<'all' | 'upgrade' | 'downgrade' | 'maintain'>('all');

	async function loadData() {
		if (!symbol) return;
		loading = true;
		error = null;

		try {
			const [gradesRes, summaryRes] = await Promise.all([
				fetch(`${API_BASE}/api/financials/${symbol}/detailed-grades?limit=50`),
				fetch(`${API_BASE}/api/financials/${symbol}/price-target-summary`)
			]);

			const gradesData = await gradesRes.json();
			const summaryData = await summaryRes.json();

			if (gradesData.success && gradesData.data) {
				grades = gradesData.data;
			}

			if (summaryData.success && summaryData.data) {
				summary = summaryData.data;
			}

			if (grades.length === 0 && !summary) {
				error = 'No analyst data available';
			}
		} catch {
			error = 'Failed to load analyst details';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadData();
	});

	// Stats derived from grades
	const gradeStats = $derived.by(() => {
		const upgrades = grades.filter(g => g.action?.toLowerCase() === 'upgrade').length;
		const downgrades = grades.filter(g => g.action?.toLowerCase() === 'downgrade').length;
		const maintains = grades.filter(g => g.action?.toLowerCase() === 'maintain').length;
		return { upgrades, downgrades, maintains, total: grades.length };
	});

	// Filtered grades
	const filteredGrades = $derived.by(() => {
		if (filterAction === 'all') return grades;
		return grades.filter(g => g.action?.toLowerCase() === filterAction);
	});

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getActionClass(action: string): string {
		const a = action?.toLowerCase() || '';
		if (a.includes('upgrade')) return 'upgrade';
		if (a.includes('downgrade')) return 'downgrade';
		return 'maintain';
	}

	function getActionIcon(action: string): string {
		const a = action?.toLowerCase() || '';
		if (a.includes('upgrade')) return 'M5 10l7-7m0 0l7 7m-7-7v18';
		if (a.includes('downgrade')) return 'M19 14l-7 7m0 0l-7-7m7 7V3';
		return 'M5 12h14';
	}

	function formatPrice(price: number | null | undefined): string {
		if (price == null || isNaN(price)) return '--';
		return `$${price.toFixed(2)}`;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function isRatingChanged(prev: string, current: string): boolean {
		return prev && current && prev !== current;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="overlay" onclick={onClose}>
	<div class="panel" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Analyst Details" tabindex="-1">
		<div class="panel-header">
			<div class="header-content">
				<span class="header-label">Analyst Ratings</span>
				<h2>{symbol}</h2>
			</div>
			<button class="close-btn" onclick={onClose} aria-label="Close">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
					<line x1="18" y1="6" x2="6" y2="18"/>
					<line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>

		{#if loading}
			<div class="loading-state">
				<div class="skeleton-summary"></div>
				<div class="skeleton-filters"></div>
				{#each Array(5) as _, i (i)}
					<div class="skeleton-row"></div>
				{/each}
			</div>
		{:else if error}
			<div class="error-state">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32">
					<circle cx="12" cy="12" r="10"/>
					<line x1="12" y1="8" x2="12" y2="12"/>
					<line x1="12" y1="16" x2="12.01" y2="16"/>
				</svg>
				<p>{error}</p>
			</div>
		{:else}
			<!-- Price Target Summary -->
			{#if summary}
				<div class="summary-section">
					<div class="summary-header">
						<h3>Price Targets</h3>
						<span class="summary-badge">{summary.allTimeCount} analysts</span>
					</div>
					<div class="summary-grid">
						<div class="summary-card highlight">
							<span class="card-label">Last Month</span>
							<span class="card-value">{formatPrice(summary.lastMonthAvgPriceTarget)}</span>
							<span class="card-meta">{summary.lastMonthCount} analysts</span>
						</div>
						<div class="summary-card">
							<span class="card-label">Last Quarter</span>
							<span class="card-value">{formatPrice(summary.lastQuarterAvgPriceTarget)}</span>
							<span class="card-meta">{summary.lastQuarterCount} analysts</span>
						</div>
						<div class="summary-card">
							<span class="card-label">Last Year</span>
							<span class="card-value">{formatPrice(summary.lastYearAvgPriceTarget)}</span>
							<span class="card-meta">{summary.lastYearCount} analysts</span>
						</div>
						<div class="summary-card">
							<span class="card-label">All Time Avg</span>
							<span class="card-value">{formatPrice(summary.allTimeAvgPriceTarget)}</span>
							<span class="card-meta">{summary.allTimeCount} total</span>
						</div>
					</div>

					{#if summary.publishers && summary.publishers.length > 0}
						<div class="publishers">
							<details>
								<summary>
									<span class="publishers-label">Sources</span>
									<span class="publishers-count">{summary.publishers.length} firms</span>
								</summary>
								<div class="publishers-list">
									{#each summary.publishers as pub}
										<span class="publisher-tag">{pub}</span>
									{/each}
								</div>
							</details>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Analyst Actions -->
			{#if grades.length > 0}
				<div class="grades-section">
					<div class="grades-header">
						<h3>Rating Actions</h3>
						<div class="grade-stats">
							<span class="stat upgrade">{gradeStats.upgrades} up</span>
							<span class="stat downgrade">{gradeStats.downgrades} down</span>
							<span class="stat maintain">{gradeStats.maintains} hold</span>
						</div>
					</div>

					<!-- Filter tabs -->
					<div class="filter-tabs">
						<button
							type="button"
							class="filter-tab"
							class:active={filterAction === 'all'}
							onclick={() => filterAction = 'all'}
						>
							All ({gradeStats.total})
						</button>
						<button
							type="button"
							class="filter-tab upgrade"
							class:active={filterAction === 'upgrade'}
							onclick={() => filterAction = 'upgrade'}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
								<path d="M5 10l7-7m0 0l7 7m-7-7v18"/>
							</svg>
							Upgrades ({gradeStats.upgrades})
						</button>
						<button
							type="button"
							class="filter-tab downgrade"
							class:active={filterAction === 'downgrade'}
							onclick={() => filterAction = 'downgrade'}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
								<path d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
							</svg>
							Downgrades ({gradeStats.downgrades})
						</button>
						<button
							type="button"
							class="filter-tab maintain"
							class:active={filterAction === 'maintain'}
							onclick={() => filterAction = 'maintain'}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
								<path d="M5 12h14"/>
							</svg>
							Maintains ({gradeStats.maintains})
						</button>
					</div>

					<!-- Grades list -->
					<div class="grades-list">
						{#each filteredGrades as grade (grade.date + grade.gradingCompany)}
							{@const actionClass = getActionClass(grade.action)}
							{@const hasChange = isRatingChanged(grade.previousGrade, grade.newGrade)}
							<div class="grade-row">
								<div class="grade-icon {actionClass}">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
										<path d="{getActionIcon(grade.action)}"/>
									</svg>
								</div>
								<div class="grade-main">
									<div class="grade-firm">{grade.gradingCompany}</div>
									<div class="grade-rating">
										{#if hasChange}
											<span class="prev-rating">{grade.previousGrade}</span>
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" class="rating-arrow">
												<path d="M5 12h14M12 5l7 7-7 7"/>
											</svg>
										{/if}
										<span class="current-rating {actionClass}">{grade.newGrade || '--'}</span>
									</div>
								</div>
								<div class="grade-meta">
									<span class="grade-action {actionClass}">{grade.action}</span>
									<span class="grade-date">{formatRelativeTime(grade.date)}</span>
								</div>
							</div>
						{:else}
							<div class="no-results">
								No {filterAction} ratings found
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		display: flex;
		justify-content: flex-end;
	}

	.panel {
		width: min(560px, 92vw);
		height: 100%;
		background: var(--color-paper);
		border-left: 3px solid var(--color-ink);
		overflow-y: auto;
		animation: slideIn 0.25s ease-out;
		display: flex;
		flex-direction: column;
	}

	@keyframes slideIn {
		from { transform: translateX(100%); opacity: 0.8; }
		to { transform: translateX(0); opacity: 1; }
	}

	/* Header */
	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		background: var(--color-ink);
		color: var(--color-paper);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-content {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.header-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		opacity: 0.7;
	}

	.panel-header h2 {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.close-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid rgba(255,255,255,0.3);
		border-radius: 4px;
		color: var(--color-paper);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: var(--color-paper);
		color: var(--color-ink);
		border-color: var(--color-paper);
	}

	/* Loading State */
	.loading-state {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skeleton-summary {
		height: 100px;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		animation: pulse 1.5s infinite;
	}

	.skeleton-filters {
		height: 40px;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		animation: pulse 1.5s infinite;
	}

	.skeleton-row {
		height: 56px;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.7; }
	}

	/* Error State */
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 2rem;
		text-align: center;
		color: var(--color-loss);
	}

	.error-state p {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8125rem;
		margin: 1rem 0 0;
		color: var(--color-ink-muted);
	}

	/* Summary Section */
	.summary-section {
		padding: 1.25rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-newsprint);
	}

	.summary-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.summary-header h3 {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0;
		color: var(--color-ink);
	}

	.summary-badge {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		color: var(--color-ink-muted);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}

	.summary-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		transition: all 0.15s ease;
	}

	.summary-card.highlight {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: var(--color-paper);
	}

	.card-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.summary-card.highlight .card-label {
		color: rgba(255,255,255,0.6);
	}

	.card-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.summary-card.highlight .card-value {
		color: var(--color-paper);
	}

	.card-meta {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		color: var(--color-ink-muted);
	}

	.summary-card.highlight .card-meta {
		color: rgba(255,255,255,0.5);
	}

	/* Publishers */
	.publishers {
		margin-top: 1rem;
	}

	.publishers details {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-paper);
	}

	.publishers summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.625rem 0.75rem;
		cursor: pointer;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		list-style: none;
	}

	.publishers summary::-webkit-details-marker {
		display: none;
	}

	.publishers-label {
		font-weight: 600;
		color: var(--color-ink);
	}

	.publishers-count {
		font-size: 0.5625rem;
		color: var(--color-ink-muted);
		background: var(--color-newsprint);
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
	}

	.publishers-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		padding: 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	.publisher-tag {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		padding: 0.25rem 0.5rem;
		background: var(--color-newsprint);
		border-radius: 3px;
		color: var(--color-ink);
	}

	/* Grades Section */
	.grades-section {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.grades-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-paper);
	}

	.grades-header h3 {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0;
		color: var(--color-ink);
	}

	.grade-stats {
		display: flex;
		gap: 0.5rem;
	}

	.stat {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
	}

	.stat.upgrade {
		background: rgba(34, 197, 94, 0.15);
		color: var(--color-gain);
	}

	.stat.downgrade {
		background: rgba(239, 68, 68, 0.15);
		color: var(--color-loss);
	}

	.stat.maintain {
		background: var(--color-newsprint);
		color: var(--color-ink-muted);
	}

	/* Filter Tabs */
	.filter-tabs {
		display: flex;
		gap: 0.375rem;
		padding: 0.75rem 1.25rem;
		background: var(--color-newsprint);
		border-bottom: 1px solid var(--color-border);
		overflow-x: auto;
	}

	.filter-tab {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.5rem 0.75rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-ink-muted);
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.filter-tab:hover {
		border-color: var(--color-ink-light);
		color: var(--color-ink);
	}

	.filter-tab.active {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: var(--color-paper);
	}

	.filter-tab.upgrade.active {
		background: var(--color-gain);
		border-color: var(--color-gain);
	}

	.filter-tab.downgrade.active {
		background: var(--color-loss);
		border-color: var(--color-loss);
	}

	.filter-tab.maintain.active {
		background: var(--color-ink-muted);
		border-color: var(--color-ink-muted);
	}

	/* Grades List */
	.grades-list {
		flex: 1;
		overflow-y: auto;
	}

	.grade-row {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 0.875rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
		transition: background 0.15s ease;
	}

	.grade-row:hover {
		background: var(--color-newsprint);
	}

	.grade-icon {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.grade-icon.upgrade {
		background: rgba(34, 197, 94, 0.15);
		color: var(--color-gain);
	}

	.grade-icon.downgrade {
		background: rgba(239, 68, 68, 0.15);
		color: var(--color-loss);
	}

	.grade-icon.maintain {
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.grade-main {
		flex: 1;
		min-width: 0;
	}

	.grade-firm {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.grade-rating {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.25rem;
	}

	.prev-rating {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		text-decoration: line-through;
	}

	.rating-arrow {
		color: var(--color-ink-muted);
		opacity: 0.5;
	}

	.current-rating {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		background: var(--color-newsprint);
		color: var(--color-ink);
	}

	.current-rating.upgrade {
		background: rgba(34, 197, 94, 0.15);
		color: var(--color-gain);
	}

	.current-rating.downgrade {
		background: rgba(239, 68, 68, 0.15);
		color: var(--color-loss);
	}

	.grade-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.grade-action {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.1875rem 0.375rem;
		border-radius: 3px;
	}

	.grade-action.upgrade {
		background: var(--color-gain);
		color: white;
	}

	.grade-action.downgrade {
		background: var(--color-loss);
		color: white;
	}

	.grade-action.maintain {
		background: var(--color-ink-muted);
		color: white;
	}

	.grade-date {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		color: var(--color-ink-muted);
	}

	.no-results {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		text-align: center;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.panel {
			width: 100vw;
		}

		.summary-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.filter-tabs {
			padding: 0.625rem 1rem;
		}

		.filter-tab {
			padding: 0.375rem 0.625rem;
			font-size: 0.5625rem;
		}

		.grade-row {
			padding: 0.75rem 1rem;
		}

		.grade-icon {
			width: 28px;
			height: 28px;
		}
	}
</style>
