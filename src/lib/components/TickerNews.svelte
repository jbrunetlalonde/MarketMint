<script lang="ts">
	import { formatRelativeTime } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';
	import NewsFilters from './NewsFilters.svelte';

	type SentimentFilter = 'all' | 'bullish' | 'bearish' | 'neutral';

	interface NewsItem {
		id?: string;
		title: string;
		text?: string;
		url: string;
		image?: string | null;
		site?: string | null;
		source?: string | null;
		publishedDate?: string;
		publishedAt?: string;
		sentiment?: string | null;
	}

	interface Props {
		news: NewsItem[];
		loading?: boolean;
		limit?: number;
		ticker?: string;
		useInternalReader?: boolean;
		showFilters?: boolean;
	}

	let { news, loading = false, limit = 5, ticker, useInternalReader = true, showFilters = false }: Props = $props();

	// Filter state
	let sentimentFilter = $state<SentimentFilter>('all');
	let selectedSources = $state<string[]>([]);

	// Extract unique sources from news
	const availableSources = $derived(() => {
		const sources = new Set<string>();
		for (const item of news) {
			const source = item.source || item.site;
			if (source) sources.add(source);
		}
		return Array.from(sources).sort();
	});

	// Check if any news has sentiment data
	const hasSentimentData = $derived(() => {
		return news.some((item) => item.sentiment && item.sentiment !== 'neutral');
	});

	// Filter news based on current filters
	const filteredNews = $derived(() => {
		let result = news;

		// Filter by sentiment
		if (sentimentFilter !== 'all') {
			result = result.filter((item) => {
				const sentiment = item.sentiment?.toLowerCase();
				return sentiment === sentimentFilter;
			});
		}

		// Filter by sources
		if (selectedSources.length > 0) {
			result = result.filter((item) => {
				const source = item.source || item.site;
				return source && selectedSources.includes(source);
			});
		}

		return result;
	});

	// Video URL patterns
	const VIDEO_PATTERNS = [
		/youtube\.com\/watch/i,
		/youtube\.com\/shorts\//i,
		/youtu\.be\//i,
		/vimeo\.com\/\d+/i,
		/dailymotion\.com\/video/i,
		/twitch\.tv\//i,
		/tiktok\.com\//i,
		/cnbc\.com\/video/i,
		/bloomberg\.com\/news\/videos/i,
		/reuters\.com\/video/i,
		/foxbusiness\.com\/video/i,
		/foxnews\.com\/video/i,
		/cnn\.com\/videos/i,
		/msnbc\.com\/.*\/watch\//i,
		/yahoo\.com\/.*\/video/i,
		/finance\.yahoo\.com\/video/i,
		/benzinga\.com\/.*video/i,
		/marketwatch\.com\/video/i,
		/podcasts\.apple\.com/i,
		/spotify\.com\/episode/i,
		/anchor\.fm/i
	];

	function isVideoUrl(url: string): boolean {
		return VIDEO_PATTERNS.some((pattern) => pattern.test(url));
	}

	const displayNews = $derived(filteredNews().slice(0, limit));
	const totalFiltered = $derived(filteredNews().length);

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

	function getReaderUrl(item: NewsItem): string {
		const params = new URLSearchParams({ url: item.url });
		if (ticker) params.append('ticker', ticker);
		if (item.title) params.append('title', item.title);
		return `/news/article?${params.toString()}`;
	}

	function getNewsUrl(item: NewsItem): { href: string; external: boolean } {
		// Videos always open externally
		if (isVideoUrl(item.url)) {
			return { href: item.url, external: true };
		}
		// Regular articles use internal reader if enabled
		if (useInternalReader) {
			return { href: getReaderUrl(item), external: false };
		}
		return { href: item.url, external: true };
	}
</script>

