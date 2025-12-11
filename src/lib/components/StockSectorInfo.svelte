<script lang="ts">
	import { onMount } from 'svelte';
	import api from '$lib/utils/api';
	import { formatPercent } from '$lib/utils/formatters';

	interface Props {
		sector: string | null;
		industry: string | null;
	}

	let { sector, industry }: Props = $props();

	let sectorPerformance = $state<number | null>(null);
	let loading = $state(true);

	onMount(async () => {
		if (!sector) {
			loading = false;
			return;
		}

		try {
			const response = await api.getSectorPerformance();
			if (response.success && response.data) {
				const match = response.data.find(
					(s: { sector: string }) => s.sector.toLowerCase() === sector?.toLowerCase()
				);
				if (match) {
					sectorPerformance = match.changePercent;
				}
			}
		} catch (err) {
			console.error('Failed to fetch sector performance:', err);
		} finally {
			loading = false;
		}
	});

	const isPositive = $derived(sectorPerformance !== null && sectorPerformance >= 0);
</script>

{#if sector || industry}
	<div class="sector-info">
		<div class="info-row">
			{#if sector}
				<div class="info-item">
					<span class="info-label">Sector</span>
					<span class="info-value">{sector}</span>
					{#if !loading && sectorPerformance !== null}
						<span class="sector-perf" class:positive={isPositive} class:negative={!isPositive}>
							{isPositive ? '+' : ''}{formatPercent(sectorPerformance)}
						</span>
					{/if}
				</div>
			{/if}
			{#if industry}
				<div class="info-item">
					<span class="info-label">Industry</span>
					<span class="info-value">{industry}</span>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.sector-info {
		border-top: 1px dotted var(--color-border);
		padding-top: 1rem;
		margin-top: 1rem;
	}

	.info-row {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.info-label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		min-width: 50px;
	}

	.info-value {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.sector-perf {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
	}

	.sector-perf.positive {
		background: rgba(13, 122, 62, 0.1);
		color: var(--color-gain);
	}

	.sector-perf.negative {
		background: rgba(196, 30, 58, 0.1);
		color: var(--color-loss);
	}
</style>
