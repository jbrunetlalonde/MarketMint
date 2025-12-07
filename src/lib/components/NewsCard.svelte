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

<a href={url} target="_blank" rel="noopener noreferrer" class="news-card card block">
	{#if sentiment}
		<span class="badge">{sentiment}</span>
	{/if}
	<h3 class="font-semibold mt-2">{title}</h3>
	<p class="byline mt-2">
		{source || 'News'}
		{#if formatNewsTime(publishedAt)}
			&mdash; {formatNewsTime(publishedAt)}
		{/if}
	</p>
</a>

<style>
	.news-card {
		text-decoration: none;
		color: inherit;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
		cursor: pointer;
	}

	.news-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.news-card h3 {
		transition: color 0.15s ease;
	}

	.news-card:hover h3 {
		color: var(--color-neutral);
	}
</style>
