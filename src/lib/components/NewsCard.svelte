<script lang="ts">
	interface Props {
		title: string;
		source: string | null;
		publishedAt: string;
		url: string;
		sentiment?: string | null;
		ticker?: string | null;
		useInternalReader?: boolean;
	}

	let { title, source, publishedAt, url, sentiment, ticker, useInternalReader = true }: Props = $props();

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

	const isVideo = $derived(VIDEO_PATTERNS.some((pattern) => pattern.test(url)));

	function formatNewsTime(dateStr: string): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return '';

		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

		if (diffHours < 1) return 'Just now';
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffHours < 48) return 'Yesterday';
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getReaderUrl(): string {
		const params = new URLSearchParams({ url });
		if (ticker) params.append('ticker', ticker);
		if (title) params.append('title', title);
		return `/news/article?${params.toString()}`;
	}

	// Videos always open externally
	const href = $derived(isVideo ? url : (useInternalReader ? getReaderUrl() : url));
	const isExternal = $derived(isVideo || !useInternalReader);
</script>

<a
	{href}
	target={isExternal ? '_blank' : undefined}
	rel={isExternal ? 'noopener noreferrer' : undefined}
	class="news-card"
>
	<div class="badge-row">
		{#if isVideo}
			<span class="badge video-badge">VIDEO</span>
		{/if}
		{#if sentiment}
			<span class="badge">{sentiment}</span>
		{/if}
	</div>
	<h3 class="news-title">{title}</h3>
	<p class="byline">
		{source || 'News'}
		{#if formatNewsTime(publishedAt)}
			&mdash; {formatNewsTime(publishedAt)}
		{/if}
	</p>
</a>

<style>
	.news-card {
		display: block;
		text-decoration: none;
		color: inherit;
		padding: 0.75rem 0;
		border-bottom: 1px dotted var(--color-border);
		transition: background 0.15s ease;
	}

	.news-card:hover {
		background: var(--color-newsprint);
	}

	.news-title {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.4;
		margin: 0.5rem 0;
		color: var(--color-ink);
	}

	.news-card:hover .news-title {
		color: var(--color-neutral);
	}

	.byline {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin: 0;
	}

	.badge-row {
		display: flex;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.badge-row:empty {
		display: none;
	}

	.video-badge {
		background: var(--color-ink);
		color: var(--color-paper);
	}
</style>
