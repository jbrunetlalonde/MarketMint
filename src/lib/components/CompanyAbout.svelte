<script lang="ts">
	import { formatCompact, formatNumber } from '$lib/utils/formatters';

	interface Props {
		name: string;
		description?: string;
		sector?: string;
		industry?: string;
		website?: string;
		employees?: number;
		headquarters?: string;
		ipoDate?: string;
		ceo?: string;
		loading?: boolean;
	}

	let {
		name,
		description,
		sector,
		industry,
		website,
		employees,
		headquarters,
		ipoDate,
		ceo,
		loading = false
	}: Props = $props();

	function truncateDescription(text: string, maxLength = 300): string {
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength).trim() + '...';
	}

	function formatWebsiteDisplay(url: string): string {
		return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
	}

	function formatIpoDate(dateStr: string): string {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return dateStr;
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<div class="company-about">
	<div class="section-header">
		<h3 class="section-title">About {name}</h3>
	</div>

	{#if loading}
		<div class="loading">Loading company information...</div>
	{:else}
		<div class="content">
			{#if description}
				<p class="description">{truncateDescription(description)}</p>
			{:else}
				<p class="description muted">No description available</p>
			{/if}

			<div class="meta-grid">
				{#if sector}
					<div class="meta-item">
						<span class="meta-label">Sector</span>
						<span class="meta-value">{sector}</span>
					</div>
				{/if}

				{#if industry}
					<div class="meta-item">
						<span class="meta-label">Industry</span>
						<span class="meta-value">{industry}</span>
					</div>
				{/if}

				{#if ceo}
					<div class="meta-item">
						<span class="meta-label">CEO</span>
						<span class="meta-value">{ceo}</span>
					</div>
				{/if}

				{#if employees}
					<div class="meta-item">
						<span class="meta-label">Employees</span>
						<span class="meta-value">{formatNumber(employees)}</span>
					</div>
				{/if}

				{#if headquarters}
					<div class="meta-item">
						<span class="meta-label">Headquarters</span>
						<span class="meta-value">{headquarters}</span>
					</div>
				{/if}

				{#if ipoDate}
					<div class="meta-item">
						<span class="meta-label">IPO Date</span>
						<span class="meta-value">{formatIpoDate(ipoDate)}</span>
					</div>
				{/if}

				{#if website}
					<div class="meta-item">
						<span class="meta-label">Website</span>
						<a href={website} target="_blank" rel="noopener noreferrer" class="meta-link">
							{formatWebsiteDisplay(website)}
						</a>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.company-about {
		border: 1px solid var(--color-border);
		background: var(--color-paper);
	}

	.section-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-newsprint-dark);
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

	.loading {
		padding: 2rem;
		text-align: center;
		color: var(--color-ink-muted);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
	}

	.content {
		padding: 1rem;
	}

	.description {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8125rem;
		line-height: 1.6;
		color: var(--color-ink);
		margin: 0 0 1rem 0;
	}

	.description.muted {
		color: var(--color-ink-muted);
		font-style: italic;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.75rem;
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.meta-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.meta-value {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--color-ink);
		font-weight: 500;
	}

	.meta-link {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		color: var(--color-accent);
		text-decoration: none;
		font-weight: 500;
	}

	.meta-link:hover {
		text-decoration: underline;
	}
</style>
