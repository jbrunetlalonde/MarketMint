<script lang="ts">
	import { onMount } from 'svelte';
	import api from '$lib/utils/api';
	import { getCompanyLogoUrl } from '$lib/utils/urls';
	import EmptyState from '$lib/components/EmptyState.svelte';

	interface EarningsEvent {
		symbol: string;
		date: string;
		time: string;
		epsEstimate: number | null;
		revenueEstimate?: number | null;
	}

	let loading = $state(true);
	let error = $state<string | null>(null);
	let earnings = $state<EarningsEvent[]>([]);
	let daysToFetch = $state(14);
	let lastUpdated = $state<Date | null>(null);

	function getTimeLabel(time: string): string {
		if (time === 'amc' || time === 'After Market Close') return 'After Close';
		if (time === 'bmo' || time === 'Before Market Open') return 'Before Open';
		return time || 'TBD';
	}

	function getTimeClass(time: string): string {
		if (time === 'amc' || time === 'After Market Close') return 'time-amc';
		if (time === 'bmo' || time === 'Before Market Open') return 'time-bmo';
		return '';
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function getDayLabel(dateStr: string): string {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const date = new Date(dateStr + 'T00:00:00');

		if (date.getTime() === today.getTime()) return 'Today';
		if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
		return '';
	}

	function formatNumber(value: number | null | undefined): string {
		if (value === null || value === undefined) return '-';
		if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
		if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
		return `$${value.toFixed(2)}`;
	}

	const groupedByDate = $derived.by(() => {
		const groups: Record<string, EarningsEvent[]> = {};
		for (const e of earnings) {
			if (!groups[e.date]) groups[e.date] = [];
			groups[e.date].push(e);
		}
		return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
	});

	async function loadEarnings() {
		loading = true;
		error = null;
		try {
			const response = await api.getEarningsCalendar(daysToFetch);
			if (response.success && response.data) {
				earnings = response.data;
				lastUpdated = new Date();
			} else {
				earnings = [];
			}
		} catch (err) {
			error = 'Failed to load earnings calendar';
			earnings = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadEarnings();
	});
</script>

<svelte:head>
	<title>Earnings Calendar - MarketMint</title>
</svelte:head>

<div class="earnings-page">
	<header class="page-header">
		<div class="header-content">
			<h1 class="headline headline-xl">Earnings Calendar</h1>
			<p class="subhead">Upcoming company earnings reports and estimates</p>
		</div>
		<div class="header-controls">
			<select bind:value={daysToFetch} onchange={() => loadEarnings()} class="input">
				<option value={7}>Next 7 days</option>
				<option value={14}>Next 14 days</option>
				<option value={30}>Next 30 days</option>
			</select>
			<button onclick={() => loadEarnings()} class="btn btn-secondary" disabled={loading}>
				{loading ? 'Loading...' : 'Refresh'}
			</button>
		</div>
	</header>

	{#if lastUpdated}
		<p class="last-updated">
			Last updated: {lastUpdated.toLocaleTimeString()}
		</p>
	{/if}

	{#if loading}
		<div class="loading-grid">
			{#each Array(5) as _, i (i)}
				<div class="skeleton-card"></div>
			{/each}
		</div>
	{:else if error}
		<div class="card error-card">
			<p class="error">{error}</p>
			<button onclick={() => loadEarnings()} class="btn btn-primary">Try Again</button>
		</div>
	{:else if earnings.length === 0}
		<EmptyState
			title="No upcoming earnings"
			description="No earnings reports scheduled in this time range"
			icon="calendar"
		/>
	{:else}
		<div class="calendar-grid">
			{#each groupedByDate as [date, events] (date)}
				<div class="date-card card">
					<div class="date-header">
						<span class="date-formatted">{formatDate(date)}</span>
						{#if getDayLabel(date)}
							<span class="date-label">{getDayLabel(date)}</span>
						{/if}
						<span class="event-count">{events.length} report{events.length !== 1 ? 's' : ''}</span>
					</div>

					<div class="earnings-list">
						{#each events as event (event.symbol)}
							<a href="/ticker/{event.symbol}" class="earnings-row">
								<img
									src={getCompanyLogoUrl(event.symbol)}
									alt=""
									class="company-logo"
									loading="lazy"
									onerror={(e) => {
										const img = e.currentTarget as HTMLImageElement;
										img.style.display = 'none';
									}}
								/>
								<div class="company-info">
									<span class="symbol">{event.symbol}</span>
									<span class="time {getTimeClass(event.time)}">{getTimeLabel(event.time)}</span>
								</div>
								{#if event.epsEstimate !== null}
									<div class="estimate">
										<span class="estimate-label">EPS Est</span>
										<span class="estimate-value">${event.epsEstimate?.toFixed(2)}</span>
									</div>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.earnings-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.header-content {
		flex: 1;
	}

	.subhead {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		margin-top: 0.5rem;
	}

	.header-controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.last-updated {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin-bottom: 1.5rem;
	}

	.loading-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.skeleton-card {
		height: 200px;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.error-card {
		text-align: center;
		padding: 3rem;
	}

	.error {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-loss);
		margin-bottom: 1rem;
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.date-card {
		overflow: hidden;
	}

	.date-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--color-newsprint-dark);
		border-bottom: 1px solid var(--color-border);
	}

	.date-formatted {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.date-label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.125rem 0.375rem;
		background: var(--color-ink);
		color: var(--color-newsprint);
		border-radius: 2px;
	}

	.event-count {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
	}

	.earnings-list {
		padding: 0.5rem;
	}

	.earnings-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.5rem;
		text-decoration: none;
		color: inherit;
		border-radius: 4px;
		transition: background-color 0.15s;
	}

	.earnings-row:hover {
		background: var(--color-newsprint-dark);
	}

	.company-logo {
		width: 28px;
		height: 28px;
		object-fit: contain;
		border-radius: 4px;
		background: var(--color-paper);
		flex-shrink: 0;
	}

	.company-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.symbol {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.time {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
	}

	.time-bmo {
		color: #d97706;
	}

	.time-amc {
		color: #7c3aed;
	}

	.estimate {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
	}

	.estimate-label {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.estimate-value {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			gap: 1rem;
		}

		.header-controls {
			width: 100%;
		}

		.header-controls select {
			flex: 1;
		}

		.calendar-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
