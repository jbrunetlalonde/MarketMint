<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		isSubmitting = true;

		const result = await auth.login(email, password);

		if (result.success) {
			goto('/markets');
		} else {
			error = result.error || 'Login failed';
		}

		isSubmitting = false;
	}
</script>

<svelte:head>
	<title>Login - MarketMint</title>
</svelte:head>

<div class="max-w-md mx-auto mt-8 px-4">
	<div class="card card-elevated">
		<h1 class="headline headline-lg text-center">Sign In</h1>

		{#if error}
			<div class="bg-loss-light border border-loss text-loss px-4 py-2 mb-4">
				{error}
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<label for="email" class="byline block mb-1">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					class="input"
					required
					autocomplete="email"
				/>
			</div>

			<div>
				<label for="password" class="byline block mb-1">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					class="input"
					required
					autocomplete="current-password"
				/>
			</div>

			<button type="submit" class="btn btn-primary w-full" disabled={isSubmitting}>
				{isSubmitting ? 'Signing in...' : 'Sign In'}
			</button>
		</form>

		<hr class="divider" />

		<p class="text-center text-sm">
			Don't have an account?
			<a href="/auth/register" class="underline font-semibold">Register</a>
		</p>
	</div>
</div>
