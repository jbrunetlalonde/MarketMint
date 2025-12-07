<script lang="ts">
	interface Props {
		title: string;
		description?: string;
		compact?: boolean;
	}

	let { title, description, compact = false }: Props = $props();
</script>

<div class="empty-state" class:compact>
	<p class="empty-title">{title}</p>
	{#if description}
		<p class="empty-description">{description}</p>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		text-align: center;
		min-height: 120px;
	}

	.empty-state.compact {
		padding: 1.5rem 1rem;
		min-height: 80px;
	}

	.empty-title {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8125rem;
		color: var(--color-ink-muted);
		margin: 0;
		font-weight: 500;
	}

	.empty-description {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		margin: 0.5rem 0 0 0;
		max-width: 280px;
		line-height: 1.5;
		opacity: 0.8;
	}
</style>
