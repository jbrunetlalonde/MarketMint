<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { API_BASE } from '$lib/utils/api/request';

	let isOpen = $state<boolean | null>(null);
	let loading = $state(true);
	let currentTime = $state(new Date());
	let intervalId: ReturnType<typeof setInterval>;

	async function checkStatus() {
		try {
			const response = await fetch(`${API_BASE}/api/quotes/market-status`);
			const result = await response.json();
			if (result.success) {
				isOpen = result.data?.isOpen ?? null;
			}
		} catch {
			isOpen = null;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		checkStatus();
		// Update time every second
		intervalId = setInterval(() => {
			currentTime = new Date();
		}, 1000);
		// Check market status every minute
		const statusInterval = setInterval(checkStatus, 60000);
		return () => clearInterval(statusInterval);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	const timeString = $derived(
		currentTime.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short'
		})
	);
</script>

<div class="market-status">
	<div class="status-indicator" class:open={isOpen === true} class:closed={isOpen === false}>
		<span class="status-dot"></span>
		<span class="status-text">
			{#if loading}
				...
			{:else if isOpen === true}
				Market Open
			{:else if isOpen === false}
				Market Closed
			{:else}
				--
			{/if}
		</span>
	</div>
	<span class="current-time">{timeString}</span>
</div>

<style>
	.market-status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-ink-muted);
	}

	.status-indicator.open .status-dot {
		background: var(--color-gain);
		box-shadow: 0 0 6px var(--color-gain);
	}

	.status-indicator.closed .status-dot {
		background: var(--color-loss);
	}

	.status-text {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.status-indicator.open .status-text {
		color: var(--color-gain);
	}

	.status-indicator.closed .status-text {
		color: var(--color-ink-muted);
	}

	.current-time {
		color: var(--color-ink-muted);
	}
</style>
