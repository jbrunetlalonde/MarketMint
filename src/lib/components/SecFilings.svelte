<script lang="ts">
	import { formatDate } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	interface SecFiling {
		symbol?: string;
		cik?: string;
		formType: string;
		filingDate: string;
		acceptedDate?: string;
		link?: string;
		finalLink?: string;
	}

	interface Props {
		filings: SecFiling[];
		loading?: boolean;
		limit?: number;
		ticker?: string;
	}

	let { filings, loading = false, limit = 10, ticker }: Props = $props();

	const displayFilings = $derived(filings.slice(0, limit));

	function getFormTypeClass(formType: string): string {
		const type = formType.toUpperCase();
		if (type.includes('10-K') || type.includes('10K')) return 'annual';
		if (type.includes('10-Q') || type.includes('10Q')) return 'quarterly';
		if (type.includes('8-K') || type.includes('8K')) return 'current';
		if (type.includes('4') || type.includes('3') || type.includes('5')) return 'insider';
		if (type.includes('13')) return 'institutional';
		if (type.includes('DEF 14') || type.includes('PROXY')) return 'proxy';
		return '';
	}

	function getFormTypeDescription(formType: string): string {
		const type = formType.toUpperCase();
		if (type === '10-K' || type === '10K') return 'Annual Report';
		if (type === '10-Q' || type === '10Q') return 'Quarterly Report';
		if (type === '8-K' || type === '8K') return 'Current Report';
		if (type === '4') return 'Insider Trade';
		if (type === '3') return 'Initial Ownership';
		if (type === '5') return 'Annual Ownership';
		if (type.includes('13F')) return 'Institutional Holdings';
		if (type.includes('13D') || type.includes('13G')) return 'Beneficial Ownership';
		if (type.includes('DEF 14A')) return 'Proxy Statement';
		if (type.includes('S-1') || type.includes('S-3')) return 'Registration';
		return formType;
	}
</script>

<div class="sec-filings">
	<div class="section-header">
		<h3 class="section-title">SEC Filings</h3>
		{#if filings.length > 0}
			<span class="filing-count">{filings.length} filings</span>
		{/if}
	</div>

	{#if loading}
		<div class="loading">
			{#each Array(5) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if filings.length === 0}
		<EmptyState
			title="No SEC filings"
			description="No SEC filings found for {ticker || 'this stock'}."
			compact
		/>
	{:else}
		<div class="filings-list">
			{#each displayFilings as filing (filing.link || `${filing.formType}-${filing.filingDate}`)}
				<a
					href={filing.finalLink || filing.link || '#'}
					target="_blank"
					rel="noopener noreferrer"
					class="filing-item"
				>
					<div class="filing-type-wrapper">
						<span class="filing-type {getFormTypeClass(filing.formType)}">
							{filing.formType}
						</span>
					</div>
					<div class="filing-info">
						<span class="filing-description">{getFormTypeDescription(filing.formType)}</span>
						<span class="filing-date">Filed: {formatDate(filing.filingDate)}</span>
					</div>
					<div class="filing-link">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
							<polyline points="15 3 21 3 21 9"/>
							<line x1="10" y1="14" x2="21" y2="3"/>
						</svg>
					</div>
				</a>
			{/each}
		</div>

		{#if filings.length > limit}
			<div class="more-filings">
				+{filings.length - limit} more filings
			</div>
		{/if}
	{/if}
</div>

<style>
	.sec-filings {
		border: 1px solid var(--color-border);
		background: var(--color-paper);
	}

	.section-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-newsprint-dark);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-title {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
		color: var(--color-ink);
	}

	.filing-count {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.loading {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-row {
		height: 2rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.filings-list {
		display: flex;
		flex-direction: column;
	}

	.filing-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		text-decoration: none;
		color: inherit;
		transition: background-color 0.15s ease;
	}

	.filing-item:last-child {
		border-bottom: none;
	}

	.filing-item:hover {
		background: var(--color-newsprint-dark);
	}

	.filing-type-wrapper {
		flex-shrink: 0;
	}

	.filing-type {
		display: inline-block;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 700;
		padding: 3px 6px;
		border-radius: 2px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink);
		min-width: 48px;
		text-align: center;
	}

	.filing-type.annual {
		background: rgba(37, 99, 235, 0.15);
		color: #2563eb;
	}

	.filing-type.quarterly {
		background: rgba(22, 163, 74, 0.15);
		color: #16a34a;
	}

	.filing-type.current {
		background: rgba(234, 88, 12, 0.15);
		color: #ea580c;
	}

	.filing-type.insider {
		background: rgba(147, 51, 234, 0.15);
		color: #9333ea;
	}

	.filing-type.institutional {
		background: rgba(6, 182, 212, 0.15);
		color: #06b6d4;
	}

	.filing-type.proxy {
		background: rgba(236, 72, 153, 0.15);
		color: #ec4899;
	}

	.filing-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.filing-description {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-ink);
	}

	.filing-date {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.filing-link {
		flex-shrink: 0;
		color: var(--color-ink-muted);
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.filing-item:hover .filing-link {
		opacity: 1;
	}

	.more-filings {
		padding: 0.75rem;
		text-align: center;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		border-top: 1px solid var(--color-border);
	}
</style>
