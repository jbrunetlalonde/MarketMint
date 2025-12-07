<svelte:head>
	<title>About - MarketMint</title>
	<meta name="description" content="About MarketMint - A retro newspaper-style stock trading platform" />
</svelte:head>

<div class="newspaper-grid">
	<article class="col-span-full content-page">
		<h1 class="headline-lg">About MarketMint</h1>
		<div class="divider-double"></div>

		<section class="content-section">
			<h2 class="headline-md">The Platform</h2>
			<p>
				MarketMint is a retro newspaper-style stock trading platform designed for personal market analysis
				and portfolio management. Built with a distinctive aesthetic inspired by classic financial newspapers,
				it combines modern functionality with vintage design sensibilities.
			</p>
		</section>

		<section class="content-section">
			<h2 class="headline-md">Purpose</h2>
			<p>
				This platform serves as a personal tool for tracking markets, analyzing stocks, monitoring
				congressional trading activity, and managing investment portfolios. It aggregates financial
				data from multiple sources to provide comprehensive market insights in a clean, readable format.
			</p>
		</section>

		<section class="content-section">
			<h2 class="headline-md">Design Philosophy</h2>
			<p>
				The interface draws inspiration from the golden age of financial journalism, featuring
				IBM Plex Mono typography, a muted newsprint color palette, and classic newspaper layout
				conventions. This retro aesthetic creates a focused, distraction-free environment for
				serious market analysis.
			</p>
		</section>

		<section class="content-section">
			<h2 class="headline-md">Features</h2>
			<ul class="feature-list">
				<li>Real-time stock quotes and market data</li>
				<li>Congressional trading activity tracking</li>
				<li>Personal watchlist management</li>
				<li>Portfolio tracking and analysis</li>
				<li>Price alerts and notifications</li>
				<li>Historical price charts</li>
			</ul>
		</section>

		<section class="content-section">
			<h2 class="headline-md">Creator</h2>
			<p>
				Built by Jordan Brunet-Lalonde as a personal project combining interests in financial
				markets and software development.
			</p>
		</section>
	</article>
</div>

<style>
	.content-page {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.content-section {
		margin: 2rem 0;
	}

	.content-section h2 {
		margin-bottom: 1rem;
	}

	.content-section p {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.7;
		color: var(--color-ink-light);
	}

	.feature-list {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.8;
		color: var(--color-ink-light);
		padding-left: 1.5rem;
	}

	.feature-list li {
		margin: 0.5rem 0;
	}
</style>
