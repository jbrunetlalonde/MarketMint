<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';

	let email = $state('');
	let subscribeStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');

	async function handleSubscribe(e: Event) {
		e.preventDefault();
		if (!email) return;

		subscribeStatus = 'loading';
		try {
			// TODO: Implement newsletter subscription API
			await new Promise((resolve) => setTimeout(resolve, 500));
			subscribeStatus = 'success';
			email = '';
		} catch {
			subscribeStatus = 'error';
		}
	}

	const currentYear = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="footer-top">
		<div class="footer-grid">
			<div class="footer-section">
				<h4 class="footer-heading">Company</h4>
				<nav class="footer-links">
					<a href="/about">About</a>
					<a href="/contact">Contact</a>
				</nav>
			</div>

			<div class="footer-section">
				<h4 class="footer-heading">Legal</h4>
				<nav class="footer-links">
					<a href="/privacy">Privacy Policy</a>
					<a href="/terms">Terms of Service</a>
				</nav>
			</div>

			<div class="footer-section">
				<h4 class="footer-heading">Resources</h4>
				<nav class="footer-links">
					<a href="/markets">Stocks</a>
					<a href="/political">Congress Trades</a>
					<a href="/earnings">Earnings Calendar</a>
					<a href="/alerts">Alerts</a>
				</nav>
			</div>

			<div class="footer-section footer-newsletter">
				<h4 class="footer-heading">Newsletter</h4>
				<p class="newsletter-desc">Weekly market insights delivered to your inbox.</p>
				<form class="newsletter-form" onsubmit={handleSubscribe}>
					<input
						type="email"
						bind:value={email}
						placeholder="your@email.com"
						class="newsletter-input"
						disabled={subscribeStatus === 'loading'}
					/>
					<button
						type="submit"
						class="newsletter-btn"
						disabled={subscribeStatus === 'loading' || !email}
					>
						{#if subscribeStatus === 'loading'}
							...
						{:else}
							Subscribe
						{/if}
					</button>
				</form>
				{#if subscribeStatus === 'success'}
					<p class="newsletter-msg success">Subscribed successfully.</p>
				{:else if subscribeStatus === 'error'}
					<p class="newsletter-msg error">Failed to subscribe. Try again.</p>
				{/if}
			</div>
		</div>
	</div>

	<div class="footer-disclaimer">
		<p>Market data provided for informational purposes only. Prices may be delayed. Not financial advice.</p>
	</div>

	<div class="footer-bottom">
		<p class="copyright">MarketMint {currentYear}</p>

		<div class="theme-switcher">
			<button
				onclick={() => themeStore.setTheme('light')}
				class="theme-btn"
				class:active={themeStore.theme === 'light'}
				aria-label="Light mode"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="5"></circle>
					<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
				</svg>
			</button>
			<button
				onclick={() => themeStore.setTheme('system')}
				class="theme-btn"
				class:active={themeStore.theme === 'system'}
				aria-label="System preference"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="2" y="3" width="20" height="14" rx="2"></rect>
					<path d="M8 21h8M12 17v4"></path>
				</svg>
			</button>
			<button
				onclick={() => themeStore.setTheme('dark')}
				class="theme-btn"
				class:active={themeStore.theme === 'dark'}
				aria-label="Dark mode"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
				</svg>
			</button>
		</div>
	</div>
</footer>

<style>
	.footer {
		margin-top: 4rem;
		border-top: 2px solid var(--color-border);
		background: var(--color-newsprint);
	}

	.footer-top {
		max-width: 1200px;
		margin: 0 auto;
		padding: 3rem 2rem 2rem;
	}

	.footer-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 2rem;
	}

	@media (max-width: 768px) {
		.footer-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.footer-grid {
			grid-template-columns: 1fr;
		}
	}

	.footer-heading {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink);
		margin-bottom: 1rem;
	}

	.footer-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.footer-links a {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		color: var(--color-ink-muted);
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.footer-links a:hover {
		color: var(--color-ink);
	}

	.newsletter-desc {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin-bottom: 0.75rem;
		line-height: 1.4;
	}

	.newsletter-form {
		display: flex;
		gap: 0.5rem;
	}

	.newsletter-input {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		border: 1px solid var(--color-border);
		background: var(--color-newsprint-light);
		color: var(--color-ink);
		outline: none;
	}

	.newsletter-input:focus {
		border-color: var(--color-ink);
	}

	.newsletter-input::placeholder {
		color: var(--color-ink-muted);
	}

	.newsletter-btn {
		padding: 0.5rem 1rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--color-ink);
		color: var(--color-newsprint);
		border: none;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.newsletter-btn:hover:not(:disabled) {
		opacity: 0.85;
	}

	.newsletter-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.newsletter-msg {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		margin-top: 0.5rem;
	}

	.newsletter-msg.success {
		color: #16a34a;
	}

	.newsletter-msg.error {
		color: #dc2626;
	}

	.footer-disclaimer {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem 2rem;
		border-top: 1px solid var(--color-border);
		text-align: center;
	}

	.footer-disclaimer p {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		margin: 0;
	}

	.footer-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem 2rem;
		border-top: 1px solid var(--color-border);
	}

	@media (max-width: 480px) {
		.footer-bottom {
			flex-direction: column;
			gap: 1rem;
		}
	}

	.copyright {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
	}

	.theme-switcher {
		display: flex;
		gap: 0.25rem;
	}

	.theme-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 0.25rem;
		cursor: pointer;
		color: var(--color-ink-muted);
		transition: all 0.15s ease;
	}

	.theme-btn:hover {
		color: var(--color-ink);
		background: var(--color-newsprint-dark);
	}

	.theme-btn.active {
		color: var(--color-ink);
		border-color: var(--color-border);
		background: var(--color-newsprint-dark);
	}

	.theme-btn svg {
		width: 1rem;
		height: 1rem;
	}
</style>
