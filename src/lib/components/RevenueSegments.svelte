<script lang="ts">
	import { formatCompact } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	interface Segment {
		name: string;
		revenue: number;
	}

	interface SegmentData {
		date: string;
		segments: Segment[];
	}

	interface Props {
		data: SegmentData[];
		loading?: boolean;
		ticker?: string;
	}

	let { data, loading = false, ticker }: Props = $props();

	// Get the most recent period's segments
	const latestSegments = $derived.by(() => {
		if (!data || data.length === 0) return [];
		const latest = data[0];
		if (!latest.segments) return [];

		// Sort by revenue descending
		return [...latest.segments]
			.filter(s => s.revenue > 0)
			.sort((a, b) => b.revenue - a.revenue);
	});

	// Calculate total revenue for percentages
	const totalRevenue = $derived(
		latestSegments.reduce((sum, s) => sum + s.revenue, 0)
	);

	// Get segment colors
	function getSegmentColor(index: number): string {
		const colors = [
			'#2563eb', // blue
			'#16a34a', // green
			'#ea580c', // orange
			'#9333ea', // purple
			'#06b6d4', // cyan
			'#ec4899', // pink
			'#eab308', // yellow
			'#64748b', // slate
		];
		return colors[index % colors.length];
	}

	// Format segment name (handle FMP's naming)
	function formatSegmentName(name: string): string {
		return name
			.replace(/([A-Z])/g, ' $1')
			.replace(/^./, str => str.toUpperCase())
			.trim();
	}
</script>

<div class="revenue-segments">
	<div class="section-header">
		<h3 class="section-title">Revenue by Segment</h3>
		{#if data && data.length > 0}
			<span class="period-label">{data[0].date}</span>
		{/if}
	</div>

	{#if loading}
		<div class="loading">
			<div class="skeleton-chart"></div>
			{#each Array(4) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if latestSegments.length === 0}
		<EmptyState
			title="No segment data"
			description="Revenue segmentation data is not available for {ticker || 'this stock'}."
			compact
		/>
	{:else}
		<div class="content">
			<!-- Stacked bar visualization -->
			<div class="segment-bar">
				{#each latestSegments as segment, i (segment.name)}
					{@const percent = (segment.revenue / totalRevenue) * 100}
					<div
						class="segment-slice"
						style="width: {percent}%; background-color: {getSegmentColor(i)}"
						title="{formatSegmentName(segment.name)}: {formatCompact(segment.revenue)} ({percent.toFixed(1)}%)"
					></div>
				{/each}
			</div>

			<!-- Segment list -->
			<div class="segment-list">
				{#each latestSegments as segment, i (segment.name)}
					{@const percent = (segment.revenue / totalRevenue) * 100}
					<div class="segment-item">
						<div class="segment-info">
							<span class="segment-dot" style="background-color: {getSegmentColor(i)}"></span>
							<span class="segment-name">{formatSegmentName(segment.name)}</span>
						</div>
						<div class="segment-values">
							<span class="segment-revenue">{formatCompact(segment.revenue)}</span>
							<span class="segment-percent">{percent.toFixed(1)}%</span>
						</div>
					</div>
				{/each}
			</div>

			<!-- Total -->
			<div class="segment-total">
				<span class="total-label">Total Revenue</span>
				<span class="total-value">{formatCompact(totalRevenue)}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.revenue-segments {
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

	.period-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.loading {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-chart {
		height: 1.5rem;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		animation: pulse 1.5s infinite;
		margin-bottom: 0.5rem;
	}

	.skeleton-row {
		height: 1.25rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.content {
		padding: 0.75rem;
	}

	.segment-bar {
		display: flex;
		height: 1.5rem;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.segment-slice {
		height: 100%;
		min-width: 4px;
		transition: opacity 0.15s ease;
	}

	.segment-slice:hover {
		opacity: 0.8;
	}

	.segment-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.segment-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0;
	}

	.segment-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.segment-dot {
		width: 10px;
		height: 10px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.segment-name {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--color-ink);
	}

	.segment-values {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.segment-revenue {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-ink);
	}

	.segment-percent {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		min-width: 40px;
		text-align: right;
	}

	.segment-total {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 0 0;
		margin-top: 0.5rem;
		border-top: 1px solid var(--color-border);
	}

	.total-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.total-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink);
	}
</style>
