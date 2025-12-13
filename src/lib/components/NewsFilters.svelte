<script lang="ts">
	type SentimentFilter = 'all' | 'bullish' | 'bearish' | 'neutral';

	interface Props {
		sentiment: SentimentFilter;
		sources: string[];
		selectedSources: string[];
		onSentimentChange: (sentiment: SentimentFilter) => void;
		onSourcesChange: (sources: string[]) => void;
		showSentiment?: boolean;
	}

	let {
		sentiment,
		sources,
		selectedSources,
		onSentimentChange,
		onSourcesChange,
		showSentiment = true
	}: Props = $props();

	const sentimentOptions: { value: SentimentFilter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'bullish', label: 'Bullish' },
		{ value: 'bearish', label: 'Bearish' },
		{ value: 'neutral', label: 'Neutral' }
	];

	function toggleSource(source: string) {
		if (selectedSources.includes(source)) {
			onSourcesChange(selectedSources.filter((s) => s !== source));
		} else {
			onSourcesChange([...selectedSources, source]);
		}
	}

	function clearAllFilters() {
		onSourcesChange([]);
		if (showSentiment) {
			onSentimentChange('all');
		}
	}

	const hasActiveFilters = $derived(
		(showSentiment && sentiment !== 'all') || selectedSources.length > 0
	);
</script>

<div class="news-filters">
	{#if showSentiment}
		<div class="filter-group">
			<span class="filter-label">Sentiment</span>
			<div class="filter-pills">
				{#each sentimentOptions as option (option.value)}
					<button
						type="button"
						class="filter-pill"
						class:active={sentiment === option.value}
						onclick={() => onSentimentChange(option.value)}
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if sources.length > 0}
		<div class="filter-group">
			<span class="filter-label">Sources</span>
			<div class="filter-pills sources">
				{#each sources.slice(0, 6) as source (source)}
					<button
						type="button"
						class="filter-pill source-pill"
						class:active={selectedSources.includes(source)}
						onclick={() => toggleSource(source)}
					>
						{source}
					</button>
				{/each}
				{#if sources.length > 6}
					<span class="more-sources">+{sources.length - 6}</span>
				{/if}
			</div>
		</div>
	{/if}

	{#if hasActiveFilters}
		<button type="button" class="clear-filters" onclick={clearAllFilters}>
			Clear filters
		</button>
	{/if}
</div>

<style>
	.news-filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: var(--color-paper);
		border-bottom: 1px solid var(--color-border);
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		padding-right: 0.25rem;
	}

	.filter-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.filter-pill {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.625rem;
		font-weight: 500;
		padding: 0.375rem 0.625rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-paper);
		color: var(--color-ink-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.filter-pill:hover {
		border-color: var(--color-ink-light);
		color: var(--color-ink);
		background: var(--color-newsprint);
	}

	.filter-pill.active {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: var(--color-paper);
	}

	.filter-pill.active:hover {
		background: var(--color-accent);
		filter: brightness(1.1);
	}

	.source-pill {
		max-width: 120px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.more-sources {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 600;
		color: var(--color-ink-muted);
		padding: 0.375rem 0.5rem;
		background: var(--color-newsprint);
		border-radius: 4px;
	}

	.clear-filters {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.5625rem;
		font-weight: 600;
		padding: 0.375rem 0.625rem;
		border: none;
		border-radius: 4px;
		background: var(--color-newsprint);
		color: var(--color-ink-muted);
		cursor: pointer;
		transition: all 0.2s ease;
		margin-left: auto;
	}

	.clear-filters:hover {
		background: var(--color-newsprint-dark);
		color: var(--color-ink);
	}

	@media (max-width: 640px) {
		.news-filters {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
			padding: 0.875rem 1rem;
		}

		.filter-group {
			flex-wrap: wrap;
			width: 100%;
		}

		.filter-pills {
			flex: 1;
		}

		.sources {
			max-width: 100%;
		}

		.clear-filters {
			margin-left: 0;
			width: 100%;
			text-align: center;
		}
	}
</style>
