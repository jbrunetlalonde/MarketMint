<script lang="ts">
	import { formatRelativeTime } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	interface NewsItem {
		id?: string;
		title: string;
		text?: string;
		url: string;
		image?: string | null;
		site?: string | null;
		publishedDate?: string;
		publishedAt?: string;
	}

	interface Props {
		news: NewsItem[];
		loading?: boolean;
		limit?: number;
		ticker?: string;
	}

	let { news, loading = false, limit = 5, ticker }: Props = $props();

	const displayNews = $derived(news.slice(0, limit));

	function getPublishedDate(item: NewsItem): string {
		const date = item.publishedDate || item.publishedAt;
		if (!date) return '';
		return formatRelativeTime(date);
	}

	function truncateText(text: string | undefined, maxLength = 120): string {
		if (!text) return '';
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength).trim() + '...';
	}
</script>

<div class="ticker-news">
	<div class="section-header">
		<h3 class="section-title">Latest News</h3>
		{#if news.length > 0}
			<span class="news-count">{news.length} articles</span>
		{/if}
	</div>

	{#if loading}
		<div class="loading">
			{#each Array(3) as _, i (i)}
				<div class="skeleton-item">
					<div class="skeleton-title"></div>
					<div class="skeleton-meta"></div>
				</div>
			{/each}
		</div>
	{:else if news.length === 0}
		<EmptyState
			title="No recent news"
			description="No news articles found for {ticker || 'this stock'}."
			compact
		/>
	{:else}
		<div class="news-list">
			{#each displayNews as item (item.url)}
				<a href={item.url} target="_blank" rel="noopener noreferrer" class="news-item">
					{#if item.image}
						<div class="news-image">
							<img src={item.image} alt="" loading="lazy" />
						</div>
					{/if}
					<div class="news-content">
						<h4 class="news-title">{item.title}</h4>
						{#if item.text}
							<p class="news-excerpt">{truncateText(item.text)}</p>
						{/if}
						<div class="news-meta">
							{#if item.site}
								<span class="news-source">{item.site}</span>
							{/if}
							{#if item.publishedDate || item.publishedAt}
								<span class="news-date">{getPublishedDate(item)}</span>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>

		{#if news.length > limit}
			<div class="more-news">
				+{news.length - limit} more articles
			</div>
		{/if}
	{/if}
</div>

<style>
	.ticker-news {
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

	.news-count {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.loading {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skeleton-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-title {
		height: 1rem;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		animation: pulse 1.5s infinite;
	}

	.skeleton-meta {
		height: 0.75rem;
		width: 50%;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.news-list {
		display: flex;
		flex-direction: column;
	}

	.news-item {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem;
		border-bottom: 1px solid var(--color-border);
		text-decoration: none;
		color: inherit;
		transition: background-color 0.15s ease;
	}

	.news-item:last-child {
		border-bottom: none;
	}

	.news-item:hover {
		background: var(--color-newsprint-dark);
	}

	.news-image {
		flex-shrink: 0;
		width: 80px;
		height: 60px;
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	.news-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.news-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.news-title {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.3;
		margin: 0;
		color: var(--color-ink);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.news-excerpt {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		line-height: 1.4;
		color: var(--color-ink-muted);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.news-meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-top: auto;
	}

	.news-source {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-accent);
		text-transform: uppercase;
	}

	.news-date {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.more-news {
		padding: 0.75rem;
		text-align: center;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		border-top: 1px solid var(--color-border);
	}
</style>
