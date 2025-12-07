<script lang="ts">
	import { onMount } from 'svelte';
	import api from '$lib/utils/api';

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
		if (time === 'amc' || time === 'After Market Close') return 'After Close';
		if (time === 'bmo' || time === 'Before Market Open') return 'Before Open';
		return time || 'TBD';
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

	const groupedEarnings = $derived(() => {
		const groups: Record<string, EarningsEvent[]> = {};
		for (const e of earnings) {
			const group = getDateGroup(e.date);
			if (!groups[group]) groups[group] = [];
			groups[group].push(e);
		}
		return Object.entries(groups).slice(0, 4);
	});

	async function loadEarnings() {
		loading = true;
		error = null;
		try {
			const response = await api.getEarningsCalendar(7);
			if (response.success && response.data) {
				earnings = response.data.slice(0, 15);
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

<div class="earnings-calendar">
	{#if loading}
		<div class="loading">
			{#each Array(4) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if error}
		<p class="error">{error}</p>
	{:else if earnings.length === 0}
		<p class="no-data">No upcoming earnings</p>
	{:else}
		<div class="earnings-groups">
			{#each groupedEarnings() as [group, events] (group)}
				<div class="date-group">
					<div class="date-header">{group}</div>
					<div class="events">
						{#each events.slice(0, 4) as event (event.symbol + event.date)}
							<a href="/ticker/{event.symbol}" class="event-row">
								<span class="event-symbol">{event.symbol}</span>
								<span class="event-time">{getTimeLabel(event.time)}</span>
							</a>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.earnings-calendar {
		margin-top: 0.5rem;
	}

	.loading {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-row {
		height: 1.25rem;
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
		border-left: 2px solid var(--color-border);
		padding-left: 0.5rem;
	}

	.date-header {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		margin-bottom: 0.25rem;
	}

	.events {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.event-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.125rem 0;
		text-decoration: none;
		color: inherit;
		transition: background-color 0.1s;
		border-radius: 2px;
	}

	.event-row:hover {
		background-color: var(--color-newsprint-dark);
	}

	.event-symbol {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-ink);
		font-family: var(--font-mono);
	}

	.event-time {
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}
</style>
