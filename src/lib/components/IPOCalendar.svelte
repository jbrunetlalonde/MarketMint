<script lang="ts">
	import { onMount } from 'svelte';
	import { API_BASE } from '$lib/utils/api/request';
	import { formatCompact } from '$lib/utils/formatters';

	interface IPO {
		symbol: string;
		company: string;
		exchange: string;
		date: string;
		priceRange: string;
		shares: number;
		expectedPrice: number;
		marketCap: number;
	}

	let ipos = $state<IPO[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadIPOs() {
		loading = true;
		error = null;
		try {
			const today = new Date().toISOString().split('T')[0];
			const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
			const response = await fetch(`${API_BASE}/api/economic/ipo-calendar?from=${today}&to=${future}`);
			const result = await response.json();
			if (result.success && result.data) {
				ipos = result.data.slice(0, 5);
			} else {
				error = 'Failed to load IPOs';
			}
		} catch {
			error = 'Failed to load IPO calendar';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadIPOs();
	});

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="ipo-calendar">
	{#if loading}
		<div class="loading-state">
			{#each Array(3) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if error}
		<p class="error-text">{error}</p>
	{:else if ipos.length === 0}
		<p class="no-data">No upcoming IPOs</p>
	{:else}
		<div class="ipo-list">
			{#each ipos as ipo (ipo.symbol + ipo.date)}
				<div class="ipo-item">
					<div class="ipo-header">
						<span class="ipo-symbol">{ipo.symbol}</span>
						<span class="ipo-date">{formatDate(ipo.date)}</span>
					</div>
					<div class="ipo-company">{ipo.company}</div>
					<div class="ipo-details">
						{#if ipo.priceRange}
							<span class="ipo-price">{ipo.priceRange}</span>
						{:else if ipo.expectedPrice}
							<span class="ipo-price">${ipo.expectedPrice.toFixed(2)}</span>
						{/if}
						{#if ipo.marketCap}
							<span class="ipo-cap">{formatCompact(ipo.marketCap)} cap</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
		<a href="/economic" class="view-all-link">View All IPOs</a>
	{/if}
</div>

<style>
	.ipo-calendar {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		padding: 0.75rem;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-row {
		height: 3rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.error-text, .no-data {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		text-align: center;
		padding: 1rem 0.5rem;
	}

	.error-text {
		color: var(--color-loss);
	}

	.ipo-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.ipo-item {
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}

	.ipo-item:last-child {
		padding-bottom: 0;
		border-bottom: none;
	}

	.ipo-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.ipo-symbol {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.ipo-date {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		background: var(--color-newsprint);
		padding: 0.125rem 0.375rem;
		border-radius: 2px;
	}

	.ipo-company {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 0.25rem;
	}

	.ipo-details {
		display: flex;
		gap: 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
	}

	.ipo-price {
		color: var(--color-ink);
		font-weight: 600;
	}

	.ipo-cap {
		color: var(--color-ink-muted);
	}

	.view-all-link {
		display: block;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border);
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-ink);
		text-decoration: none;
		text-align: center;
	}

	.view-all-link:hover {
		text-decoration: underline;
	}
</style>
