<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount, tick } from 'svelte';

	interface Props {
		onComplete: () => void;
	}

	let { onComplete }: Props = $props();

	interface OnboardingStep {
		id: string;
		title: string;
		description: string;
		targetSelector: string | null;
		position: 'top' | 'bottom' | 'left' | 'right' | 'center';
		route?: string;
	}

	const STEPS: OnboardingStep[] = [
		{
			id: 'welcome',
			title: 'WELCOME TO MARKETMINT',
			description:
				'Your retro-styled command center for market intelligence. Track stocks, monitor political trades, and stay informed with real-time financial data.',
			targetSelector: null,
			position: 'center',
			route: '/markets'
		},
		{
			id: 'market-overview',
			title: 'MARKET OVERVIEW',
			description:
				'This is your dashboard. Track major indices at a glance. Once you add stocks to your watchlist, they will appear here instead.',
			targetSelector: '.market-overview, .overview-grid',
			position: 'bottom',
			route: '/markets'
		},
		{
			id: 'top-movers',
			title: 'TOP MOVERS',
			description:
				'See which stocks are making waves today. Track the biggest gainers, losers, and most actively traded stocks all in one place.',
			targetSelector: '.movers-grid',
			position: 'bottom',
			route: '/markets'
		},
		{
			id: 'search',
			title: 'SEARCH FOR STOCKS',
			description:
				'Use the search bar to find any stock by ticker or company name. Press Cmd+K (or Ctrl+K) for quick access.',
			targetSelector: '.search-container, .search-input, input[type="search"]',
			position: 'bottom',
			route: '/markets'
		},
		{
			id: 'ticker-page',
			title: 'STOCK ANALYSIS',
			description:
				'Dive deep into any stock with comprehensive analysis: price charts, financial statements, analyst ratings, insider trades, and more.',
			targetSelector: null,
			position: 'center',
			route: '/ticker/AAPL'
		},
		{
			id: 'congress-trades',
			title: 'CONGRESS TRADES',
			description:
				'Track what politicians are buying and selling. Their stock trades are public record, and we make it easy to follow the smart money.',
			targetSelector: null,
			position: 'center',
			route: '/political/members'
		},
		{
			id: 'complete',
			title: "YOU'RE ALL SET!",
			description:
				'You now know the essentials. Explore the Markets page, build your watchlist, and track your investments. Happy trading!',
			targetSelector: null,
			position: 'center',
			route: '/markets'
		}
	];

	let currentStepIndex = $state(0);
	let targetElement = $state<HTMLElement | null>(null);
	let spotlightRect = $state({ top: 0, left: 0, width: 0, height: 0 });
	let tooltipStyle = $state('');
	let isTransitioning = $state(false);

	const currentStep = $derived(STEPS[currentStepIndex]);
	const isLastStep = $derived(currentStepIndex === STEPS.length - 1);
	const isFirstStep = $derived(currentStepIndex === 0);

	async function goToStep(index: number) {
		if (isTransitioning) return;
		isTransitioning = true;

		const step = STEPS[index];

		// Navigate to required route if different from current
		if (step.route && $page.url.pathname !== step.route) {
			await goto(step.route);
			// Wait for navigation and DOM update
			await new Promise((r) => setTimeout(r, 300));
			await tick();
		}

		currentStepIndex = index;

		// Find and highlight target element
		if (step.targetSelector) {
			await tick();
			// Try multiple selectors (comma-separated)
			const selectors = step.targetSelector.split(',').map((s) => s.trim());
			for (const selector of selectors) {
				targetElement = document.querySelector(selector);
				if (targetElement) break;
			}

			if (targetElement) {
				updateSpotlight();
				targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
				await new Promise((r) => setTimeout(r, 400));
				updateSpotlight();
			}
		} else {
			targetElement = null;
			spotlightRect = { top: 0, left: 0, width: 0, height: 0 };
		}

		calculateTooltipPosition();
		isTransitioning = false;
	}

	function updateSpotlight() {
		if (!targetElement) return;
		const rect = targetElement.getBoundingClientRect();
		const padding = 8;
		spotlightRect = {
			top: rect.top - padding,
			left: rect.left - padding,
			width: rect.width + padding * 2,
			height: rect.height + padding * 2
		};
	}

	function calculateTooltipPosition() {
		if (!targetElement || currentStep.position === 'center') {
			tooltipStyle = 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
			return;
		}

		const rect = targetElement.getBoundingClientRect();
		const padding = 16;

		switch (currentStep.position) {
			case 'bottom':
				tooltipStyle = `top: ${rect.bottom + padding}px; left: ${rect.left + rect.width / 2}px; transform: translateX(-50%);`;
				break;
			case 'top':
				tooltipStyle = `bottom: ${window.innerHeight - rect.top + padding}px; left: ${rect.left + rect.width / 2}px; transform: translateX(-50%);`;
				break;
			case 'right':
				tooltipStyle = `top: ${rect.top + rect.height / 2}px; left: ${rect.right + padding}px; transform: translateY(-50%);`;
				break;
			case 'left':
				tooltipStyle = `top: ${rect.top + rect.height / 2}px; right: ${window.innerWidth - rect.left + padding}px; transform: translateY(-50%);`;
				break;
		}
	}

	function nextStep() {
		if (isLastStep) {
			handleComplete();
		} else {
			goToStep(currentStepIndex + 1);
		}
	}

	function previousStep() {
		if (!isFirstStep) {
			goToStep(currentStepIndex - 1);
		}
	}

	function handleSkip() {
		handleComplete();
	}

	function handleComplete() {
		onComplete();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleSkip();
		} else if (e.key === 'ArrowRight' || e.key === 'Enter') {
			nextStep();
		} else if (e.key === 'ArrowLeft') {
			previousStep();
		}
	}

	onMount(() => {
		goToStep(0);
		window.addEventListener('resize', updateSpotlight);
		return () => window.removeEventListener('resize', updateSpotlight);
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="onboarding-overlay" class:has-spotlight={targetElement}>
	<!-- Spotlight cutout -->
	{#if targetElement}
		<div
			class="spotlight"
			style="top: {spotlightRect.top}px; left: {spotlightRect.left}px; width: {spotlightRect.width}px; height: {spotlightRect.height}px;"
		></div>
	{/if}

	<!-- Skip button -->
	<button type="button" class="skip-btn" onclick={handleSkip}> Skip Tour </button>

	<!-- Tooltip -->
	<div class="tooltip" style={tooltipStyle} class:centered={!targetElement}>
		<div class="tooltip-label">EDITION NOTE</div>
		<h3 class="tooltip-title">{currentStep.title}</h3>
		<p class="tooltip-description">{currentStep.description}</p>

		<!-- Progress -->
		<div class="progress">
			<span class="page-indicator">Page {currentStepIndex + 1} of {STEPS.length}</span>
			<div class="dots">
				{#each STEPS as _, i (i)}
					<span
						class="dot"
						class:active={i === currentStepIndex}
						class:completed={i < currentStepIndex}
					></span>
				{/each}
			</div>
		</div>

		<!-- Buttons -->
		<div class="buttons">
			{#if !isFirstStep}
				<button type="button" class="btn btn-secondary" onclick={previousStep}> Back </button>
			{/if}
			<button type="button" class="btn btn-primary" onclick={nextStep}>
				{isLastStep ? 'Get Started' : 'Next'}
			</button>
		</div>
	</div>
</div>

<style>
	.onboarding-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		z-index: 9998;
		transition: background 0.3s ease;
	}

	.onboarding-overlay.has-spotlight {
		background: transparent;
		pointer-events: none;
	}

	.onboarding-overlay.has-spotlight > * {
		pointer-events: auto;
	}

	.spotlight {
		position: fixed;
		border: 3px dashed var(--color-paper, #f5f0e1);
		background: transparent;
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75);
		z-index: 9999;
		transition: all 0.4s ease;
		border-radius: 4px;
	}

	.skip-btn {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 10001;
		background: none;
		border: none;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-paper, #f5f0e1);
		cursor: pointer;
		opacity: 0.8;
		transition: opacity 0.15s ease;
		padding: 0.5rem 1rem;
	}

	.skip-btn:hover {
		opacity: 1;
		text-decoration: underline;
	}

	.tooltip {
		position: fixed;
		max-width: 380px;
		width: calc(100% - 2rem);
		background: var(--color-paper, #f5f0e1);
		border: 2px solid var(--color-ink, #1a1a1a);
		padding: 1.5rem;
		z-index: 10000;
		font-family: 'IBM Plex Mono', monospace;
		box-shadow: 6px 6px 0 var(--color-ink, #1a1a1a);
	}

	.tooltip.centered {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.tooltip-label {
		position: absolute;
		top: -0.625rem;
		left: 1rem;
		background: var(--color-paper, #f5f0e1);
		padding: 0 0.5rem;
		font-size: 0.5625rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: var(--color-ink-muted, #666);
	}

	.tooltip-title {
		font-size: 1rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0 0 0.75rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border, #ccc);
		color: var(--color-ink, #1a1a1a);
	}

	.tooltip-description {
		font-size: 0.8125rem;
		line-height: 1.6;
		color: var(--color-ink-light, #333);
		margin: 0 0 1rem 0;
	}

	.progress {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
		padding-top: 0.75rem;
		border-top: 1px dotted var(--color-border, #ccc);
	}

	.page-indicator {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-ink-muted, #666);
	}

	.dots {
		display: flex;
		gap: 0.375rem;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-border, #ccc);
		transition: all 0.2s ease;
	}

	.dot.active {
		background: var(--color-ink, #1a1a1a);
		transform: scale(1.3);
	}

	.dot.completed {
		background: var(--color-ink-muted, #666);
	}

	.buttons {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.btn {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: 0.625rem 1.25rem;
		border: 1px solid var(--color-ink, #1a1a1a);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: var(--color-ink, #1a1a1a);
		color: var(--color-paper, #f5f0e1);
	}

	.btn-primary:hover {
		background: var(--color-ink-light, #333);
	}

	.btn-secondary {
		background: var(--color-paper, #f5f0e1);
		color: var(--color-ink, #1a1a1a);
	}

	.btn-secondary:hover {
		background: var(--color-newsprint, #eee);
	}

	@media (max-width: 640px) {
		.tooltip {
			max-width: calc(100% - 2rem);
			margin: 0 1rem;
		}

		.tooltip.centered {
			left: 1rem;
			right: 1rem;
			transform: translateY(-50%);
		}
	}
</style>
