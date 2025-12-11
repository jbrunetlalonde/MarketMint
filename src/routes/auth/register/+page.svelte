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
			goto('/markets');
		} else {
			error = result.error || 'Registration failed';
		}

		isSubmitting = false;
	}
</script>

<svelte:head>
	<title>Register - MarketMint</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<h1 class="headline headline-lg text-center">Create Account</h1>

		{#if error}
			<div class="error-alert">
				{error}
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="auth-form">
			<div class="form-group">
				<label for="username" class="form-label">Username</label>
				<input
					type="text"
					id="username"
					bind:value={username}
					class="form-input"
					required
					minlength="3"
					maxlength="30"
					pattern="[a-zA-Z0-9_]+"
					autocomplete="username"
				/>
				<p class="form-hint">Letters, numbers, and underscores only</p>
			</div>

			<div class="form-group">
				<label for="email" class="form-label">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					class="form-input"
					required
					autocomplete="email"
				/>
			</div>

			<div class="form-group">
				<label for="password" class="form-label">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					class="form-input"
					required
					minlength="8"
					autocomplete="new-password"
				/>
				<p class="form-hint">Minimum 8 characters</p>
			</div>

			<div class="form-group">
				<label for="confirmPassword" class="form-label">Confirm Password</label>
				<input
					type="password"
					id="confirmPassword"
					bind:value={confirmPassword}
					class="form-input"
					required
					autocomplete="new-password"
				/>
			</div>

			<button type="submit" class="submit-btn" disabled={isSubmitting}>
				{isSubmitting ? 'Creating account...' : 'Create Account'}
			</button>
		</form>

		<hr class="divider" />

		<p class="auth-footer">
			Already have an account?
			<a href="/auth/login" class="auth-link">Sign In</a>
		</p>
	</div>
</div>

<style>
	.auth-container {
		max-width: 24rem;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	.auth-card {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1.5rem;
	}

	.error-alert {
		background: rgba(178, 34, 34, 0.08);
		border: 1px solid var(--color-loss);
		color: var(--color-loss);
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.form-label {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.form-input {
		width: 100%;
		padding: 0.625rem 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-ink);
		transition: border-color 0.15s ease;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-ink);
	}

	.form-hint {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		margin-top: 0.25rem;
	}

	.submit-btn {
		width: 100%;
		padding: 0.75rem 1rem;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		font-weight: 600;
		background: var(--color-ink);
		color: var(--color-paper);
		border: 1px solid var(--color-ink);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
		margin-top: 0.5rem;
	}

	.submit-btn:hover:not(:disabled) {
		background: var(--color-ink-muted);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.divider {
		margin: 1.5rem 0;
		border: none;
		border-top: 1px solid var(--color-border);
	}

	.auth-footer {
		text-align: center;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		color: var(--color-ink-muted);
	}

	.auth-link {
		color: var(--color-ink);
		font-weight: 600;
		text-decoration: underline;
	}

	.auth-link:hover {
		color: var(--color-ink-muted);
	}
</style>
