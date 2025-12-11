<script lang="ts">
	interface Props {
		title: string;
		source: string | null;
		publishedAt: string;
		url: string;
		sentiment?: string | null;
	}

	let { title, source, publishedAt, url, sentiment }: Props = $props();

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
</script>

<a href={url} target="_blank" rel="noopener noreferrer" class="news-card">
	{#if sentiment}
		<span class="badge">{sentiment}</span>
	{/if}
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
</style>
