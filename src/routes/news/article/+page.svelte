<script lang="ts">
	import { page } from '$app/stores';
	import { newsApi, type ExtractedArticle, type RelatedArticle } from '$lib/utils/api/news';
	import api from '$lib/utils/api';
	import { API_BASE } from '$lib/utils/api/request';

	let article = $state<ExtractedArticle | null>(null);
	let related = $state<RelatedArticle[]>([]);
	let recentNews = $state<Array<{ title: string; url: string; source: string | null }>>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let extractionStatus = $state<string>('pending');

	// AI Summary state
	let showSummary = $state(false);
	let summaryLoading = $state(false);
	let aiSummary = $state<string | null>(null);

	const url = $derived($page.url.searchParams.get('url'));
	const ticker = $derived($page.url.searchParams.get('ticker'));
	const title = $derived($page.url.searchParams.get('title'));

	// Video URL patterns for client-side detection (instant redirect)
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

	function isVideoUrl(testUrl: string): boolean {
		return VIDEO_PATTERNS.some((pattern) => pattern.test(testUrl));
	}

	async function loadArticle() {
		if (!url) {
			error = 'No article URL provided';
			loading = false;
			return;
		}

		// Instant redirect for video URLs (no API call needed)
		if (isVideoUrl(url)) {
			window.location.href = url;
			return;
		}

		loading = true;
		error = null;

		try {
			const [articleResponse, newsResponse] = await Promise.all([
				newsApi.extractArticle({
					url,
					ticker: ticker || undefined,
					title: title || undefined
				}),
				api.getNews(10)
			]);

			if (articleResponse.success && articleResponse.data) {
				const responseArticle = articleResponse.data.article;
				extractionStatus = articleResponse.data.extractionStatus;

				// If it's a video source, redirect directly to the video
				if (extractionStatus === 'video' || responseArticle?.isVideo) {
					window.location.href = url;
					return;
				}

				article = responseArticle;
				related = articleResponse.data.related || [];
			} else {
				error = 'Failed to load article';
			}

			if (newsResponse.success && newsResponse.data) {
				recentNews = newsResponse.data
					.filter((n: { url: string }) => n.url !== url)
					.slice(0, 5);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load article';
		} finally {
			loading = false;
		}
	}

	async function generateSummary() {
		if (!article?.content || summaryLoading) return;

		summaryLoading = true;
		showSummary = true;

		try {
			// Extract plain text from HTML content
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = article.content;
			const plainText = tempDiv.textContent || tempDiv.innerText || '';

			// Call AI summary endpoint (with URL for caching)
			const response = await fetch(`${API_BASE}/api/ai/summarize`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					text: plainText.slice(0, 8000),
					title: article.title,
					url: article.originalUrl
				})
			});

			if (response.ok) {
				const data = await response.json();
				aiSummary = data.data?.summary || 'Could not generate summary.';
			} else {
				aiSummary = 'Summary generation failed. Please try again.';
			}
		} catch {
			aiSummary = 'Summary generation failed. Please try again.';
		} finally {
			summaryLoading = false;
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function getArticleUrl(newsUrl: string, newsTicker?: string | null): string {
		const params = new URLSearchParams({ url: newsUrl });
		if (newsTicker) params.append('ticker', newsTicker);
		return `/news/article?${params.toString()}`;
	}

	$effect(() => {
		if (url) {
			loadArticle();
		}
	});
</script>

<svelte:head>
	<title>{article?.title || 'Loading Article'} - MarketMint</title>
</svelte:head>

<div class="article-page">
	{#if loading}
		<div class="loading-state">
			<div class="loading-skeleton">
				<div class="skeleton-title"></div>
				<div class="skeleton-meta"></div>
				<div class="skeleton-content"></div>
				<div class="skeleton-content"></div>
				<div class="skeleton-content short"></div>
			</div>
			<p class="loading-text">Extracting article content...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<h2>Unable to Load Article</h2>
			<p class="error-message">{error}</p>
			{#if url}
				<a href={url} target="_blank" rel="noopener noreferrer" class="external-link">
					Read on original site
				</a>
			{/if}
			<a href="/markets" class="back-link">Back to Markets</a>
		</div>
	{:else if article}
		<div class="article-layout">
			<!-- Main Article -->
			<article class="article-content">
				<header class="article-header">
					<div class="article-meta">
						{#if article.siteName}
							<span class="source">{article.siteName}</span>
						{/if}
						{#if article.readingTimeMinutes}
							<span class="reading-time">{article.readingTimeMinutes} min read</span>
						{/if}
						{#if ticker || article.ticker}
							<a href="/ticker/{ticker || article.ticker}" class="ticker-badge">${ticker || article.ticker}</a>
						{/if}
					</div>

					<h1 class="article-title">{article.title}</h1>

					{#if article.author || article.publishedDate}
						<div class="byline">
							{#if article.author}
								<span class="author">By {article.author}</span>
							{/if}
							{#if article.publishedDate}
								<time class="date">{formatDate(article.publishedDate)}</time>
							{/if}
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="article-actions">
						<button
							class="action-btn summary-btn"
							onclick={generateSummary}
							disabled={summaryLoading || !article.content}
						>
							{#if summaryLoading}
								Generating...
							{:else}
								AI Summary
							{/if}
						</button>
						<a
							href={article.originalUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="action-btn"
						>
							Original Source
						</a>
					</div>
				</header>

				<!-- AI Summary Panel -->
				{#if showSummary}
					<div class="summary-panel">
						<div class="summary-header">
							<h3>AI Summary</h3>
							<button class="close-btn" onclick={() => showSummary = false}>Close</button>
						</div>
						{#if summaryLoading}
							<div class="summary-loading">
								<div class="loading-dots">
									<span></span><span></span><span></span>
								</div>
								<p>Analyzing article...</p>
							</div>
						{:else if aiSummary}
							<div class="summary-content">
								<p>{aiSummary}</p>
							</div>
						{/if}
					</div>
				{/if}

				{#if extractionStatus === 'success' && article.content}
					<div class="article-body">
						{@html article.content}
					</div>
				{:else}
					<div class="fallback-content">
						{#if article.excerpt}
							<p class="excerpt">{article.excerpt}</p>
						{/if}

						<div class="extraction-notice">
							{#if extractionStatus === 'blocked'}
								<p>This article is behind a paywall and cannot be fully displayed.</p>
							{:else}
								<p>Full article content could not be extracted.</p>
							{/if}
							<a
								href={article.originalUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="read-original"
							>
								Read full article on {article.siteName || 'original site'}
							</a>
						</div>
					</div>
				{/if}
			</article>

			<!-- Sidebar -->
			<aside class="sidebar">
				<!-- Related Articles -->
				{#if related.length > 0}
					<section class="sidebar-section">
						<h2 class="sidebar-title">Related Articles</h2>
						<div class="article-list">
							{#each related as item (item.id)}
								<a href={getArticleUrl(item.url, item.ticker)} class="sidebar-card">
									<h3 class="card-title">{item.title}</h3>
									<div class="card-meta">
										{#if item.siteName}
											<span class="card-source">{item.siteName}</span>
										{/if}
										{#if item.readingTime}
											<span class="card-time">{item.readingTime} min</span>
										{/if}
									</div>
								</a>
							{/each}
						</div>
					</section>
				{/if}

				<!-- More News -->
				<section class="sidebar-section">
					<h2 class="sidebar-title">
						{related.length > 0 ? 'More News' : 'Latest News'}
					</h2>
					<div class="article-list">
						{#each recentNews as item (item.url)}
							<a href={getArticleUrl(item.url)} class="sidebar-card">
								<h3 class="card-title">{item.title}</h3>
								{#if item.source}
									<div class="card-meta">
										<span class="card-source">{item.source}</span>
									</div>
								{/if}
							</a>
						{/each}
					</div>
				</section>

				<!-- Back to Markets -->
				<a href="/markets" class="back-to-markets">
					Back to Markets
				</a>
			</aside>
		</div>
	{/if}
</div>

<style>
	.article-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem 1rem;
		font-family: var(--font-mono);
	}

	.loading-state {
		text-align: center;
		padding: 3rem 1rem;
	}

	.loading-skeleton {
		max-width: 700px;
		margin: 0 auto 2rem;
	}

	.skeleton-title {
		height: 2.5rem;
		background: var(--color-newsprint);
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.skeleton-meta {
		height: 1rem;
		width: 60%;
		background: var(--color-newsprint);
		border-radius: 4px;
		margin-bottom: 2rem;
	}

	.skeleton-content {
		height: 1rem;
		background: var(--color-newsprint);
		border-radius: 4px;
		margin-bottom: 0.75rem;
	}

	.skeleton-content.short {
		width: 80%;
	}

	.loading-text {
		color: var(--color-ink-muted);
		font-size: 0.875rem;
	}

	.error-state {
		text-align: center;
		padding: 3rem 1rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
	}

	.error-state h2 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
		color: var(--color-ink);
	}

	.error-message {
		color: var(--color-loss);
		margin-bottom: 1.5rem;
	}

	.external-link,
	.back-link {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: var(--color-ink);
		color: var(--color-paper);
		text-decoration: none;
		border-radius: 6px;
		margin: 0.5rem;
		font-size: 0.875rem;
	}

	.external-link:hover,
	.back-link:hover {
		background: var(--color-ink-light);
	}

	/* Layout */
	.article-layout {
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 1.5rem;
		align-items: start;
	}

	/* Main Article */
	.article-content {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		overflow: hidden;
	}

	.article-header {
		padding: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.article-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.source {
		font-weight: 600;
	}

	.reading-time {
		padding: 0.125rem 0.375rem;
		background: var(--color-newsprint);
		border-radius: 3px;
	}

	.ticker-badge {
		padding: 0.125rem 0.375rem;
		background: var(--color-ink);
		color: var(--color-paper);
		border-radius: 3px;
		text-decoration: none;
		font-weight: 700;
	}

	.ticker-badge:hover {
		background: var(--color-ink-light);
	}

	.article-title {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.3;
		color: var(--color-ink);
		margin: 0 0 0.75rem;
	}

	.byline {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin-bottom: 1rem;
	}

	.author {
		font-weight: 500;
	}

	/* Action Buttons */
	.article-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.action-btn {
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		font-family: inherit;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-paper);
		color: var(--color-ink);
		text-decoration: none;
		cursor: pointer;
		transition: all 0.15s;
	}

	.action-btn:hover:not(:disabled) {
		background: var(--color-newsprint);
		border-color: var(--color-ink-muted);
	}

	.action-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.summary-btn {
		background: var(--color-ink);
		color: var(--color-paper);
		border-color: var(--color-ink);
	}

	.summary-btn:hover:not(:disabled) {
		background: var(--color-ink-light);
	}

	/* AI Summary Panel */
	.summary-panel {
		margin: 0;
		padding: 1rem 1.5rem;
		background: var(--color-newsprint);
		border-bottom: 1px solid var(--color-border);
	}

	.summary-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.summary-header h3 {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
		color: var(--color-ink);
	}

	.close-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		font-family: inherit;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-ink-muted);
		cursor: pointer;
	}

	.close-btn:hover {
		background: var(--color-paper);
		color: var(--color-ink);
	}

	.summary-loading {
		text-align: center;
		padding: 1rem 0;
	}

	.loading-dots {
		display: flex;
		justify-content: center;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
	}

	.loading-dots span {
		width: 6px;
		height: 6px;
		background: var(--color-ink-muted);
		border-radius: 50%;
		animation: bounce 1.4s infinite ease-in-out both;
	}

	.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
	.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

	@keyframes bounce {
		0%, 80%, 100% { transform: scale(0); }
		40% { transform: scale(1); }
	}

	.summary-loading p {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin: 0;
	}

	.summary-content p {
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--color-ink);
		margin: 0;
	}

	/* Article Body */
	.article-body {
		padding: 1.5rem;
		line-height: 1.7;
		font-size: 0.9375rem;
		color: var(--color-ink);
	}

	.article-body :global(p) {
		margin-bottom: 1.25rem;
	}

	.article-body :global(h2),
	.article-body :global(h3) {
		margin: 1.5rem 0 0.75rem;
		font-weight: 700;
	}

	.article-body :global(h2) {
		font-size: 1.25rem;
	}

	.article-body :global(h3) {
		font-size: 1.125rem;
	}

	.article-body :global(a) {
		color: var(--color-ink);
		text-decoration: underline;
	}

	.article-body :global(blockquote) {
		border-left: 3px solid var(--color-border);
		padding-left: 1rem;
		margin: 1.25rem 0;
		font-style: italic;
		color: var(--color-ink-muted);
	}

	.article-body :global(ul),
	.article-body :global(ol) {
		margin: 1.25rem 0;
		padding-left: 1.5rem;
	}

	.article-body :global(li) {
		margin-bottom: 0.375rem;
	}

	.article-body :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 6px;
		margin: 1.25rem 0;
	}

	/* Table styling */
	.article-body :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.25rem 0;
		font-size: 0.8125rem;
	}

	.article-body :global(th),
	.article-body :global(td) {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		text-align: left;
	}

	.article-body :global(th) {
		background: var(--color-newsprint);
		font-weight: 600;
	}

	.article-body :global(tr:nth-child(even)) {
		background: var(--color-newsprint);
	}

	/* Fallback Content */
	.fallback-content {
		padding: 1.5rem;
	}

	.excerpt {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-ink);
		margin-bottom: 1.5rem;
	}

	.extraction-notice {
		padding: 1.25rem;
		background: var(--color-newsprint);
		border-radius: 8px;
		text-align: center;
	}

	.extraction-notice p {
		color: var(--color-ink-muted);
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	.read-original {
		display: inline-block;
		padding: 0.625rem 1.25rem;
		background: var(--color-ink);
		color: var(--color-paper);
		text-decoration: none;
		border-radius: 6px;
		font-size: 0.8125rem;
	}

	.read-original:hover {
		background: var(--color-ink-light);
	}

	/* Sidebar */
	.sidebar {
		position: sticky;
		top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.sidebar-section {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		overflow: hidden;
	}

	.sidebar-title {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink);
		margin: 0;
		padding: 0.75rem 1rem;
		background: var(--color-newsprint);
		border-bottom: 1px solid var(--color-border);
	}

	.article-list {
		display: flex;
		flex-direction: column;
	}

	.sidebar-card {
		display: block;
		padding: 0.875rem 1rem;
		text-decoration: none;
		border-bottom: 1px solid var(--color-border);
		transition: background-color 0.15s;
	}

	.sidebar-card:last-child {
		border-bottom: none;
	}

	.sidebar-card:hover {
		background: var(--color-newsprint);
	}

	.card-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ink);
		margin: 0 0 0.375rem;
		line-height: 1.35;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.625rem;
		color: var(--color-ink-muted);
	}

	.card-source {
		font-weight: 500;
		text-transform: uppercase;
	}

	.back-to-markets {
		display: block;
		padding: 0.75rem 1rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		text-align: center;
		text-decoration: none;
		font-size: 0.75rem;
		color: var(--color-ink);
		transition: all 0.15s;
	}

	.back-to-markets:hover {
		background: var(--color-ink);
		color: var(--color-paper);
		border-color: var(--color-ink);
	}

	/* Responsive */
	@media (max-width: 900px) {
		.article-layout {
			grid-template-columns: 1fr;
		}

		.sidebar {
			position: static;
		}

		.article-title {
			font-size: 1.25rem;
		}
	}
</style>
