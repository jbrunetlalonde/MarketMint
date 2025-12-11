<script lang="ts">
	import { onMount } from 'svelte';
	import { API_BASE } from '$lib/utils/api/request';

	interface Props {
		symbol: string;
		limit?: number;
	}

	let { symbol, limit = 5 }: Props = $props();

	interface PressRelease {
		symbol: string;
		date: string;
		title: string;
		text: string;
	}

	let releases = $state<PressRelease[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let expandedIndex = $state<number | null>(null);

	async function loadReleases() {
		if (!symbol) return;
		loading = true;
		error = null;
		try {
			const response = await fetch(`${API_BASE}/api/financials/${symbol}/press-releases?limit=${limit}`);
			const result = await response.json();
			if (result.success && result.data) {
				releases = result.data;
			} else {
				error = result.error?.message || 'No press releases available';
			}
		} catch {
			error = 'Failed to load press releases';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadReleases();
	});

	$effect(() => {
		if (symbol) {
			loadReleases();
		}
	});

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function toggleExpand(index: number) {
		expandedIndex = expandedIndex === index ? null : index;
	}

	function truncateText(text: string, maxLength = 150): string {
		if (!text || text.length <= maxLength) return text || '';
		return text.substring(0, maxLength).trim() + '...';
	}
</script>

<div class="press-releases">
	<div class="header">
		<h3>Press Releases</h3>
	</div>

	{#if loading}
		<div class="loading-state">
			{#each Array(3) as _, i (i)}
				<div class="skeleton-item">
					<div class="skeleton-date"></div>
					<div class="skeleton-title"></div>
				</div>
			{/each}
		</div>
	{:else if error}
		<p class="error-text">{error}</p>
	{:else if releases.length === 0}
		<p class="no-data">No press releases available</p>
	{:else}
		<div class="releases-list">
			{#each releases as release, index (release.date + release.title)}
				<article class="release-item" class:expanded={expandedIndex === index}>
					<button class="release-header" onclick={() => toggleExpand(index)}>
						<time class="release-date">{formatDate(release.date)}</time>
						<h4 class="release-title">{release.title}</h4>
						<span class="expand-icon">{expandedIndex === index ? '-' : '+'}</span>
					</button>
					{#if expandedIndex === index && release.text}
						<div class="release-content">
							<p>{truncateText(release.text, 500)}</p>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</div>

<style>
	.press-releases {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		padding: 1rem;
	}

	.header {
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid var(--color-ink);
	}

	.header h3 {
		font-family: var(--font-headline);
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skeleton-item {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.skeleton-date {
		width: 5rem;
		height: 0.75rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		animation: pulse 1.5s infinite;
	}

	.skeleton-title {
		width: 100%;
		height: 1rem;
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
		padding: 1.5rem;
	}

	.error-text {
		color: var(--color-loss);
	}

	.releases-list {
		display: flex;
		flex-direction: column;
	}

	.release-item {
		border-bottom: 1px solid var(--color-border);
	}

	.release-item:last-child {
		border-bottom: none;
	}

	.release-header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.75rem;
		align-items: start;
		width: 100%;
		padding: 0.75rem 0;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.release-header:hover {
		background: var(--color-newsprint);
		margin: 0 -0.5rem;
		padding: 0.75rem 0.5rem;
	}

	.release-date {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	.release-title {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ink);
		margin: 0;
		line-height: 1.4;
	}

	.expand-icon {
		font-family: var(--font-mono);
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-ink-muted);
		width: 1.25rem;
		text-align: center;
	}

	.release-content {
		padding: 0 0 1rem 0;
		margin-left: calc(5rem + 0.75rem);
	}

	.release-content p {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		line-height: 1.6;
		color: var(--color-ink-muted);
		margin: 0;
	}

	.release-item.expanded .release-header {
		background: var(--color-newsprint);
		margin: 0 -0.5rem;
		padding: 0.75rem 0.5rem;
	}
</style>
