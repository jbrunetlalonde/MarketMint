<svelte:head>
	<title>Contact - MarketMint</title>
	<meta name="description" content="Contact MarketMint" />
</svelte:head>

<div class="newspaper-grid">
	<article class="col-span-full content-page">
		<h1 class="headline-lg">Contact</h1>
		<div class="divider-double"></div>

		<section class="content-section">
			<p>
				For questions, feedback, or inquiries about MarketMint, please reach out via email:
			</p>

			<div class="contact-card">
				<a href="mailto:jbrunetlalonde@icloud.com" class="email-link">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="2" y="4" width="20" height="16" rx="2"></rect>
						<path d="m22 7-10 5L2 7"></path>
					</svg>
					<span>jbrunetlalonde@icloud.com</span>
				</a>
			</div>

			<p class="response-note">
				I typically respond within a few business days.
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

	.content-section p {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.7;
		color: var(--color-ink-light);
	}

	.contact-card {
		margin: 2rem 0;
		padding: 1.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-newsprint-light);
	}

	.email-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-family: var(--font-mono);
		font-size: 1rem;
		font-weight: 500;
		color: var(--color-ink);
		text-decoration: none;
		transition: opacity 0.15s ease;
	}

	.email-link:hover {
		opacity: 0.7;
	}

	.email-link svg {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	.response-note {
		margin-top: 1.5rem;
		font-size: 0.75rem;
		color: var(--color-ink-muted);
	}
</style>
