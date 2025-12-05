<script lang="ts">
	import { formatCurrency, formatDate, getPriceClass } from '$lib/utils/formatters';
	import { auth } from '$lib/stores/auth.svelte';

	// Mock trading ideas
	const tradingIdeas = [
		{
			id: 1,
			ticker: 'NVDA',
			title: 'AI Momentum Play',
			sentiment: 'bullish',
			thesis: 'Strong demand for AI chips, data center growth continues...',
			entryPrice: 850.0,
			targetPrice: 1000.0,
			stopLoss: 780.0,
			currentPrice: 878.35,
			status: 'open',
			createdAt: '2024-01-15'
		},
		{
			id: 2,
			ticker: 'BA',
			title: 'Production Issues',
			sentiment: 'bearish',
			thesis: 'Quality control problems may impact deliveries...',
			entryPrice: 200.0,
			targetPrice: 160.0,
			stopLoss: 220.0,
			currentPrice: 187.23,
			status: 'open',
			createdAt: '2024-01-10'
		}
	];

	function getSentimentBadge(sentiment: string) {
		if (sentiment === 'bullish') return 'badge-gain';
		if (sentiment === 'bearish') return 'badge-loss';
		return '';
	}
</script>

<svelte:head>
	<title>Analysis - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">Trading Ideas & Analysis</h1>
		<p class="text-ink-muted mt-2">
			Track your trading ideas, set price targets, and monitor performance.
		</p>
	</section>

	{#if !auth.isAuthenticated}
		<section class="col-span-full">
			<div class="card">
				<p class="text-center py-8">
					<a href="/auth/login" class="underline font-semibold">Sign in</a> to create and track trading
					ideas.
				</p>
			</div>
		</section>
	{:else}
		<!-- New Idea Button -->
		<section class="col-span-full">
			<button class="btn btn-primary">+ New Trading Idea</button>
		</section>

		<!-- Trading Ideas -->
		<section class="col-span-full">
			<div class="space-y-4">
				{#each tradingIdeas as idea (idea.id)}
					<article class="card">
						<div class="flex justify-between items-start">
							<div>
								<div class="flex items-center gap-2">
									<a href="/ticker/{idea.ticker}" class="ticker-symbol">{idea.ticker}</a>
									<span class={['badge', getSentimentBadge(idea.sentiment)].join(' ')}>
										{idea.sentiment.toUpperCase()}
									</span>
								</div>
								<h3 class="font-semibold text-lg mt-1">{idea.title}</h3>
							</div>
							<div class="text-right">
								<div class="byline">{formatDate(idea.createdAt)}</div>
								<div class="text-sm mt-1">
									Status: <span class="font-semibold">{idea.status.toUpperCase()}</span>
								</div>
							</div>
						</div>

						<p class="text-ink-muted mt-4">{idea.thesis}</p>

						<div class="grid grid-cols-4 gap-4 mt-4">
							<div>
								<div class="byline">Entry</div>
								<div class="font-semibold">{formatCurrency(idea.entryPrice)}</div>
							</div>
							<div>
								<div class="byline">Target</div>
								<div class="font-semibold price-positive">{formatCurrency(idea.targetPrice)}</div>
							</div>
							<div>
								<div class="byline">Stop Loss</div>
								<div class="font-semibold price-negative">{formatCurrency(idea.stopLoss)}</div>
							</div>
							<div>
								<div class="byline">Current</div>
								<div class={['font-semibold', getPriceClass(idea.currentPrice - idea.entryPrice)].join(' ')}>
									{formatCurrency(idea.currentPrice)}
								</div>
							</div>
						</div>

						<div class="flex gap-2 mt-4">
							<button class="btn btn-small">Edit</button>
							<button class="btn btn-small">Close Position</button>
						</div>
					</article>
				{/each}
			</div>
		</section>
	{/if}
</div>
