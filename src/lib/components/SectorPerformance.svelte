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
		[...sectorData].sort((a, b) => b.changePercent - a.changePercent)
	);

	const maxAbsChange = $derived(
		Math.max(...sortedData.map((s) => Math.abs(s.changePercent)), 1)
	);

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
			{#each Array(5) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if error}
		<p class="error-msg">{error}</p>
	{:else if sortedData.length === 0}
		<p class="no-data">No sector data available</p>
	{:else}
		<div class="sector-list">
			{#each sortedData as sector (sector.sector)}
				{@const isPositive = sector.changePercent >= 0}
				{@const barWidth = Math.abs(sector.changePercent / maxAbsChange) * 100}
				<div class="sector-row">
					<span class="sector-name">{sector.sector}</span>
					<div class="bar-container">
						<div
							class="bar"
							class:positive={isPositive}
							class:negative={!isPositive}
							style="width: {barWidth}%"
						></div>
					</div>
					<span class="sector-change" class:positive={isPositive} class:negative={!isPositive}>
						{formatPercent(sector.changePercent)}
					</span>
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
		gap: 0.5rem;
	}

	.skeleton-row {
		height: 1.5rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
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
		gap: 0.375rem;
	}

	.sector-row {
		display: grid;
		grid-template-columns: 90px 1fr 50px;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
		border-radius: 2px;
	}

	.sector-name {
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--color-ink-light);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bar-container {
		height: 0.5rem;
		background: var(--color-newsprint-dark);
		border-radius: 1px;
		overflow: hidden;
	}

	.bar {
		height: 100%;
		border-radius: 1px;
		transition: width 0.3s ease;
	}

	.bar.positive {
		background: var(--color-gain);
	}

	.bar.negative {
		background: var(--color-loss);
	}

	.sector-change {
		font-size: 0.7rem;
		font-weight: 600;
		text-align: right;
		font-family: var(--font-mono);
	}

	.sector-change.positive {
		color: var(--color-gain);
	}

	.sector-change.negative {
		color: var(--color-loss);
	}
</style>
