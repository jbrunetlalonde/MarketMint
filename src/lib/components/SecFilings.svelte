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
	let showLegend = $state(false);

	function getFormTypeClass(formType: string): string {
		const type = formType.toUpperCase();
		if (type.includes('10-K') || type.includes('10K')) return 'annual';
		if (type.includes('10-Q') || type.includes('10Q')) return 'quarterly';
		if (type.includes('8-K') || type.includes('8K')) return 'current';
		if (type === '4' || type === '3' || type === '5') return 'insider';
		if (type.includes('13F') || type.includes('13D') || type.includes('13G')) return 'institutional';
		if (type.includes('DEF 14') || type.includes('PROXY')) return 'proxy';
		if (type.includes('S-1') || type.includes('S-3') || type.includes('S-4') || type.includes('S-8') || type.includes('424')) return 'registration';
		return '';
	}

	function getFormTypeDescription(formType: string): string {
		const type = formType.toUpperCase().trim();
		// Annual/Quarterly reports
		if (type === '10-K' || type === '10K') return 'Annual Report';
		if (type === '10-K/A' || type === '10K/A') return 'Annual Report (Amended)';
		if (type === '10-Q' || type === '10Q') return 'Quarterly Report';
		if (type === '10-Q/A' || type === '10Q/A') return 'Quarterly Report (Amended)';
		// Current reports
		if (type === '8-K' || type === '8K') return 'Current Event Report';
		if (type === '8-K/A' || type === '8K/A') return 'Current Event (Amended)';
		// Insider filings
		if (type === '4') return 'Insider Transaction';
		if (type === '4/A') return 'Insider Transaction (Amended)';
		if (type === '3') return 'Initial Insider Ownership';
		if (type === '5') return 'Annual Insider Changes';
		// Institutional filings
		if (type.includes('13F-HR')) return 'Institutional Holdings Report';
		if (type.includes('13F')) return 'Institutional Holdings';
		if (type.includes('13D')) return 'Activist Investor Filing';
		if (type.includes('13G')) return 'Passive Investor Filing';
		if (type.includes('SC 13D') || type.includes('SC13D')) return 'Activist Stake (5%+)';
		if (type.includes('SC 13G') || type.includes('SC13G')) return 'Passive Stake (5%+)';
		// Proxy statements
		if (type.includes('DEF 14A')) return 'Proxy Statement';
		if (type.includes('DEFA14A')) return 'Proxy Supplement';
		if (type.includes('PRE 14A')) return 'Preliminary Proxy';
		// Registration statements
		if (type === 'S-1' || type === 'S-1/A') return 'IPO Registration';
		if (type === 'S-3' || type === 'S-3/A') return 'Shelf Registration';
		if (type === 'S-4' || type === 'S-4/A') return 'M&A Registration';
		if (type === 'S-8') return 'Employee Stock Plan';
		if (type.includes('424B')) return 'Prospectus Filing';
		if (type === 'F-1') return 'Foreign IPO Registration';
		// Other common filings
		if (type === '6-K') return 'Foreign Current Report';
		if (type === '20-F') return 'Foreign Annual Report';
		if (type.includes('NT 10-K') || type.includes('NT 10K')) return 'Annual Report Notification';
		if (type.includes('NT 10-Q') || type.includes('NT 10Q')) return 'Quarterly Report Notification';
		if (type.includes('EFFECT')) return 'Registration Effective';
		if (type.includes('144')) return 'Sale Notice (Restricted Stock)';
		return formType;
	}

	function getImportanceLevel(formType: string): 'high' | 'medium' | 'low' {
		const type = formType.toUpperCase();
		// High importance: major reports and significant events
		if (type.includes('10-K') || type.includes('10K')) return 'high';
		if (type.includes('10-Q') || type.includes('10Q')) return 'high';
		if (type.includes('8-K') || type.includes('8K')) return 'high';
		if (type.includes('DEF 14A')) return 'high';
		if (type.includes('13D')) return 'high'; // Activist investors
		if (type.includes('S-1')) return 'high'; // IPO
		// Medium importance: ownership and institutional
		if (type === '4' || type === '3' || type === '5') return 'medium';
		if (type.includes('13F') || type.includes('13G')) return 'medium';
		if (type.includes('S-3') || type.includes('S-4') || type.includes('424')) return 'medium';
		// Low importance: routine filings
		return 'low';
	}

	function getRelativeTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
		return `${Math.floor(diffDays / 365)}y ago`;
	}
