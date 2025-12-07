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
	<nav class="political-subnav">
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				class="subnav-link"
				class:active={isActive(tab.href, tab.exact)}
			>
				{tab.label}
			</a>
		{/each}
	</nav>

	{@render children()}
</div>

<style>
	.political-layout {
		width: 100%;
	}

	.political-subnav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		max-width: 1400px;
		margin: 0 auto 1rem;
		padding: 0 1.5rem;
	}

	.subnav-link {
		padding: 0.375rem 0.75rem;
		font-family: var(--font-mono, 'IBM Plex Mono', monospace);
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted, #6b7280);
		text-decoration: none;
		border: 1px solid transparent;
		transition: all 0.15s ease;
	}

	.subnav-link:hover {
		color: var(--color-ink, #111827);
		border-color: var(--color-border, #aaa);
	}

	.subnav-link.active {
		color: var(--color-ink, #111827);
		background: var(--color-ink, #111827);
		color: white;
		font-weight: 600;
	}

	[data-theme="dark"] .subnav-link.active {
		background: var(--color-ink, #e8e8e0);
		color: var(--color-newsprint, #121212);
	}

	@media (max-width: 640px) {
		.political-subnav {
			padding: 0 1rem;
		}
		.subnav-link {
			padding: 0.25rem 0.5rem;
			font-size: 0.625rem;
		}
	}
</style>
