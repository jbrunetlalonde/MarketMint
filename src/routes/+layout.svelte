<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import api from '$lib/utils/api';
	import MastheadHeader from '$lib/components/MastheadHeader.svelte';
	import NavBar from '$lib/components/NavBar.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();

	const isLandingPage = $derived($page.url.pathname === '/');

	let unreadAlertCount = $state(0);

	async function fetchUnreadCount() {
		if (!auth.isAuthenticated || !auth.accessToken) {
			unreadAlertCount = 0;
			return;
		}

		try {
			const [tradeResponse, ideaResponse] = await Promise.all([
				api.getUnreadAlertCount(auth.accessToken),
				api.getUnreadIdeaAlertCount(auth.accessToken)
			]);

			const tradeCount = tradeResponse.success ? tradeResponse.data?.count ?? 0 : 0;
			const ideaCount = ideaResponse.success ? ideaResponse.data?.count ?? 0 : 0;
			unreadAlertCount = tradeCount + ideaCount;
		} catch {
			unreadAlertCount = 0;
		}
	}

	onMount(() => {
		themeStore.initialize();
		fetchUnreadCount();
		const interval = setInterval(fetchUnreadCount, 60000);
		return () => clearInterval(interval);
	});

	const currentDate = new Date().toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	const navLinks = [
		{ href: '/markets', label: 'Markets' },
		{ href: '/watchlist', label: 'Watchlist' },
		{ href: '/portfolio', label: 'Portfolio' },
		{ href: '/political', label: 'Congress Trades' }
		// { href: '/alerts', label: 'Alerts' }, // Moved to footer
		// { href: '/newsletter', label: 'Newsletter' }, // Moved to footer
		// { href: '/analysis', label: 'Analysis' } // Hidden for now
	];

	async function handleLogout() {
		await auth.logout();
	}
</script>

<svelte:head>
	<title>MarketMint - Retro Trading Platform</title>
	<meta name="description" content="A retro newspaper-style trading platform for market analysis" />
</svelte:head>

<div class="min-h-screen">
	{#if isLandingPage}
		<!-- Landing Page Header - Minimal -->
		<header class="landing-header">
			<a href="/" class="landing-logo-link">
				<img src="/favicon.png" alt="MarketMint" class="landing-logo-icon" />
				<span class="landing-logo-text">MarketMint</span>
			</a>
			<a href="/markets" class="landing-nav-link">
				<svg class="landing-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 3v18h18"></path>
					<path d="m19 9-5 5-4-4-3 3"></path>
				</svg>
				<span>View Markets</span>
			</a>
		</header>
	{:else}
		<!-- Internal Pages Header - Full Navigation -->
		<MastheadHeader {currentDate} />
		<NavBar
			links={navLinks}
			currentPath={$page.url.pathname}
			{unreadAlertCount}
			isAuthenticated={auth.isAuthenticated}
			username={auth.user?.username}
			onLogout={handleLogout}
		/>
	{/if}

	<!-- Main Content -->
	<main>
		{@render children()}
	</main>

	{#if !isLandingPage}
		<Footer />
	{/if}
</div>

<style>
	.landing-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
	}

	.landing-logo-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		color: var(--color-ink);
	}

	.landing-logo-icon {
		width: 36px;
		height: 36px;
		object-fit: contain;
	}

	.landing-logo-text {
		font-family: var(--font-mono);
		font-size: 1.125rem;
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.landing-nav-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-ink);
		text-decoration: none;
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		transition: all 0.15s ease;
	}

	.landing-nav-link:hover {
		background: var(--color-ink);
		color: white;
		border-color: var(--color-ink);
	}

	.landing-nav-icon {
		width: 1rem;
		height: 1rem;
	}
</style>
