<svelte:head>
	<title>Contact - MarketMint</title>
	<meta name="description" content="Contact MarketMint" />
</svelte:head>

<div class="page-container">
	<article class="content-page">
		<header class="page-header">
			<h1>Contact</h1>
		</header>

		<section class="content-section">
			<p>
				For questions, feedback, or inquiries about MarketMint, please reach out via email:
			</p>

			<a href="mailto:jbrunetlalonde@icloud.com" class="contact-card">
				<div class="contact-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="2" y="4" width="20" height="16" rx="2"></rect>
						<path d="m22 7-10 5L2 7"></path>
					</svg>
				</div>
				<div class="contact-info">
					<span class="contact-label">Email</span>
					<span class="contact-value">jbrunetlalonde@icloud.com</span>
				</div>
				<svg class="contact-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="m9 18 6-6-6-6"/>
				</svg>
			</a>

			<p class="response-note">
				I typically respond within a few business days.
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
	}

	.content-section p {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		line-height: 1.7;
		color: var(--color-ink-light);
		margin: 0;
	}

	.contact-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 1.5rem 0;
		padding: 1rem 1.25rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		text-decoration: none;
		color: inherit;
		transition: all 0.15s ease;
	}

	.contact-card:hover {
		border-color: var(--color-ink);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.contact-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--color-ink);
		border-radius: 8px;
		color: var(--color-paper);
		flex-shrink: 0;
	}

	.contact-icon svg {
		width: 20px;
		height: 20px;
	}

	.contact-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.contact-label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.contact-value {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.contact-arrow {
		width: 20px;
		height: 20px;
		color: var(--color-ink-muted);
		flex-shrink: 0;
	}

	.response-note {
		margin-top: 1rem;
		font-size: 0.6875rem !important;
		color: var(--color-ink-muted) !important;
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

		.content-section p {
			font-size: 0.75rem;
		}

		.contact-card {
			padding: 0.875rem 1rem;
		}

		.contact-icon {
			width: 36px;
			height: 36px;
		}

		.contact-icon svg {
			width: 18px;
			height: 18px;
		}

		.contact-value {
			font-size: 0.8125rem;
		}
	}
</style>
