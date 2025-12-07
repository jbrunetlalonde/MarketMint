<script lang="ts">
	import { api } from '$lib/utils/api';

	let email = $state('');
	let name = $state('');
	let subscribeStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let subscribeMessage = $state('');

	async function handleSubscribe(event: Event) {
		event.preventDefault();

		if (!email) return;

		subscribeStatus = 'loading';
		subscribeMessage = '';

		const result = await api.subscribeNewsletter(email, name || undefined);

		if (result.success) {
			subscribeStatus = 'success';
			subscribeMessage = 'Successfully subscribed to the newsletter!';
			email = '';
			name = '';
		} else {
			subscribeStatus = 'error';
			subscribeMessage = result.error?.message || 'Failed to subscribe. Please try again.';
		}
	}
</script>

<svelte:head>
	<title>Newsletter - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">Daily Market Newsletter</h1>
		<p class="text-ink-muted mt-2">
			Your daily digest of market news, economic indicators, and analysis delivered at 4:00 PM ET.
		</p>
	</section>

	<!-- Subscribe Section -->
	<section class="col-span-8">
		<div class="card card-elevated">
			<h2 class="headline headline-md">Subscribe</h2>
			<p class="mb-4">Get the newsletter delivered to your inbox every market day after market close.</p>

			{#if subscribeStatus === 'success'}
				<div class="border border-green-600 bg-green-50 p-4 rounded mb-4">
					<p class="text-green-800">{subscribeMessage}</p>
				</div>
			{/if}

			{#if subscribeStatus === 'error'}
				<div class="border border-red-600 bg-red-50 p-4 rounded mb-4">
					<p class="text-red-800">{subscribeMessage}</p>
				</div>
			{/if}

			<form class="space-y-4" onsubmit={handleSubscribe}>
				<div class="flex gap-4">
					<input
						type="text"
						placeholder="Name (optional)"
						class="input flex-1"
						bind:value={name}
					/>
					<input
						type="email"
						placeholder="Enter your email..."
						class="input flex-1"
						bind:value={email}
						required
					/>
				</div>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={subscribeStatus === 'loading'}
				>
					{subscribeStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
				</button>
			</form>
		</div>

		<!-- Newsletter Preview -->
		<div class="card mt-8">
			<h2 class="headline headline-lg">What You'll Receive</h2>
			<div class="mt-4 space-y-4">
				<div class="border-l-4 border-ink pl-4">
					<h3 class="font-semibold">Market Summary</h3>
					<p class="text-ink-muted text-sm">
						Daily performance of major indices (SPY, QQQ, DIA, IWM) with price changes.
					</p>
				</div>
				<div class="border-l-4 border-ink pl-4">
					<h3 class="font-semibold">Economic Indicators</h3>
					<p class="text-ink-muted text-sm">
						Key FRED data including Fed Funds Rate, Treasury yields, VIX, and unemployment.
					</p>
				</div>
				<div class="border-l-4 border-ink pl-4">
					<h3 class="font-semibold">Top Headlines</h3>
					<p class="text-ink-muted text-sm">
						Curated market news from Financial Modeling Prep stock news feed.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Sidebar -->
	<aside class="col-span-4">
		<div class="card">
			<h2 class="headline headline-md">Newsletter Details</h2>
			<ul class="space-y-3 mt-4 text-sm">
				<li class="flex gap-2">
					<span class="font-bold">Delivery:</span>
					<span>4:00 PM ET (weekdays)</span>
				</li>
				<li class="flex gap-2">
					<span class="font-bold">Format:</span>
					<span>HTML email</span>
				</li>
				<li class="flex gap-2">
					<span class="font-bold">Frequency:</span>
					<span>Daily (market days)</span>
				</li>
				<li class="flex gap-2">
					<span class="font-bold">Cost:</span>
					<span>Free</span>
				</li>
			</ul>
		</div>

		<div class="card mt-4">
			<h2 class="headline headline-md">Data Sources</h2>
			<ul class="space-y-2 mt-4 text-sm text-ink-muted">
				<li>Financial Modeling Prep API</li>
				<li>FRED (Federal Reserve)</li>
				<li>Yahoo Finance</li>
			</ul>
		</div>
	</aside>
</div>
