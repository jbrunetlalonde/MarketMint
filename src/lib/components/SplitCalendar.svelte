<script lang="ts">
	import { onMount } from 'svelte';
	import api from '$lib/utils/api';
	import { getCompanyLogoUrl } from '$lib/utils/urls';

	interface SplitEvent {
		symbol: string;
		date: string;
		label: string;
		numerator: number;
		denominator: number;
	}

	let loading = $state(true);
	let error = $state<string | null>(null);
	let splits = $state<SplitEvent[]>([]);
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

	function getSplitRatio(num: number, denom: number): string {
		if (!num || !denom) return '--';
		return `${num}:${denom}`;
	}

	function isReverseSplit(num: number, denom: number): boolean {
		return num < denom;
	}

	const groupedSplits = $derived.by(() => {
		const groups: Record<string, SplitEvent[]> = {};
		for (const s of splits) {
			if (!s?.symbol) continue;
			const group = getDateGroup(s.date);
			if (!groups[group]) groups[group] = [];
			if (!groups[group].some((existing) => existing.symbol === s.symbol)) {
				groups[group].push(s);
			}
		}
		return Object.entries(groups).slice(0, 5);
	});

	$effect(() => {
		if (!initializedExpanded && groupedSplits.length > 0) {
			expandedGroups = new Set([groupedSplits[0][0]]);
			initializedExpanded = true;
		}
	});

	async function loadSplits() {
		loading = true;
		error = null;
		try {
			const today = new Date();
			const from = today.toISOString().split('T')[0];
			const to = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
			const response = await api.getSplitCalendar(from, to);
			if (response.success && response.data) {
				splits = response.data.slice(0, 100);
			} else {
				splits = [];
			}
		} catch (err) {
			error = 'Failed to load splits';
			splits = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadSplits();
	});
</script>

<div class="splits-widget">
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
	{:else if splits.length === 0}
		<p class="no-data">No upcoming splits</p>
	{:else}
		<div class="split-groups">
			{#each groupedSplits as [group, events] (group)}
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
								{@const isReverse = isReverseSplit(event.numerator, event.denominator)}
								<a href="/ticker/{event.symbol}" class="ticker-chip" class:reverse={isReverse} title="{event.label || getSplitRatio(event.numerator, event.denominator)} split">
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
									<span class="split-ratio" class:reverse={isReverse}>
										{getSplitRatio(event.numerator, event.denominator)}
									</span>
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
	.splits-widget {
		/* Container styles */
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

	.split-groups {
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

	.ticker-chip.reverse {
		border-color: var(--color-loss);
		border-style: dashed;
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

	.split-ratio {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		color: var(--color-gain);
		font-weight: 500;
	}

	.split-ratio.reverse {
		color: var(--color-loss);
	}

	.more-count {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		padding: 0.25rem 0.5rem;
	}
</style>
