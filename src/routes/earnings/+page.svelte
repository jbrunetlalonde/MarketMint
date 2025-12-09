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

	interface SearchResult {
		symbol: string;
		name: string;
		exchange: string;
	}

	interface EarningsSearchResult extends EarningsEvent {
		name?: string;
	}

	let loading = $state(true);
	let error = $state<string | null>(null);
	let earnings = $state<EarningsEvent[]>([]);
	let expandedDates = $state<Set<string>>(new Set());
	let initializedExpanded = false;

	// Search state
	let searchQuery = $state('');
	let searchInputRef: HTMLInputElement | undefined = $state();
	let searchSuggestions = $state<SearchResult[]>([]);
	let showSuggestions = $state(false);
	let searchLoading = $state(false);
	let allEarnings = $state<EarningsEvent[]>([]);
	let allEarningsLoaded = $state(false);
	let globalSearchResults = $state<EarningsSearchResult[]>([]);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Load all upcoming earnings (90 days) for global search
	async function loadAllEarnings(): Promise<EarningsEvent[]> {
		if (allEarningsLoaded && allEarnings.length > 0) return allEarnings;

		const today = new Date();
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 90);

		const from = today.toISOString().split('T')[0];
		const to = futureDate.toISOString().split('T')[0];

		try {
			const response = await api.getEarningsCalendar({ from, to });
			if (response.success && response.data && response.data.length > 0) {
				allEarnings = response.data;
				allEarningsLoaded = true;
				return allEarnings;
			}
		} catch {
			// Continue with empty array
		}
		allEarningsLoaded = true;
		return allEarnings;
	}

	// Debounced search function
	async function handleSearchInput() {
		const query = searchQuery.trim();

		if (query.length < 1) {
			searchSuggestions = [];
			showSuggestions = false;
			globalSearchResults = [];
			return;
		}

		// Debounce
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			searchLoading = true;
			showSuggestions = true;

			const upperQuery = query.toUpperCase();

			// Use currently loaded earnings data + fetch global data in parallel
			const [globalData, suggestionsResponse] = await Promise.all([
				loadAllEarnings(),
				api.searchSymbols(query, 8).catch(() => ({ success: false, data: [] }))
			]);

			// Combine current month earnings with global data (deduplicate by symbol+date)
			const seen = new Set<string>();
			const combinedEarnings: EarningsEvent[] = [];

			// Add current month's earnings first (already loaded)
			for (const e of earnings) {
				const key = `${e.symbol}-${e.date}`;
				if (!seen.has(key)) {
					seen.add(key);
					combinedEarnings.push(e);
				}
			}

			// Add global earnings
			for (const e of globalData) {
				const key = `${e.symbol}-${e.date}`;
				if (!seen.has(key)) {
					seen.add(key);
					combinedEarnings.push(e);
				}
			}

			// Update suggestions
			if (suggestionsResponse.success && suggestionsResponse.data) {
				searchSuggestions = suggestionsResponse.data;
			} else {
				searchSuggestions = [];
			}

			// Search for exact and partial matches
			const exactMatches = combinedEarnings.filter((e) => e.symbol === upperQuery);
			const partialMatches = combinedEarnings.filter((e) =>
				e.symbol !== upperQuery && e.symbol.startsWith(upperQuery)
			);
			const allMatches = [...exactMatches, ...partialMatches];

			// Sort by date
			allMatches.sort((a, b) => a.date.localeCompare(b.date));

			// Enrich earnings with company names from suggestions
			const nameMap = new Map(searchSuggestions.map((s) => [s.symbol, s.name]));
			globalSearchResults = allMatches.map((e) => ({
				...e,
				name: nameMap.get(e.symbol)
			}));

			searchLoading = false;
		}, 150);
	}

	function clearSearch() {
		searchQuery = '';
		searchSuggestions = [];
		showSuggestions = false;
		globalSearchResults = [];
		if (searchInputRef) searchInputRef.focus();
	}

	function formatRelativeDate(dateStr: string): string {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const date = new Date(dateStr + 'T00:00:00');
		const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Tomorrow';
		if (diffDays < 7) return `In ${diffDays} days`;
		if (diffDays < 14) return 'Next week';
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function toggleDate(date: string) {
		if (expandedDates.has(date)) {
			expandedDates = new Set([...expandedDates].filter((d) => d !== date));
		} else {
			expandedDates = new Set([...expandedDates, date]);
		}
	}

	function expandAll() {
		expandedDates = new Set(groupedByDate.map(([date]) => date));
	}

	function collapseAll() {
		expandedDates = new Set();
	}

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

	// Expand first date by default when data loads
	$effect(() => {
		if (!initializedExpanded && groupedByDate.length > 0) {
			expandedDates = new Set([groupedByDate[0][0]]);
			initializedExpanded = true;
		}
	});

	// Reset expanded state when month changes
	$effect(() => {
		// This triggers on currentDate change
		currentDate;
		initializedExpanded = false;
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
		<div class="summary-row">
			<p class="summary">{totalReports} upcoming earnings across {totalDays} days</p>
			<div class="expand-controls">
				<div class="search-container">
					<div class="search-input-wrapper">
						<svg class="search-icon" width="12" height="12" viewBox="0 0 16 16" fill="none">
							<path
								d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<path
								d="M14 14L10.5 10.5"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						<input
							bind:this={searchInputRef}
							type="text"
							class="search-input"
							placeholder="Search ticker..."
							bind:value={searchQuery}
							oninput={handleSearchInput}
							onfocus={() => {
								if (searchSuggestions.length > 0) showSuggestions = true;
							}}
							onblur={() => {
								setTimeout(() => (showSuggestions = false), 150);
							}}
						/>
						{#if searchLoading}
							<div class="search-spinner"></div>
						{:else if searchQuery}
							<button class="clear-btn" onclick={clearSearch} aria-label="Clear search">
								<svg width="12" height="12" viewBox="0 0 14 14" fill="none">
									<path
										d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
									/>
								</svg>
							</button>
						{/if}
					</div>
					{#if showSuggestions && !searchLoading && (globalSearchResults.length > 0 || searchSuggestions.length > 0)}
						<div class="search-dropdown">
							{#if globalSearchResults.length > 0}
								{#each globalSearchResults.slice(0, 6) as result (result.symbol + result.date)}
									<a
										href="/ticker/{result.symbol}"
										class="suggestion-item earnings-result"
										onmousedown={(e) => e.preventDefault()}
									>
										<img
											src={getCompanyLogoUrl(result.symbol)}
											alt=""
											class="suggestion-logo"
											onerror={(e) => {
												const img = e.currentTarget as HTMLImageElement;
												img.style.display = 'none';
											}}
										/>
										<div class="suggestion-info">
											<span class="suggestion-symbol">{result.symbol}</span>
											{#if result.name}
												<span class="suggestion-name">{result.name}</span>
											{/if}
										</div>
										<div class="earnings-date-badge">
											<span class="earnings-date">{formatRelativeDate(result.date)}</span>
											<span class="earnings-time">{result.time === 'bmo' ? 'BMO' : result.time === 'amc' ? 'AMC' : ''}</span>
										</div>
									</a>
								{/each}
							{:else}
								<div class="no-earnings-msg">No earnings in next 90 days</div>
								{#each searchSuggestions.slice(0, 4) as suggestion (suggestion.symbol)}
									<a
										href="/ticker/{suggestion.symbol}"
										class="suggestion-item"
										onmousedown={(e) => e.preventDefault()}
									>
										<img
											src={getCompanyLogoUrl(suggestion.symbol)}
											alt=""
											class="suggestion-logo"
											onerror={(e) => {
												const img = e.currentTarget as HTMLImageElement;
												img.style.display = 'none';
											}}
										/>
										<div class="suggestion-info">
											<span class="suggestion-symbol">{suggestion.symbol}</span>
											<span class="suggestion-name">{suggestion.name}</span>
										</div>
									</a>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
				<button class="expand-btn" onclick={expandAll}>Expand All</button>
				<button class="expand-btn" onclick={collapseAll}>Collapse All</button>
			</div>
		</div>
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
				{@const isExpanded = expandedDates.has(date)}
				<div class="day-card" class:today={isToday(date)}>
					<button class="day-header" onclick={() => toggleDate(date)}>
						<div class="day-info">
							<svg
								class="chevron"
								class:expanded={isExpanded}
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="none"
							>
								<path
									d="M5 3L11 8L5 13"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							<span class="day-num">{dayInfo.dayNum}</span>
							<div class="day-text">
								<span class="day-name">{dayInfo.dayName}</span>
								<span class="month-year">{dayInfo.monthYear}</span>
							</div>
						</div>
						<span class="report-count">{events.length} report{events.length !== 1 ? 's' : ''}</span>
					</button>
					{#if isExpanded}
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
					{/if}
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

	.summary-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.summary {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		margin: 0;
	}

	.expand-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.search-container {
		position: relative;
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.375rem 0.5rem;
		transition: border-color 0.15s;
		height: 30px;
		box-sizing: border-box;
	}

	.search-icon {
		color: var(--color-ink-muted);
		flex-shrink: 0;
		width: 12px;
		height: 12px;
	}

	.search-input {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink);
		background: transparent;
		border: none;
		outline: none;
		width: 100px;
		-webkit-appearance: none;
		appearance: none;
	}

	.search-input:focus {
		outline: none;
		box-shadow: none;
	}

	.search-input-wrapper:focus-within {
		border-color: var(--color-ink);
		outline: none;
	}

	.search-input::placeholder {
		color: var(--color-ink-muted);
	}

	.search-spinner {
		width: 10px;
		height: 10px;
		border: 1.5px solid var(--color-border);
		border-top-color: var(--color-ink);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.clear-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--color-ink-muted);
		transition: color 0.15s;
	}

	.clear-btn:hover {
		color: var(--color-ink);
	}

	.search-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 4px;
		background: var(--color-paper);
		border: 1px solid var(--color-ink);
		border-radius: 6px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		z-index: 100;
		min-width: 280px;
		max-height: 320px;
		overflow-y: auto;
	}

	.no-earnings-msg {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		padding: 0.5rem 0.75rem;
		background: var(--color-newsprint);
		border-bottom: 1px solid var(--color-border);
	}

	.suggestion-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		text-align: left;
		text-decoration: none;
		color: inherit;
		transition: background 0.1s;
	}

	.suggestion-item:last-child {
		border-bottom: none;
	}

	.suggestion-item:hover {
		background: var(--color-newsprint);
	}

	.suggestion-logo {
		width: 24px;
		height: 24px;
		object-fit: contain;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.suggestion-info {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-width: 0;
		flex: 1;
	}

	.suggestion-symbol {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.suggestion-name {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 140px;
	}

	.suggestion-item.earnings-result {
		text-decoration: none;
		color: inherit;
	}

	.earnings-date-badge {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0;
		margin-left: auto;
		flex-shrink: 0;
	}

	.earnings-date {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.earnings-time {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		color: var(--color-ink-muted);
	}

	.expand-btn {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-ink-muted);
		background: transparent;
		border: 1px solid var(--color-border);
		padding: 0 0.75rem;
		height: 30px;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.expand-btn:hover {
		color: var(--color-ink);
		border-color: var(--color-ink);
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
		width: 100%;
		padding: 0.875rem 1.25rem;
		background: var(--color-ink);
		color: var(--color-newsprint);
		border: none;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.day-header:hover {
		opacity: 0.9;
	}

	.chevron {
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	.chevron.expanded {
		transform: rotate(90deg);
	}

	.day-info {
		display: flex;
		align-items: center;
		gap: 0.625rem;
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

		.summary-row {
			flex-direction: column;
			align-items: flex-start;
		}

		.expand-controls {
			width: 100%;
			flex-wrap: wrap;
			justify-content: flex-start;
		}

		.search-dropdown {
			min-width: 260px;
			right: auto;
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
