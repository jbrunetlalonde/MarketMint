<script lang="ts">
	import { onMount } from 'svelte';
	import api from '$lib/utils/api';
	import { getCompanyLogoUrl } from '$lib/utils/urls';

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

	// Current month being displayed
	let currentDate = $state(new Date());

	// Get first and last day of month
	function getMonthBounds(date: Date) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		return {
			from: firstDay.toISOString().split('T')[0],
			to: lastDay.toISOString().split('T')[0]
		};
	}

	// Month label for header
	const monthLabel = $derived(() => {
		return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	});

	// Group earnings by date, deduplicating symbols within each day
	const groupedByDate = $derived.by(() => {
		const groups: Record<string, EarningsEvent[]> = {};
		for (const e of earnings) {
			if (!e?.symbol) continue;
			if (!groups[e.date]) groups[e.date] = [];
			// Only add if symbol not already in this day's list
			if (!groups[e.date].some((existing) => existing.symbol === e.symbol)) {
				groups[e.date].push(e);
			}
		}
		return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
	});

	// Summary stats (count deduplicated entries)
	const totalReports = $derived(
		groupedByDate.reduce((sum, [, events]) => sum + events.length, 0)
	);
	const totalDays = $derived(groupedByDate.length);

	// Format date for day card header
	function formatDayHeader(dateStr: string) {
		const date = new Date(dateStr + 'T00:00:00');
		return {
			dayNum: date.getDate(),
			dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
			monthYear: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
		};
	}

	// Check if date is today
	function isToday(dateStr: string): boolean {
		const today = new Date().toISOString().split('T')[0];
		return dateStr === today;
	}

	// Navigation functions
	function prevMonth() {
		const newDate = new Date(currentDate);
		newDate.setMonth(newDate.getMonth() - 1);
		currentDate = newDate;
		loadEarnings();
	}

	function nextMonth() {
		const newDate = new Date(currentDate);
		newDate.setMonth(newDate.getMonth() + 1);
		currentDate = newDate;
		loadEarnings();
	}

	// Check if prev button should be disabled (can't go before current month)
	const canGoPrev = $derived(() => {
		const now = new Date();
		return (
			currentDate.getFullYear() > now.getFullYear() ||
			(currentDate.getFullYear() === now.getFullYear() &&
				currentDate.getMonth() > now.getMonth())
		);
	});

	async function loadEarnings() {
		loading = true;
		error = null;
		try {
			const bounds = getMonthBounds(currentDate);
			const response = await api.getEarningsCalendar({ from: bounds.from, to: bounds.to });
			if (response.success && response.data) {
				earnings = response.data;
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
		<h1 class="title">Earnings Calendar</h1>
		<div class="title-rule"></div>
	</header>

	<nav class="month-nav">
		<button class="nav-btn" onclick={prevMonth} disabled={!canGoPrev()}>
			<span class="arrow">&larr;</span> Prev
		</button>
		<span class="month-label">{monthLabel()}</span>
		<button class="nav-btn" onclick={nextMonth}>
			Next <span class="arrow">&rarr;</span>
		</button>
	</nav>

	{#if !loading && earnings.length > 0}
		<p class="summary">{totalReports} upcoming earnings across {totalDays} days</p>
	{/if}

	{#if loading}
		<div class="loading-container">
			{#each Array(3) as _, i (i)}
				<div class="skeleton-day">
					<div class="skeleton-header"></div>
					<div class="skeleton-grid">
						{#each Array(6) as _, j (j)}
							<div class="skeleton-card"></div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="error-container">
			<p class="error">{error}</p>
			<button onclick={() => loadEarnings()} class="retry-btn">Try Again</button>
		</div>
	{:else if earnings.length === 0}
		<div class="empty-state">
			<p>No earnings reports scheduled for {monthLabel()}</p>
		</div>
	{:else}
		<div class="calendar-container">
			{#each groupedByDate as [date, events] (date)}
				{@const dayInfo = formatDayHeader(date)}
				<div class="day-card" class:today={isToday(date)}>
					<div class="day-header">
						<div class="day-info">
							<span class="day-num">{dayInfo.dayNum}</span>
							<div class="day-text">
								<span class="day-name">{dayInfo.dayName}</span>
								<span class="month-year">{dayInfo.monthYear}</span>
							</div>
						</div>
						<span class="report-count">{events.length} report{events.length !== 1 ? 's' : ''}</span>
					</div>
					<div class="ticker-grid">
						{#each events as event (event.symbol)}
							<a href="/ticker/{event.symbol}" class="ticker-card">
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
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.earnings-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.title {
		font-family: var(--font-mono);
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-ink);
		margin: 0;
	}

	.title-rule {
		height: 2px;
		background: var(--color-ink);
		margin-top: 0.75rem;
	}

	.month-nav {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.nav-btn {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-ink);
		background: transparent;
		border: 1px solid var(--color-border);
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.nav-btn:hover:not(:disabled) {
		background: var(--color-newsprint-dark);
	}

	.nav-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.arrow {
		font-size: 1rem;
	}

	.month-label {
		font-family: var(--font-mono);
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.summary {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		margin-bottom: 2rem;
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.skeleton-day {
		background: var(--color-paper);
		border-radius: 8px;
		overflow: hidden;
	}

	.skeleton-header {
		height: 56px;
		background: var(--color-newsprint-dark);
	}

	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 1rem;
		padding: 1.5rem;
	}

	.skeleton-card {
		height: 48px;
		background: var(--color-newsprint-dark);
		border-radius: 24px;
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

	.error-container {
		text-align: center;
		padding: 4rem 2rem;
		background: var(--color-paper);
		border-radius: 8px;
	}

	.error {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-loss);
		margin-bottom: 1rem;
	}

	.retry-btn {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-newsprint);
		background: var(--color-ink);
		border: none;
		padding: 0.625rem 1.25rem;
		border-radius: 4px;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.retry-btn:hover {
		opacity: 0.85;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: var(--color-paper);
		border-radius: 8px;
	}

	.empty-state p {
		font-family: var(--font-mono);
		font-size: 0.9375rem;
		color: var(--color-ink-muted);
	}

	.calendar-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.day-card {
		background: var(--color-paper);
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	.day-card.today {
		border-color: var(--color-ink);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.day-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.25rem;
		background: var(--color-ink);
		color: var(--color-newsprint);
	}

	.day-info {
		display: flex;
		align-items: center;
		gap: 0.875rem;
	}

	.day-num {
		font-family: var(--font-mono);
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1;
	}

	.day-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.day-name {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.month-year {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		opacity: 0.75;
	}

	.report-count {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		opacity: 0.85;
	}

	.ticker-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 1rem;
		padding: 1.25rem;
	}

	.ticker-card {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.625rem 1rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		border-radius: 24px;
		text-decoration: none;
		color: inherit;
		transition: all 0.15s;
	}

	.ticker-card:hover {
		border-color: var(--color-ink);
		background: var(--color-paper);
	}

	.ticker-logo {
		width: 24px;
		height: 24px;
		object-fit: contain;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.ticker-symbol {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	@media (max-width: 1200px) {
		.ticker-grid {
			grid-template-columns: repeat(5, 1fr);
		}
	}

	@media (max-width: 1000px) {
		.ticker-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	@media (max-width: 768px) {
		.earnings-page {
			padding: 1.5rem 1rem 3rem;
		}

		.title {
			font-size: 2rem;
		}

		.ticker-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 0.75rem;
			padding: 1rem;
		}

		.ticker-card {
			padding: 0.5rem 0.75rem;
		}

		.ticker-logo {
			width: 20px;
			height: 20px;
		}

		.ticker-symbol {
			font-size: 0.75rem;
		}

		.skeleton-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 480px) {
		.month-nav {
			flex-wrap: wrap;
			justify-content: center;
		}

		.ticker-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.skeleton-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
