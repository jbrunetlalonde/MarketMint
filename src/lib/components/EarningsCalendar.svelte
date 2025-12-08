<script lang="ts">
	import { onMount } from 'svelte';
	import api from '$lib/utils/api';
	import { getCompanyLogoUrl } from '$lib/utils/urls';

	interface EarningsEvent {
		symbol: string;
		date: string;
		time: string;
		epsEstimate: number | null;
	}

	let loading = $state(true);
	let error = $state<string | null>(null);
	let earnings = $state<EarningsEvent[]>([]);

	function getTimeLabel(time: string): string {
		if (time === 'amc' || time === 'After Market Close') return 'AMC';
		if (time === 'bmo' || time === 'Before Market Open') return 'BMO';
		return 'TBD';
	}

	function getDateGroup(dateStr: string): string {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const date = new Date(dateStr + 'T00:00:00');

		if (date.getTime() === today.getTime()) return 'Today';
		if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
		return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	// Deduplicate earnings by symbol within each group
	const groupedEarnings = $derived.by(() => {
		const groups: Record<string, EarningsEvent[]> = {};
		for (const e of earnings) {
			if (!e?.symbol) continue;
			const group = getDateGroup(e.date);
			if (!groups[group]) groups[group] = [];
			// Only add if symbol not already in this group
			if (!groups[group].some((existing) => existing.symbol === e.symbol)) {
				groups[group].push(e);
			}
		}
		return Object.entries(groups).slice(0, 5);
	});

	async function loadEarnings() {
		loading = true;
		error = null;
		try {
			const response = await api.getEarningsCalendar({ days: 14 });
			if (response.success && response.data) {
				earnings = response.data.slice(0, 100);
			} else {
				earnings = [];
			}
		} catch (err) {
			error = 'Failed to load earnings';
			earnings = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadEarnings();
	});
</script>

<div class="earnings-widget">
	{#if loading}
		<div class="loading">
			{#each Array(3) as _, i (i)}
				<div class="skeleton-group">
					<div class="skeleton-header"></div>
					<div class="skeleton-row"></div>
				</div>
			{/each}
		</div>
	{:else if error}
		<p class="error">{error}</p>
	{:else if earnings.length === 0}
		<p class="no-data">No upcoming earnings</p>
	{:else}
		<div class="earnings-groups">
			{#each groupedEarnings as [group, events] (group)}
				<div class="date-group">
					<div class="date-header">{group}</div>
					<div class="ticker-row">
						{#each events.slice(0, 12) as event (event.symbol)}
							<a href="/ticker/{event.symbol}" class="ticker-chip">
								<img
									src={getCompanyLogoUrl(event.symbol)}
									alt=""
									class="ticker-logo"
									loading="lazy"
									onerror={(e) => {
										const img = e.currentTarget as HTMLImageElement;
										img.style.display = 'none';
									}}
								/>
								<span class="ticker-symbol">{event.symbol}</span>
							</a>
						{/each}
						{#if events.length > 12}
							<span class="more-count">+{events.length - 12}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
		<a href="/earnings" class="view-all">View Full Calendar</a>
	{/if}
</div>

<style>
	.earnings-widget {
		margin-top: 0.5rem;
	}

	.loading {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skeleton-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.skeleton-header {
		height: 0.75rem;
		width: 4rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
	}

	.skeleton-row {
		height: 1.75rem;
		background: var(--color-newsprint-dark);
		border-radius: 12px;
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

	.error,
	.no-data {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		text-align: center;
		padding: 1rem 0;
	}

	.error {
		color: var(--color-loss);
	}

	.earnings-groups {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.date-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.date-header {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.ticker-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		align-items: center;
	}

	.ticker-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.5rem 0.2rem 0.3rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		text-decoration: none;
		color: inherit;
		transition: all 0.15s;
	}

	.ticker-chip:hover {
		border-color: var(--color-ink);
		background: var(--color-newsprint);
	}

	.ticker-logo {
		width: 16px;
		height: 16px;
		object-fit: contain;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.ticker-symbol {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.more-count {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		padding: 0.25rem 0.5rem;
	}

	.view-all {
		display: block;
		margin-top: 0.875rem;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-ink-muted);
		text-decoration: none;
		text-align: center;
		padding: 0.5rem;
		border-top: 1px solid var(--color-border);
		transition: color 0.15s;
	}

	.view-all:hover {
		color: var(--color-ink);
	}
</style>
