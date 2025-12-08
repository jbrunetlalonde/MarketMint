<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/political/members', { replaceState: true });
	});
</script>

<div class="loading-redirect">
	<p>Redirecting to Politicians List...</p>
</div>

<style>
	.loading-redirect {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 200px;
		font-family: 'IBM Plex Mono', monospace;
		color: #666;
	}
</style>
