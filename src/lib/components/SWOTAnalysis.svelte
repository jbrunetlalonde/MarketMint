<script lang="ts">
	import { onMount } from 'svelte';
	import api from '$lib/utils/api';

	interface Props {
		ticker: string;
	}

	interface SWOTData {
		ticker: string;
		companyName: string;
		strengths: string[];
		weaknesses: string[];
		opportunities: string[];
		threats: string[];
		cached: boolean;
		generatedAt: string;
	}

	let { ticker }: Props = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let swotData = $state<SWOTData | null>(null);
	let refreshing = $state(false);
	let aiAvailable = $state(true);

	// Collapsible sections
	let expandedSections = $state<Set<string>>(new Set(['strengths', 'weaknesses', 'opportunities', 'threats']));

	function toggleSection(section: string) {
		if (expandedSections.has(section)) {
			expandedSections = new Set([...expandedSections].filter(s => s !== section));
		} else {
			expandedSections = new Set([...expandedSections, section]);
		}
	}

	async function loadSWOT(forceRefresh = false) {
		if (forceRefresh) {
			refreshing = true;
		} else {
			loading = true;
		}
		error = null;

		try {
			const res = forceRefresh
				? await api.refreshSWOT(ticker)
				: await api.getSWOT(ticker);

			if (res.success && res.data) {
				swotData = res.data;
			} else {
				error = res.error?.message || 'Failed to load analysis';
			}
		} catch (err) {
			error = 'Failed to load SWOT analysis';
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	async function checkAvailability() {
		try {
			const res = await api.getAnalysisStatus();
			aiAvailable = res.success && res.data?.available === true;
		} catch {
			aiAvailable = false;
		}
	}

	onMount(() => {
		checkAvailability().then(() => {
			if (aiAvailable) {
				loadSWOT();
			}
		});
	});

	// Reload when ticker changes
	$effect(() => {
		if (ticker && aiAvailable) {
			loadSWOT();
		}
	});

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<div class="swot-analysis">
	{#if !aiAvailable}
		<div class="unavailable">
			<p>AI analysis is not available</p>
		</div>
	{:else if loading}
		<div class="loading">
			<div class="loading-spinner"></div>
			<p>Generating analysis...</p>
		</div>
	{:else if error}
		<div class="error">
			<p>{error}</p>
			<button onclick={() => loadSWOT()}>Try Again</button>
		</div>
	{:else if swotData}
		<div class="swot-header">
			<div class="swot-meta">
				<span class="ai-badge">AI Generated</span>
				{#if swotData.cached}
					<span class="cached-badge">Cached</span>
				{/if}
				<span class="timestamp">{formatDate(swotData.generatedAt)}</span>
			</div>
			<button
				class="refresh-btn"
				onclick={() => loadSWOT(true)}
				disabled={refreshing}
			>
				{refreshing ? 'Refreshing...' : 'Refresh'}
			</button>
		</div>

		<div class="swot-grid">
			<!-- Strengths -->
			<div class="swot-section strengths">
				<button class="section-header" onclick={() => toggleSection('strengths')}>
					<span class="section-icon">S</span>
					<span class="section-title">Strengths</span>
					<span class="section-toggle">{expandedSections.has('strengths') ? '-' : '+'}</span>
				</button>
				{#if expandedSections.has('strengths')}
					<ul class="section-content">
						{#each swotData.strengths as item, i (`s-${i}`)}
							<li>{item}</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Weaknesses -->
			<div class="swot-section weaknesses">
				<button class="section-header" onclick={() => toggleSection('weaknesses')}>
					<span class="section-icon">W</span>
					<span class="section-title">Weaknesses</span>
					<span class="section-toggle">{expandedSections.has('weaknesses') ? '-' : '+'}</span>
				</button>
				{#if expandedSections.has('weaknesses')}
					<ul class="section-content">
						{#each swotData.weaknesses as item, i (`w-${i}`)}
							<li>{item}</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Opportunities -->
			<div class="swot-section opportunities">
				<button class="section-header" onclick={() => toggleSection('opportunities')}>
					<span class="section-icon">O</span>
					<span class="section-title">Opportunities</span>
					<span class="section-toggle">{expandedSections.has('opportunities') ? '-' : '+'}</span>
				</button>
				{#if expandedSections.has('opportunities')}
					<ul class="section-content">
						{#each swotData.opportunities as item, i (`o-${i}`)}
							<li>{item}</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Threats -->
			<div class="swot-section threats">
				<button class="section-header" onclick={() => toggleSection('threats')}>
					<span class="section-icon">T</span>
					<span class="section-title">Threats</span>
					<span class="section-toggle">{expandedSections.has('threats') ? '-' : '+'}</span>
				</button>
				{#if expandedSections.has('threats')}
					<ul class="section-content">
						{#each swotData.threats as item, i (`t-${i}`)}
							<li>{item}</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.swot-analysis {
		padding: 0.5rem 0;
	}

	.unavailable,
	.loading,
	.error {
		text-align: center;
		padding: 1.5rem 1rem;
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-ink);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.unavailable p,
	.loading p,
	.error p {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin: 0;
	}

	.error p {
		color: var(--color-loss);
		margin-bottom: 0.75rem;
	}

	.error button {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--color-border);
		background: var(--color-paper);
		cursor: pointer;
	}

	.swot-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px dotted var(--color-border);
	}

	.swot-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.ai-badge {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.25rem 0.5rem;
		background: var(--color-ink);
		color: var(--color-paper);
		border-radius: 2px;
	}

	.cached-badge {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.25rem 0.5rem;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
		border-radius: 2px;
	}

	.timestamp {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.refresh-btn {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-paper);
		cursor: pointer;
		transition: all 0.15s;
	}

	.refresh-btn:hover:not(:disabled) {
		background: var(--color-newsprint);
	}

	.refresh-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.swot-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.swot-section {
		border: 1px solid var(--color-border);
		background: var(--color-paper);
		overflow: hidden;
	}

	.section-header {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.strengths .section-header {
		background: rgba(16, 185, 129, 0.1);
	}

	.weaknesses .section-header {
		background: rgba(239, 68, 68, 0.1);
	}

	.opportunities .section-header {
		background: rgba(59, 130, 246, 0.1);
	}

	.threats .section-header {
		background: rgba(245, 158, 11, 0.1);
	}

	.section-icon {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.strengths .section-icon {
		background: #10b981;
		color: white;
	}

	.weaknesses .section-icon {
		background: #ef4444;
		color: white;
	}

	.opportunities .section-icon {
		background: #3b82f6;
		color: white;
	}

	.threats .section-icon {
		background: #f59e0b;
		color: white;
	}

	.section-title {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		flex: 1;
		color: var(--color-ink);
	}

	.section-toggle {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
	}

	.section-content {
		margin: 0;
		padding: 0.5rem;
		list-style: none;
		border-top: 1px dotted var(--color-border);
	}

	.section-content li {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		line-height: 1.5;
		color: var(--color-ink);
		padding: 0.25rem 0;
		padding-left: 0.75rem;
		position: relative;
	}

	.section-content li::before {
		content: '-';
		position: absolute;
		left: 0;
		color: var(--color-ink-muted);
	}

	@media (max-width: 480px) {
		.swot-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
