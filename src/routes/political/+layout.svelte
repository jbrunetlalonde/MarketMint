<script lang="ts">
	let { children } = $props();
</script>

<div class="political-layout">
	{@render children()}
</div>

<style>
	.political-layout {
		width: 100%;
	}
</style>
