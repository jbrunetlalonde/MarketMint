<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';

	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			return;
		}

		isSubmitting = true;

		const result = await auth.register(username, email, password);

		if (result.success) {
			goto('/');
		} else {
			error = result.error || 'Registration failed';
		}

		isSubmitting = false;
	}
</script>

<svelte:head>
	<title>Register - MarketMint</title>
</svelte:head>

<div class="max-w-md mx-auto mt-8 px-4">
	<div class="card card-elevated">
		<h1 class="headline headline-lg text-center">Create Account</h1>

		{#if error}
			<div class="bg-loss-light border border-loss text-loss px-4 py-2 mb-4">
				{error}
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<label for="username" class="byline block mb-1">Username</label>
				<input
					type="text"
					id="username"
					bind:value={username}
					class="input"
					required
					minlength="3"
					maxlength="30"
					pattern="[a-zA-Z0-9_]+"
					autocomplete="username"
				/>
				<p class="text-xs text-ink-muted mt-1">Letters, numbers, and underscores only</p>
			</div>

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
					minlength="8"
					autocomplete="new-password"
				/>
				<p class="text-xs text-ink-muted mt-1">Minimum 8 characters</p>
			</div>

			<div>
				<label for="confirmPassword" class="byline block mb-1">Confirm Password</label>
				<input
					type="password"
					id="confirmPassword"
					bind:value={confirmPassword}
					class="input"
					required
					autocomplete="new-password"
				/>
			</div>

			<button type="submit" class="btn btn-primary w-full" disabled={isSubmitting}>
				{isSubmitting ? 'Creating account...' : 'Create Account'}
			</button>
		</form>

		<hr class="divider" />

		<p class="text-center text-sm">
			Already have an account?
			<a href="/auth/login" class="underline font-semibold">Sign In</a>
		</p>
	</div>
</div>
