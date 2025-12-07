<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';

	interface RatingMetrics {
		dcfScore?: number;
		roeScore?: number;
		peScore?: number;
		pbScore?: number;
		deScore?: number;
		roaScore?: number;
	}

	interface Props {
		rating?: string;
		ratingScore?: number;
		ratingRecommendation?: string;
		metrics?: RatingMetrics;
		loading?: boolean;
	}

	let { rating, ratingScore, ratingRecommendation, metrics, loading = false }: Props = $props();

	const isDark = $derived(themeStore.resolvedTheme === 'dark');

	const chartMetrics = [
		{ key: 'dcfScore', label: 'DCF', angle: 0 },
		{ key: 'roeScore', label: 'ROE', angle: 60 },
		{ key: 'peScore', label: 'P/E', angle: 120 },
		{ key: 'pbScore', label: 'P/B', angle: 180 },
		{ key: 'deScore', label: 'D/E', angle: 240 },
		{ key: 'roaScore', label: 'ROA', angle: 300 }
	];

	const size = 200;
	const center = size / 2;
	const maxRadius = 70;

	function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
		const rad = ((angle - 90) * Math.PI) / 180;
		return {
			x: center + radius * Math.cos(rad),
			y: center + radius * Math.sin(rad)
		};
	}

	function getPolygonPoints(values: number[]): string {
		return chartMetrics
			.map((m, i) => {
				const value = values[i] || 0;
				const radius = (value / 5) * maxRadius;
				const point = polarToCartesian(m.angle, radius);
				return `${point.x},${point.y}`;
			})
			.join(' ');
	}

	const gridLevels = [1, 2, 3, 4, 5];

	function getGridPolygon(level: number): string {
		const radius = (level / 5) * maxRadius;
		return chartMetrics
			.map((m) => {
				const point = polarToCartesian(m.angle, radius);
				return `${point.x},${point.y}`;
			})
			.join(' ');
	}

	const metricValues = $derived(
		chartMetrics.map((m) => {
			if (!metrics) return 2.5;
			const val = (metrics as Record<string, number | undefined>)[m.key];
			return val ?? 2.5;
		})
	);

	function getRatingColor(score: number): string {
		if (score >= 4) return 'var(--color-gain)';
		if (score >= 3) return 'var(--color-accent)';
		if (score >= 2) return 'var(--color-ink)';
		return 'var(--color-loss)';
	}
</script>

<div class="ratings-radar">
	<div class="section-header">
		<h3 class="section-title">Analyst Rating</h3>
	</div>

	{#if loading}
		<div class="loading">Loading rating data...</div>
	{:else}
		<div class="content">
			<div class="rating-display">
				{#if rating}
					<div class="rating-grade" style="color: {getRatingColor(ratingScore ?? 0)}">
						{rating}
					</div>
					{#if ratingScore}
						<div class="rating-score">{ratingScore.toFixed(1)} / 5</div>
					{/if}
				{:else}
					<div class="no-rating">No rating available</div>
				{/if}
			</div>

			<div class="chart-container">
				<svg width={size} height={size} viewBox="0 0 {size} {size}">
					{#each gridLevels as level}
						<polygon
							points={getGridPolygon(level)}
							fill="none"
							stroke={isDark ? '#3d3d3d' : '#e0e0e0'}
							stroke-width="1"
						/>
					{/each}

					{#each chartMetrics as metric}
						{@const endPoint = polarToCartesian(metric.angle, maxRadius)}
						<line
							x1={center}
							y1={center}
							x2={endPoint.x}
							y2={endPoint.y}
							stroke={isDark ? '#3d3d3d' : '#e0e0e0'}
							stroke-width="1"
						/>
						{@const labelPoint = polarToCartesian(metric.angle, maxRadius + 18)}
						<text
							x={labelPoint.x}
							y={labelPoint.y}
							text-anchor="middle"
							dominant-baseline="middle"
							font-size="12"
							font-weight="500"
							fill={isDark ? '#a0a0a0' : '#666666'}
							font-family="'IBM Plex Mono', monospace"
						>
							{metric.label}
						</text>
					{/each}

					<polygon
						points={getPolygonPoints(metricValues)}
						fill={isDark ? 'rgba(74, 222, 128, 0.2)' : 'rgba(13, 122, 62, 0.2)'}
						stroke={isDark ? '#4ade80' : '#0d7a3e'}
						stroke-width="2"
					/>

					{#each chartMetrics as metric, i}
						{@const value = metricValues[i]}
						{@const radius = (value / 5) * maxRadius}
						{@const point = polarToCartesian(metric.angle, radius)}
						<circle
							cx={point.x}
							cy={point.y}
							r="4"
							fill={isDark ? '#4ade80' : '#0d7a3e'}
						/>
					{/each}
				</svg>
			</div>
		</div>
	{/if}
</div>

<style>
	.ratings-radar {
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

	.loading {
		padding: 2rem;
		text-align: center;
		color: var(--color-ink-muted);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
	}

	.content {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.rating-display {
		text-align: center;
	}

	.rating-grade {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 2.5rem;
		font-weight: 700;
		line-height: 1;
	}

	.rating-score {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		margin-top: 8px;
		font-weight: 500;
	}

	.no-rating {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		font-style: italic;
	}

	.chart-container {
		display: flex;
		justify-content: center;
	}

	svg {
		max-width: 100%;
		height: auto;
	}
</style>