<div class="ticker-news">
	<div class="section-header">
		<h3 class="section-title">Latest News</h3>
		{#if news.length > 0}
			<span class="news-count">
				{#if totalFiltered !== news.length}
					{totalFiltered} of {news.length}
				{:else}
					{news.length}
				{/if}
				articles
			</span>
		{/if}
	</div>

	{#if showFilters && news.length > 0 && !loading && (hasSentimentData() || availableSources().length > 0)}
		<NewsFilters
			sentiment={sentimentFilter}
			sources={availableSources()}
			{selectedSources}
			onSentimentChange={(s) => (sentimentFilter = s)}
			onSourcesChange={(s) => (selectedSources = s)}
			showSentiment={hasSentimentData()}
		/>
	{/if}

	{#if loading}
		<div class="loading">
			{#each Array(3) as _, i (i)}
				<div class="skeleton-item">
					<div class="skeleton skeleton-title"></div>
					<div class="skeleton skeleton-meta"></div>
				</div>
			{/each}
		</div>
	{:else if news.length === 0}
		<EmptyState
			title="No recent news"
			description="No news articles found for {ticker || 'this stock'}."
			compact
		/>
	{:else if displayNews.length === 0}
		<EmptyState
			title="No matching articles"
			description="Try adjusting your filters to see more results."
			icon="search"
			compact
		/>
	{:else}
		<div class="news-list">
			{#each displayNews as item, index (item.url)}
				{@const newsUrl = getNewsUrl(item)}
				{@const isVideo = isVideoUrl(item.url)}
				{@const isFirst = index === 0}
				<a
					href={newsUrl.href}
					target={newsUrl.external ? '_blank' : undefined}
					rel={newsUrl.external ? 'noopener noreferrer' : undefined}
					class="news-item"
					class:featured={isFirst}
				>
					{#if item.image}
						<div class="news-image" class:featured-image={isFirst}>
							<img src={item.image} alt="" loading="lazy" />
							<div class="image-overlay"></div>
							{#if isVideo}
								<span class="video-badge">
									<svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
										<path d="M8 5v14l11-7z"/>
									</svg>
									VIDEO
								</span>
							{/if}
						</div>
					{:else if isVideo}
						<div class="video-indicator">
							<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
								<path d="M8 5v14l11-7z"/>
							</svg>
						</div>
					{/if}
					<div class="news-content">
						<h4 class="news-title">{item.title}</h4>
						{#if item.text}
							<p class="news-excerpt">{truncateText(item.text, isFirst ? 180 : 120)}</p>
						{/if}
						<div class="news-meta">
							{#if item.site || item.source}
								<span class="news-source">{item.site || item.source}</span>
							{/if}
							{#if item.publishedDate || item.publishedAt}
								<span class="meta-separator"></span>
								<span class="news-date">{getPublishedDate(item)}</span>
							{/if}
							{#if newsUrl.external}
								<span class="external-indicator" title="Opens in new tab">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10">
										<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
									</svg>
								</span>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>

		{#if totalFiltered > limit}
			<a href="/news?ticker={ticker}" class="more-news">
				View all {totalFiltered} articles
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
					<path d="M5 12h14M12 5l7 7-7 7"/>
				</svg>
			</a>
		{/if}
	{/if}
</div>

<style>
	.ticker-news {
		border: 1px solid var(--color-border);
		background: var(--color-paper);
		border-radius: 4px;
		overflow: hidden;
	}

	.section-header {
		padding: 0.875rem 1rem;
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
		letter-spacing: 0.08em;
		margin: 0;
		color: var(--color-ink);
	}

	.news-count {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		background: var(--color-newsprint);
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
	}

	.loading {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.skeleton-item {
		display: flex;
		gap: 0.75rem;
	}

	.skeleton-title {
		height: 3.5rem;
		width: 80px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.skeleton-meta {
		flex: 1;
		height: 3.5rem;
		border-radius: 4px;
	}

	.news-list {
		display: flex;
		flex-direction: column;
	}

	.news-item {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
		position: relative;
	}

	.news-item:last-child {
		border-bottom: none;
	}

	.news-item:hover {
		background: var(--color-newsprint);
	}

	.news-item:hover .news-title {
		color: var(--color-accent);
	}

	.news-item:hover .news-image img {
		transform: scale(1.05);
	}

	/* Featured first article */
	.news-item.featured {
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
		background: linear-gradient(to bottom, var(--color-newsprint), transparent);
	}

	.news-item.featured .news-title {
		font-size: 1rem;
		-webkit-line-clamp: 3;
	}

	.news-item.featured .news-excerpt {
		-webkit-line-clamp: 3;
	}

	.news-image {
		flex-shrink: 0;
		width: 100px;
		height: 70px;
		overflow: hidden;
		border-radius: 4px;
		position: relative;
		background: var(--color-newsprint-dark);
	}

	.news-image.featured-image {
		width: 100%;
		height: 160px;
	}

	.news-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s ease;
	}

	.image-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%);
		pointer-events: none;
	}

	.video-badge {
		position: absolute;
		bottom: 6px;
		left: 6px;
		padding: 3px 8px;
		background: rgba(0, 0, 0, 0.85);
		color: #fff;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		border-radius: 3px;
		display: flex;
		align-items: center;
		gap: 4px;
		backdrop-filter: blur(4px);
	}

	.video-indicator {
		flex-shrink: 0;
		width: 100px;
		height: 70px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-newsprint-dark);
		border-radius: 4px;
		color: var(--color-ink-muted);
		transition: all 0.2s ease;
	}

	.news-item:hover .video-indicator {
		background: var(--color-ink);
		color: var(--color-paper);
	}

	.news-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.news-title {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.4;
		margin: 0;
		color: var(--color-ink);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		transition: color 0.2s ease;
	}

	.news-excerpt {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		line-height: 1.5;
		color: var(--color-ink-light);
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
		padding-top: 4px;
	}

	.news-source {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-accent);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.meta-separator {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--color-ink-muted);
		opacity: 0.5;
	}

	.news-date {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.external-indicator {
		color: var(--color-ink-muted);
		opacity: 0.6;
		margin-left: auto;
		display: flex;
		align-items: center;
	}

	.more-news {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-accent);
		text-decoration: none;
		border-top: 1px solid var(--color-border);
		background: var(--color-newsprint);
		transition: all 0.2s ease;
	}

	.more-news:hover {
		background: var(--color-newsprint-dark);
		color: var(--color-ink);
	}

	.more-news svg {
		transition: transform 0.2s ease;
	}

	.more-news:hover svg {
		transform: translateX(3px);
	}

	@media (max-width: 640px) {
		.news-item.featured {
			padding: 1rem;
		}

		.news-image.featured-image {
			height: 120px;
		}

		.news-image {
			width: 80px;
			height: 60px;
		}

		.video-indicator {
			width: 80px;
			height: 60px;
		}

		.news-item.featured .news-title {
			font-size: 0.875rem;
		}
	}
</style>
