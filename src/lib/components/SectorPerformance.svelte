<script lang="ts">
	import { onMount } from 'svelte';
	import api from '$lib/utils/api';
	import { formatPercent } from '$lib/utils/formatters';

	interface SectorData {
		sector: string;
		changePercent: number;
	}

	let loading = $state(true);
	let sectorData = $state<SectorData[]>([]);
	let error = $state<string | null>(null);

	const sortedData = $derived(
		[...sectorData].filter((s) => s?.sector).sort((a, b) => b.changePercent - a.changePercent)
	);

	const maxAbsChange = $derived(Math.max(...sortedData.map((s) => Math.abs(s.changePercent)), 1));

	// Sector short names for compact display
	const sectorShortNames: Record<string, string> = {
		'Financial Services': 'Financials',
		'Consumer Defensive': 'Cons. Defensive',
		'Consumer Cyclical': 'Cons. Cyclical',
		'Communication Services': 'Communication',
		'Basic Materials': 'Materials'
	};

	function getShortName(sector: string): string {
		return sectorShortNames[sector] || sector;
	}

	onMount(async () => {
		try {
			const response = await api.getSectorPerformance();
			if (response.success && response.data) {
				sectorData = response.data;
			} else if (response.error) {
				error = response.error.message;
			}
		} catch (err) {
			error = 'Failed to load sector data';
			console.error('Sector performance error:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="sector-performance">
	{#if loading}
		<div class="loading">
			{#each Array(6) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if error}
		<p class="error-msg">{error}</p>
	{:else if sortedData.length === 0}
		<p class="no-data">No sector data available</p>
	{:else}
		<div class="sector-list">
			{#each sortedData as sector, i (sector.sector ?? `sector-${i}`)}
				{@const isPositive = sector.changePercent >= 0}
				{@const barWidth = Math.abs(sector.changePercent / maxAbsChange) * 100}
				<div class="sector-row" class:positive={isPositive} class:negative={!isPositive}>
					<div class="sector-header">
						<span class="sector-name">{getShortName(sector.sector)}</span>
						<span class="sector-change" class:positive={isPositive} class:negative={!isPositive}>
							{isPositive ? '+' : ''}{formatPercent(sector.changePercent)}
						</span>
					</div>
					<div class="bar-track">
						<div
							class="bar-fill"
							class:positive={isPositive}
							class:negative={!isPositive}
							style="width: {barWidth}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.sector-performance {
		margin-top: 0.5rem;
	}

	.loading {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skeleton-row {
		height: 2.5rem;
		background: var(--color-newsprint-dark);
		border-radius: 6px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}

	.no-data,
	.error-msg {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		text-align: center;
		padding: 1rem 0;
	}

	.error-msg {
		color: var(--color-loss);
	}

	.sector-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sector-row {
		padding: 0.5rem 0.75rem;
		background: var(--color-paper);
		border-radius: 6px;
		border: 1px solid var(--color-border);
		transition: all 0.15s;
	}

	.sector-row:hover {
		border-color: var(--color-ink-light);
	}

	.sector-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.375rem;
	}

	.sector-name {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.sector-change {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
	}

	.sector-change.positive {
		color: var(--color-gain);
	}

	.sector-change.negative {
		color: var(--color-loss);
	}

	.bar-track {
		height: 6px;
		background: var(--color-newsprint-dark);
		border-radius: 3px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.4s ease;
	}

	.bar-fill.positive {
		background: linear-gradient(90deg, var(--color-gain) 0%, #10b981 100%);
	}

	.bar-fill.negative {
		background: linear-gradient(90deg, var(--color-loss) 0%, #f87171 100%);
	}
</style>