</script>

<div class="sec-filings">
	<div class="section-header">
		<h3 class="section-title">SEC Filings</h3>
		<div class="header-actions">
			<button
				class="help-btn"
				onclick={() => showLegend = !showLegend}
				title="What do these filings mean?"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10"></circle>
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
					<circle cx="12" cy="17" r="0.5" fill="currentColor"></circle>
				</svg>
			</button>
			{#if filings.length > 0}
				<span class="filing-count">{filings.length} filings</span>
			{/if}
		</div>
	</div>

	{#if showLegend}
		<div class="legend">
			<div class="legend-title">Filing Types Guide</div>
			<div class="legend-grid">
				<div class="legend-item">
					<span class="filing-type annual">10-K</span>
					<span>Annual Report - Comprehensive yearly business review</span>
				</div>
				<div class="legend-item">
					<span class="filing-type quarterly">10-Q</span>
					<span>Quarterly Report - Financial results every 3 months</span>
				</div>
				<div class="legend-item">
					<span class="filing-type current">8-K</span>
					<span>Current Event - Material events (earnings, M&A, changes)</span>
				</div>
				<div class="legend-item">
					<span class="filing-type insider">4</span>
					<span>Insider Trade - Executives buying/selling shares</span>
				</div>
				<div class="legend-item">
					<span class="filing-type institutional">13F</span>
					<span>Institutional Holdings - Quarterly positions of funds</span>
				</div>
				<div class="legend-item">
					<span class="filing-type proxy">DEF 14A</span>
					<span>Proxy Statement - Shareholder meeting and votes</span>
				</div>
			</div>
		</div>
	{/if}

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
					class="filing-item importance-{getImportanceLevel(filing.formType)}"
				>
					<div class="filing-type-wrapper">
						<span class="filing-type {getFormTypeClass(filing.formType)}">
							{filing.formType}
						</span>
					</div>
					<div class="filing-info">
						<span class="filing-description">{getFormTypeDescription(filing.formType)}</span>
						<span class="filing-date">
							<span class="relative-time">{getRelativeTime(filing.filingDate)}</span>
							<span class="full-date">{formatDate(filing.filingDate)}</span>
						</span>
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

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.help-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 50%;
		cursor: pointer;
		color: var(--color-ink-muted);
		transition: all 0.15s ease;
	}

	.help-btn:hover {
		color: var(--color-ink);
		border-color: var(--color-ink-muted);
		background: var(--color-newsprint);
	}

	.legend {
		padding: 0.75rem 1rem;
		background: var(--color-newsprint);
		border-bottom: 1px solid var(--color-border);
	}

	.legend-title {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		margin-bottom: 0.625rem;
	}

	.legend-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	@media (max-width: 640px) {
		.legend-grid {
			grid-template-columns: 1fr;
		}
	}

	.legend-item {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		line-height: 1.4;
	}

	.legend-item .filing-type {
		flex-shrink: 0;
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

	.filing-type.registration {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
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
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.relative-time {
		font-weight: 500;
		color: var(--color-ink-light);
	}

	.full-date {
		opacity: 0.7;
	}

	/* Importance level indicators */
	.filing-item.importance-high {
		border-left: 3px solid var(--color-ink);
	}

	.filing-item.importance-medium {
		border-left: 3px solid var(--color-ink-muted);
	}

	.filing-item.importance-low {
		border-left: 3px solid transparent;
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
