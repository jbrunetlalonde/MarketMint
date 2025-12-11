<script lang="ts">
	import { onMount } from 'svelte';
	import { API_BASE } from '$lib/utils/api/request';

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
		if (a.includes('upgrade') || a === 'buy' || a === 'strong buy') return 'action-upgrade';
		if (a.includes('downgrade') || a === 'sell' || a === 'strong sell') return 'action-downgrade';
		return 'action-maintain';
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
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="overlay" onclick={onClose}>
	<div class="panel" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Analyst Details" tabindex="-1">
		<div class="panel-header">
			<h2>Analyst Ratings for {symbol}</h2>
			<button class="close-btn" onclick={onClose} aria-label="Close">X</button>
		</div>

		{#if loading}
			<div class="loading-state">
				<div class="skeleton-block"></div>
				<div class="skeleton-block"></div>
				<div class="skeleton-block"></div>
			</div>
		{:else if error}
			<p class="error-text">{error}</p>
		{:else}
			{#if summary}
				<div class="summary-section">
					<h3>Price Target Summary</h3>
					<div class="summary-grid">
						<div class="summary-item">
							<span class="summary-label">Last Month</span>
							<span class="summary-value">{formatPrice(summary.lastMonthAvgPriceTarget)}</span>
							<span class="summary-count">{summary.lastMonthCount} analysts</span>
						</div>
						<div class="summary-item">
							<span class="summary-label">Last Quarter</span>
							<span class="summary-value">{formatPrice(summary.lastQuarterAvgPriceTarget)}</span>
							<span class="summary-count">{summary.lastQuarterCount} analysts</span>
						</div>
						<div class="summary-item">
							<span class="summary-label">Last Year</span>
							<span class="summary-value">{formatPrice(summary.lastYearAvgPriceTarget)}</span>
							<span class="summary-count">{summary.lastYearCount} analysts</span>
						</div>
						<div class="summary-item">
							<span class="summary-label">All Time</span>
							<span class="summary-value">{formatPrice(summary.allTimeAvgPriceTarget)}</span>
							<span class="summary-count">{summary.allTimeCount} analysts</span>
						</div>
					</div>

					{#if summary.publishers && summary.publishers.length > 0}
						<div class="publishers">
							<span class="publishers-label">Publishers:</span>
							<span class="publishers-list">{summary.publishers.slice(0, 10).join(', ')}{summary.publishers.length > 10 ? '...' : ''}</span>
						</div>
					{/if}
				</div>
			{/if}

			{#if grades.length > 0}
				<div class="grades-section">
					<h3>Recent Analyst Actions</h3>
					<div class="grades-table-wrapper">
						<table class="grades-table">
							<thead>
								<tr>
									<th>Date</th>
									<th>Firm</th>
									<th>Action</th>
									<th>Previous</th>
									<th>Current</th>
								</tr>
							</thead>
							<tbody>
								{#each grades as grade (grade.date + grade.gradingCompany)}
									<tr>
										<td class="date-cell">{formatDate(grade.date)}</td>
										<td class="firm-cell">{grade.gradingCompany}</td>
										<td class="action-cell">
											<span class="action-badge {getActionClass(grade.action)}">
												{grade.action || '--'}
											</span>
										</td>
										<td class="grade-cell">{grade.previousGrade || '--'}</td>
										<td class="grade-cell">{grade.newGrade || '--'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
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
		width: min(600px, 90vw);
		height: 100%;
		background: var(--color-paper);
		border-left: 3px solid var(--color-ink);
		overflow-y: auto;
		animation: slideIn 0.2s ease-out;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 2px solid var(--color-ink);
		background: var(--color-ink);
		color: var(--color-paper);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.panel-header h2 {
		font-family: var(--font-headline);
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
	}

	.close-btn {
		background: transparent;
		border: 1px solid var(--color-paper);
		color: var(--color-paper);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 700;
		padding: 0.25rem 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: var(--color-paper);
		color: var(--color-ink);
	}

	.loading-state {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.skeleton-block {
		height: 4rem;
		background: var(--color-newsprint-dark);
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.error-text {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-loss);
		text-align: center;
		padding: 2rem;
	}

	.summary-section {
		padding: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.summary-section h3 {
		font-family: var(--font-headline);
		font-size: 0.875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 1rem 0;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		padding: 0.75rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
	}

	.summary-label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.summary-value {
		font-family: var(--font-mono);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.summary-count {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.publishers {
		margin-top: 1rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.publishers-label {
		font-weight: 600;
		color: var(--color-ink-muted);
	}

	.publishers-list {
		color: var(--color-ink);
	}

	.grades-section {
		padding: 1.5rem;
	}

	.grades-section h3 {
		font-family: var(--font-headline);
		font-size: 0.875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 1rem 0;
	}

	.grades-table-wrapper {
		overflow-x: auto;
	}

	.grades-table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.grades-table th {
		text-align: left;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		padding: 0.5rem;
		border-bottom: 2px solid var(--color-ink);
	}

	.grades-table td {
		padding: 0.625rem 0.5rem;
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
	}

	.grades-table tr:hover {
		background: var(--color-newsprint);
	}

	.date-cell {
		white-space: nowrap;
		color: var(--color-ink-muted);
	}

	.firm-cell {
		font-weight: 600;
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.action-badge {
		display: inline-block;
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.action-upgrade {
		background: var(--color-gain);
		color: white;
	}

	.action-downgrade {
		background: var(--color-loss);
		color: white;
	}

	.action-maintain {
		background: var(--color-ink-muted);
		color: white;
	}

	.grade-cell {
		color: var(--color-ink);
	}
</style>
