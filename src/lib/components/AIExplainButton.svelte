<script lang="ts">
	import { analysisApi, type SectionType } from '$lib/utils/api/analysis';

	interface Props {
		ticker: string;
		sectionType: SectionType;
		data: Record<string, unknown>;
		label?: string;
	}

	let { ticker, sectionType, data, label = 'Explain This' }: Props = $props();

	let isOpen = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let explanation = $state<string | null>(null);
	let cached = $state(false);
	let generatedAt = $state<string | null>(null);

	async function fetchExplanation() {
		// If we already have an explanation, just show the modal
		if (explanation) {
			isOpen = true;
			return;
		}

		// Open modal first to show loading state
		isOpen = true;
		loading = true;
		error = null;

		try {
			const result = await analysisApi.explainSection(ticker, sectionType, data);

			if (!result.success || !result.data) {
				error = result.error?.message || 'Failed to generate explanation';
				return;
			}

			explanation = result.data.explanation;
			cached = result.data.cached;
			generatedAt = result.data.generatedAt;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to generate explanation';
			if (message.includes('rate limit')) {
				error = 'Rate limit reached. Please try again in a minute.';
			} else {
				error = message;
			}
		} finally {
			loading = false;
		}
	}

	function closeModal() {
		isOpen = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			closeModal();
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<button class="explain-btn" onclick={fetchExplanation} disabled={loading}>
	{#if loading}
		<span class="btn-spinner"></span>
	{:else}
		<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="10" />
			<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
			<line x1="12" y1="17" x2="12.01" y2="17" />
		</svg>
	{/if}
	<span>{label}</span>
</button>

{#if isOpen}
	<div class="modal-overlay" onclick={closeModal} role="presentation">
		<div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-header">
				<div class="header-left">
					<svg class="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M12 2L2 7l10 5 10-5-10-5z" />
						<path d="M2 17l10 5 10-5" />
						<path d="M2 12l10 5 10-5" />
					</svg>
					<span class="title">AI Analysis</span>
				</div>
				<div class="header-right">
					{#if cached && !loading}
						<span class="cached-badge">Cached</span>
					{/if}
					<button class="close-btn" onclick={closeModal} aria-label="Close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
			</div>

			<div class="modal-body">
				{#if loading}
					<div class="loading-state">
						<div class="loading-spinner"></div>
						<p>Analyzing {ticker} data...</p>
					</div>
				{:else if error}
					<div class="error-state">
						<svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						<p>{error}</p>
						<button class="retry-btn" onclick={fetchExplanation}>Try Again</button>
					</div>
				{:else if explanation}
					<p class="explanation-text">{explanation}</p>
					{#if generatedAt}
						<p class="generated-at">Generated {formatDate(generatedAt)}</p>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.explain-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #fff;
		background: #0a0a0a;
		border: 1px solid #333;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.explain-btn:hover:not(:disabled) {
		background: #1a1a1a;
		border-color: #444;
	}

	.explain-btn:disabled {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.icon {
		width: 12px;
		height: 12px;
	}

	.btn-spinner {
		width: 12px;
		height: 12px;
		border: 1.5px solid #444;
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: #0a0a0a;
		border: 1px solid #333;
		border-radius: 12px;
		max-width: 480px;
		width: 100%;
		max-height: 80vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #222;
		background: #111;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.ai-icon {
		width: 18px;
		height: 18px;
		color: #10b981;
	}

	.title {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #fff;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.cached-badge {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.25rem 0.5rem;
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
		border-radius: 4px;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		background: #222;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		color: #888;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: #333;
		color: #fff;
	}

	.close-btn svg {
		width: 14px;
		height: 14px;
	}

	.modal-body {
		padding: 1.5rem 1.25rem;
		overflow-y: auto;
		min-height: 120px;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem 1rem;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 2px solid #333;
		border-top-color: #10b981;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.loading-state p {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: #888;
		margin: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.explanation-text {
		font-family: var(--font-body);
		font-size: 0.9375rem;
		line-height: 1.7;
		color: #e5e5e5;
		margin: 0;
		white-space: pre-wrap;
	}

	.generated-at {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: #666;
		margin: 1.25rem 0 0 0;
		text-align: right;
	}

	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 1.5rem 1rem;
		gap: 0.75rem;
	}

	.error-icon {
		width: 32px;
		height: 32px;
		color: #ef4444;
	}

	.error-state p {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		color: #ef4444;
		margin: 0;
	}

	.retry-btn {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.625rem 1.25rem;
		background: #fff;
		color: #0a0a0a;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
		margin-top: 0.5rem;
	}

	.retry-btn:hover {
		background: #e5e5e5;
	}

	@media (max-width: 480px) {
		.modal-content {
			max-height: 90vh;
			border-radius: 8px;
		}

		.modal-body {
			padding: 1.25rem 1rem;
		}
	}
</style>
