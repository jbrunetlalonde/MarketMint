<script lang="ts">
	import { onMount } from 'svelte';
	import SearchAutocomplete from './SearchAutocomplete.svelte';

	interface NavLink {
		href: string;
		label: string;
	}

	interface Props {
		links: NavLink[];
		currentPath: string;
		unreadAlertCount?: number;
		isAuthenticated: boolean;
		username?: string;
		onLogout: () => void;
	}

	let { links, currentPath, unreadAlertCount = 0, isAuthenticated, username, onLogout }: Props =
		$props();

	let searchContainer: HTMLDivElement | null = null;

	function isActive(href: string): boolean {
		return currentPath === href || currentPath.startsWith(href + '/');
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			const input = searchContainer?.querySelector('input');
			input?.focus();
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<nav class="nav-bar">
	<div class="nav-links">
		{#each links as link (link.href)}
			<a href={link.href} class="nav-link" class:active={isActive(link.href)}>
				{link.label}
				{#if link.href === '/alerts' && unreadAlertCount > 0}
					<span class="nav-badge">{unreadAlertCount}</span>
				{/if}
			</a>
		{/each}
	</div>
	<div class="nav-right" bind:this={searchContainer}>
		<SearchAutocomplete placeholder="Search..." compact expandable />
		<div class="nav-auth">
			{#if isAuthenticated && username}
				<span class="nav-user">
					<svg class="user-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="8" r="4"></circle>
						<path d="M4 20c0-4 4-6 8-6s8 2 8 6"></path>
					</svg>
					{username}
				</span>
				<button onclick={onLogout} class="nav-link logout-btn">Logout</button>
			{:else}
				<a href="/auth/login" class="nav-link">Login</a>
			{/if}
		</div>
	</div>
</nav>

<style>
	.nav-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6rem;
		font-weight: 700;
		min-width: 1rem;
		height: 1rem;
		padding: 0 0.25rem;
		background: #22c55e;
		color: white;
		border-radius: 9999px;
		margin-left: 0.25rem;
	}

</style>
