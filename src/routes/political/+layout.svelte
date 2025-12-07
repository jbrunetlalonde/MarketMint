<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const tabs = [
		{ href: '/political', label: 'All Trades', exact: true },
		{ href: '/political/senate', label: 'Senate' },
		{ href: '/political/house', label: 'House' },
		{ href: '/political/members', label: 'Members' },
		{ href: '/political/insider', label: 'Insider Trading' }
	];

	function isActive(href: string, exact = false): boolean {
		if (exact) {
			return page.url.pathname === href;
		}
		return page.url.pathname.startsWith(href);
	}
</script>

<div class="political-layout">
	<nav class="political-nav">
		<div class="tab-list">
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					class="tab-item"
					class:active={isActive(tab.href, tab.exact)}
				>
					{tab.label}
				</a>
			{/each}
		</div>
	</nav>

	{@render children()}
</div>

<style>
	.political-layout {
		width: 100%;
	}

	.political-nav {
		margin-bottom: 1.5rem;
		border-bottom: 2px solid var(--color-ink-light, #d1d5db);
	}

	.tab-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0;
	}

	.tab-item {
		padding: 0.75rem 1.25rem;
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-ink-muted, #6b7280);
		text-decoration: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		transition: color 0.15s, border-color 0.15s;
	}

	.tab-item:hover {
		color: var(--color-ink, #111827);
	}

	.tab-item.active {
		color: var(--color-ink, #111827);
		border-bottom-color: var(--color-ink, #111827);
		font-weight: 600;
	}

	@media (max-width: 640px) {
		.tab-item {
			padding: 0.5rem 0.75rem;
			font-size: 0.75rem;
		}
	}
</style>
