<svelte:head>
	<title>About - MarketMint</title>
	<meta name="description" content="About MarketMint - A retro newspaper-style stock trading platform" />
</svelte:head>

<div class="page-container">
	<article class="content-page">
		<header class="page-header">
			<h1>About MarketMint</h1>
		</header>

		<section class="content-section">
			<h2>The Platform</h2>
			<p>
				MarketMint is a retro newspaper-style stock trading platform designed for personal market analysis
				and portfolio management. Built with a distinctive aesthetic inspired by classic financial newspapers,
				it combines modern functionality with vintage design sensibilities.
			</p>
		</section>

		<section class="content-section">
			<h2>Purpose</h2>
			<p>
				This platform serves as a personal tool for tracking markets, analyzing stocks, monitoring
				congressional trading activity, and managing investment portfolios. It aggregates financial
				data from multiple sources to provide comprehensive market insights in a clean, readable format.
			</p>
		</section>

		<section class="content-section">
			<h2>Design Philosophy</h2>
			<p>
				The interface draws inspiration from the golden age of financial journalism, featuring
				IBM Plex Mono typography, a muted newsprint color palette, and classic newspaper layout
				conventions. This retro aesthetic creates a focused, distraction-free environment for
				serious market analysis.
			</p>
		</section>

		<section class="content-section">
			<h2>Features</h2>
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
			<h2>Creator</h2>
			<p>
				Built by Jordan Brunet-Lalonde as a personal project combining interests in financial
				markets and software development.
			</p>
		</section>
	</article>
</div>

<style>
	.page-container {
		max-width: 720px;
		margin: 0 auto;
		padding: 1.5rem 1rem;
	}

	.content-page {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		overflow: hidden;
	}

	.page-header {
		background: var(--color-ink);
		padding: 1.5rem;
	}

	.page-header h1 {
		font-family: var(--font-mono);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-paper);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.content-section {
		padding: 1.5rem;
		border-bottom: 1px dotted var(--color-border);
	}

	.content-section:last-child {
		border-bottom: none;
	}

	.content-section h2 {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink);
		margin: 0 0 0.75rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.content-section p {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		line-height: 1.7;
		color: var(--color-ink-light);
		margin: 0;
	}

	.feature-list {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		line-height: 1.8;
		color: var(--color-ink-light);
		padding-left: 1.25rem;
		margin: 0;
	}

	.feature-list li {
		margin: 0.375rem 0;
	}

	/* Mobile optimizations */
	@media (max-width: 640px) {
		.page-container {
			padding: 1rem 0.75rem;
		}

		.page-header {
			padding: 1.25rem;
		}

		.page-header h1 {
			font-size: 1.25rem;
		}

		.content-section {
			padding: 1.25rem;
		}

		.content-section h2 {
			font-size: 0.75rem;
		}

		.content-section p,
		.feature-list {
			font-size: 0.75rem;
		}
	}
</style>
