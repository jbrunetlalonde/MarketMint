<script lang="ts">
	import SearchAutocomplete from '$lib/components/SearchAutocomplete.svelte';
</script>

<svelte:head>
	<title>MarketMint - Look up a stock. Actually get it.</title>
</svelte:head>

<div class="landing-page">
	<div class="landing-content">
		<div class="landing-left">
			<h1 class="landing-headline">
				Look up a stock.<br />Actually get it.
			</h1>

			<p class="landing-description">
				<strong>MarketMint</strong> offers a fundamentals-first look at any
				stock, arranged so the story is easy to read, even
				if you don't speak Wall Street.
			</p>

			<div class="landing-search">
				<SearchAutocomplete placeholder="Search for stocks across all exchanges..." />
			</div>
		</div>

		<div class="landing-right">
			<img
				src="/favicon.png"
				alt="MarketMint Bull"
				class="landing-illustration"
			/>
		</div>
	</div>
</div>

<style>
	.landing-page {
		min-height: calc(100vh - 200px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.landing-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
		max-width: 1200px;
		width: 100%;
		align-items: center;
	}

	.landing-left {
		max-width: 500px;
	}

	.landing-headline {
		font-family: var(--font-mono);
		font-size: 3rem;
		font-weight: 700;
		line-height: 1.1;
		color: var(--color-ink);
		margin-bottom: 1.5rem;
	}

	.landing-description {
		font-size: 1.125rem;
		line-height: 1.7;
		color: var(--color-ink-light);
		margin-bottom: 2.5rem;
	}

	.landing-description strong {
		color: var(--color-ink);
	}

	.landing-search {
		width: 100%;
	}

	.landing-right {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.landing-illustration {
		max-width: 100%;
		height: auto;
		max-height: 500px;
		object-fit: contain;
	}

	@media (max-width: 900px) {
		.landing-content {
			grid-template-columns: 1fr;
			gap: 2rem;
			text-align: center;
		}

		.landing-left {
			max-width: 100%;
			order: 1;
		}

		.landing-right {
			order: 0;
		}

		.landing-headline {
			font-size: 2rem;
		}

		.landing-illustration {
			max-height: 300px;
		}
	}
</style>
