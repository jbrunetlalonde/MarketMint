<svelte:head>
	<title>Terms of Service - MarketMint</title>
	<meta name="description" content="MarketMint Terms of Service" />
</svelte:head>

<div class="page-container">
	<article class="content-page">
		<header class="page-header">
			<h1>Terms of Service</h1>
			<span class="last-updated">Last updated: December 2024</span>
		</header>

		<section class="content-section">
			<h2>Acceptance of Terms</h2>
			<p>
				By accessing and using MarketMint, you accept and agree to be bound by these Terms of Service.
				If you do not agree to these terms, please do not use the service.
			</p>
		</section>

		<section class="content-section">
			<h2>Service Description</h2>
			<p>
				MarketMint is a personal stock market analysis platform that provides market data,
				portfolio tracking, and financial information aggregation. The service is provided
				for informational and educational purposes only.
			</p>
		</section>

		<section class="content-section">
			<h2>User Responsibilities</h2>
			<p>
				As a user of MarketMint, you agree to:
			</p>
			<ul class="terms-list">
				<li>Provide accurate account information</li>
				<li>Maintain the security of your account credentials</li>
				<li>Use the service in compliance with applicable laws</li>
				<li>Not attempt to disrupt or compromise the service</li>
			</ul>
		</section>

		<section class="content-section">
			<h2>Financial Disclaimer</h2>
			<div class="disclaimer-box">
				<p>
					MarketMint is not a registered investment advisor, broker-dealer, or financial planner.
					The information provided on this platform is for informational purposes only and should
					not be construed as financial, investment, tax, or legal advice.
				</p>
				<p>
					Any investment decisions you make are solely your responsibility. Past performance is
					not indicative of future results. Always consult with a qualified financial professional
					before making investment decisions.
				</p>
			</div>
		</section>

		<section class="content-section">
			<h2>Data Accuracy</h2>
			<p>
				While we strive to provide accurate market data, we do not guarantee the accuracy,
				completeness, or timeliness of any information. Market data may be delayed and
				should not be relied upon for time-sensitive trading decisions.
			</p>
		</section>

		<section class="content-section">
			<h2>Limitation of Liability</h2>
			<p>
				MarketMint and its creator shall not be liable for any direct, indirect, incidental,
				consequential, or punitive damages arising from your use of the service or reliance
				on any information provided. Use of this service is at your own risk.
			</p>
		</section>

		<section class="content-section">
			<h2>Changes to Terms</h2>
			<p>
				We reserve the right to modify these terms at any time. Continued use of the service
				after changes constitutes acceptance of the updated terms.
			</p>
		</section>

		<section class="content-section">
			<h2>Contact</h2>
			<p>
				For questions about these terms, please contact us at
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

	.disclaimer-box {
		background: var(--color-newsprint);
		border-left: 3px solid var(--color-ink);
		padding: 1rem;
		border-radius: 0 4px 4px 0;
	}

	.disclaimer-box p {
		margin: 0;
	}

	.disclaimer-box p + p {
		margin-top: 0.75rem;
	}

	.terms-list {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		line-height: 1.8;
		color: var(--color-ink-light);
		padding-left: 1.25rem;
		margin: 0.5rem 0 0 0;
	}

	.terms-list li {
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
		.terms-list {
			font-size: 0.75rem;
		}

		.disclaimer-box {
			padding: 0.875rem;
		}
	}
</style>
