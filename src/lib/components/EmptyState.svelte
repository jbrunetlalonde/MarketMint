<script lang="ts">
	interface Props {
		title: string;
		description?: string;
		compact?: boolean;
		icon?: 'chart' | 'data' | 'search' | 'calendar' | 'user' | 'none';
	}

	let { title, description, compact = false, icon = 'data' }: Props = $props();

	const icons: Record<string, string> = {
		chart: 'M3 3v18h18',
		data: 'M4 6h16M4 12h16M4 18h16',
		search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
		calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
		user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
	};
</script>

<div class="empty-state" class:compact>
	{#if icon !== 'none' && icons[icon]}
		<svg
			class="empty-icon"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="1.5"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d={icons[icon]} />
		</svg>
	{/if}
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

	.empty-icon {
		width: 2rem;
		height: 2rem;
		color: var(--color-ink-muted);
		opacity: 0.5;
		margin-bottom: 0.75rem;
	}

	.empty-state.compact .empty-icon {
		width: 1.5rem;
		height: 1.5rem;
		margin-bottom: 0.5rem;
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
