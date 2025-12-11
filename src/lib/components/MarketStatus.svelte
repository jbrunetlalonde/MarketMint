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
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		background: var(--color-ink);
		border-radius: 9999px;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
		background: #4ade80;
		box-shadow: 0 0 8px #4ade80;
		animation: pulse-glow 2s ease-in-out infinite;
	}

	.status-indicator.closed .status-dot {
		background: #f87171;
	}

	@keyframes pulse-glow {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	.status-text {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-paper);
	}

	.status-indicator.open .status-text {
		color: #4ade80;
	}

	.status-indicator.closed .status-text {
		color: #f87171;
	}

	.current-time {
		color: var(--color-paper);
		opacity: 0.7;
		padding-left: 0.5rem;
		border-left: 1px solid rgba(255, 255, 255, 0.2);
	}

	/* Dark mode adjustments */
	[data-theme="dark"] .market-status {
		background: var(--color-newsprint-dark);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	[data-theme="dark"] .status-text,
	[data-theme="dark"] .current-time {
		color: var(--color-ink);
	}
</style>
