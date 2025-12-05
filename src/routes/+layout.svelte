<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';

	let { children } = $props();

	const currentDate = new Date().toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	const navLinks = [
		{ href: '/', label: 'Markets' },
		{ href: '/watchlist', label: 'Watchlist' },
		{ href: '/political', label: 'Congress Trades' },
		{ href: '/newsletter', label: 'Newsletter' },
		{ href: '/analysis', label: 'Analysis' }
	];
</script>

<svelte:head>
	<title>MarketMint - Retro Trading Platform</title>
	<meta name="description" content="A retro newspaper-style trading platform for market analysis" />
</svelte:head>

<div class="min-h-screen">
	<!-- Masthead -->
	<header class="masthead">
		<h1 class="masthead-title">
			<a href="/" class="no-underline text-inherit">MarketMint</a>
		</h1>
		<p class="masthead-date">{currentDate}</p>
	</header>

	<!-- Navigation -->
	<nav class="nav-bar">
		{#each navLinks as link (link.href)}
			<a
				href={link.href}
				class="nav-link"
				class:active={page.url.pathname === link.href ||
					(link.href !== '/' && page.url.pathname.startsWith(link.href))}
			>
				{link.label}
			</a>
		{/each}

		<!-- Auth links on the right -->
		<span class="ml-auto flex gap-4">
			<a href="/auth/login" class="nav-link">Login</a>
		</span>
	</nav>

	<!-- Main Content -->
	<main>
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="border-t border-border mt-8 py-4 text-center">
		<p class="byline">MarketMint &copy; {new Date().getFullYear()} &mdash; For educational purposes only</p>
	</footer>
</div>
