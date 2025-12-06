<script lang="ts">
	interface Props {
		message: string;
		onRetry?: () => void;
		retrying?: boolean;
	}

	let { message, onRetry, retrying = false }: Props = $props();
</script>

<div class="card error-card">
	<div class="error-content">
		<svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="10"></circle>
			<line x1="12" y1="8" x2="12" y2="12"></line>
			<line x1="12" y1="16" x2="12.01" y2="16"></line>
		</svg>
		<p class="error-message">{message}</p>
	</div>
	{#if onRetry}
		<button
			onclick={onRetry}
			disabled={retrying}
			class="btn btn-primary retry-btn"
		>
			{#if retrying}
				<span class="animate-spin inline-block mr-2">&#x21BB;</span>
				Retrying...
			{:else}
				Try Again
			{/if}
		</button>
	{/if}
</div>

<style>
	.error-card {
		text-align: center;
		padding: 2rem;
	}

	.error-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.error-icon {
		width: 2.5rem;
		height: 2.5rem;
		color: #dc2626;
	}

	.error-message {
		color: #dc2626;
		font-weight: 500;
	}

	.retry-btn {
		margin-top: 1rem;
	}
</style>
