<script lang="ts">
	import { onMount } from 'svelte';
	import api from '$lib/utils/api';
	import { getCompanyLogoUrl } from '$lib/utils/urls';
	import { formatCurrency } from '$lib/utils/formatters';

	interface DividendEvent {
		symbol: string;
		date: string;
		dividend: number;
		paymentDate: string;
	}

	let loading = $state(true);
	let error = $state<string | null>(null);
	let dividends = $state<DividendEvent[]>([]);
	let expandedGroups = $state<Set<string>>(new Set());
	let initializedExpanded = false;

	function toggleGroup(group: string) {
		if (expandedGroups.has(group)) {
			expandedGroups = new Set([...expandedGroups].filter((g) => g !== group));
		} else {
			expandedGroups = new Set([...expandedGroups, group]);
		}
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

	const groupedDividends = $derived.by(() => {
		const groups: Record<string, DividendEvent[]> = {};
		for (const d of dividends) {
			if (!d?.symbol) continue;
			const group = getDateGroup(d.date);
			if (!groups[group]) groups[group] = [];
			if (!groups[group].some((existing) => existing.symbol === d.symbol)) {
				groups[group].push(d);
			}
		}
		return Object.entries(groups).slice(0, 5);
	});

	$effect(() => {
		if (!initializedExpanded && groupedDividends.length > 0) {
			expandedGroups = new Set([groupedDividends[0][0]]);
			initializedExpanded = true;
		}
	});

	async function loadDividends() {
		loading = true;
		error = null;
		try {
			const today = new Date();
			const from = today.toISOString().split('T')[0];
			const to = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
			const response = await api.getDividendCalendar(from, to);
			if (response.success && response.data) {
				dividends = response.data.slice(0, 100);
			} else {
				dividends = [];
			}
		} catch (err) {
			error = 'Failed to load dividends';
			dividends = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadDividends();
	});
</script>

<div class="dividends-widget">
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
	{:else if dividends.length === 0}
		<p class="no-data">No upcoming dividends</p>
	{:else}
		<div class="dividend-groups">
			{#each groupedDividends as [group, events] (group)}
				{@const isExpanded = expandedGroups.has(group)}
				<div class="date-group">
					<button class="date-header" onclick={() => toggleGroup(group)}>
						<svg
							class="chevron"
							class:expanded={isExpanded}
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
						>
							<path
								d="M4 2L8 6L4 10"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						<span>{group}</span>
						<span class="count">({events.length})</span>
					</button>
					{#if isExpanded}
						<div class="ticker-row">
							{#each events.slice(0, 12) as event (event.symbol)}
								<a href="/ticker/{event.symbol}" class="ticker-chip" title="${event.dividend?.toFixed(2) || '--'} dividend">
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
									{#if event.dividend}
										<span class="dividend-amount">${event.dividend.toFixed(2)}</span>
									{/if}
								</a>
							{/each}
							{#if events.length > 12}
								<span class="more-count">+{events.length - 12}</span>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.dividends-widget {
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

	.dividend-groups {
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
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		background: none;
		border: none;
		padding: 0.25rem 0;
		cursor: pointer;
		transition: color 0.15s;
	}

	.date-header:hover {
		color: var(--color-ink);
	}

	.chevron {
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	.chevron.expanded {
		transform: rotate(90deg);
	}

	.count {
		font-weight: 400;
		opacity: 0.7;
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

	.dividend-amount {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		color: var(--color-gain);
		font-weight: 500;
	}

	.more-count {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		padding: 0.25rem 0.5rem;
	}
</style>
