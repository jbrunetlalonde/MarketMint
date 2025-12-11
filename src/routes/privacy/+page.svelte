<svelte:head>
	<title>Privacy Policy - MarketMint</title>
	<meta name="description" content="MarketMint Privacy Policy" />
</svelte:head>

<div class="page-container">
	<article class="content-page">
		<header class="page-header">
			<h1>Privacy Policy</h1>
			<span class="last-updated">Last updated: December 2024</span>
		</header>

		<section class="content-section">
			<h2>Information We Collect</h2>
			<p>
				When you use MarketMint, we may collect the following information:
			</p>
			<ul class="policy-list">
				<li>Account information (email address, username) when you register</li>
				<li>Watchlist and portfolio data you choose to store</li>
				<li>Alert preferences and settings</li>
				<li>Usage data to improve the service</li>
			</ul>
		</section>

		<section class="content-section">
			<h2>How We Use Your Information</h2>
			<p>
				Your information is used to:
			</p>
			<ul class="policy-list">
				<li>Provide and maintain the MarketMint service</li>
				<li>Send alerts and notifications you have configured</li>
				<li>Improve and personalize your experience</li>
				<li>Communicate service updates when necessary</li>
			</ul>
		</section>

		<section class="content-section">
			<h2>Data Storage</h2>
			<p>
				Your data is stored securely on our servers. We implement appropriate technical and
				organizational measures to protect your personal information against unauthorized access,
				alteration, disclosure, or destruction.
			</p>
		</section>

		<section class="content-section">
			<h2>Third-Party Services</h2>
			<p>
				MarketMint integrates with third-party financial data providers to deliver market information.
				These services have their own privacy policies. We do not sell your personal data to third parties.
			</p>
		</section>

		<section class="content-section">
			<h2>Your Rights</h2>
			<p>
				You have the right to:
			</p>
			<ul class="policy-list">
				<li>Access your personal data</li>
				<li>Request correction of inaccurate data</li>
				<li>Request deletion of your account and data</li>
				<li>Export your data in a portable format</li>
			</ul>
		</section>

		<section class="content-section">
			<h2>Contact</h2>
			<p>
				For privacy-related inquiries, please contact us at
				<a href="mailto:jbrunetlalonde@icloud.com">jbrunetlalonde@icloud.com</a>.
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
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
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

	.last-updated {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: var(--color-paper);
		opacity: 0.6;
		text-transform: uppercase;
		letter-spacing: 0.05em;
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

	.policy-list {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		line-height: 1.8;
		color: var(--color-ink-light);
		padding-left: 1.25rem;
		margin: 0.5rem 0 0 0;
	}

	.policy-list li {
		margin: 0.375rem 0;
	}

	.content-section a {
		color: var(--color-ink);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.content-section a:hover {
		opacity: 0.7;
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
		.policy-list {
			font-size: 0.75rem;
		}
	}
</style>
