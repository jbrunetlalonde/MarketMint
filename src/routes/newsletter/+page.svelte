<script lang="ts">
	import { formatDate } from '$lib/utils/formatters';

	// Mock newsletter archive
	const newsletters = [
		{
			id: 1,
			title: 'Markets Rally on Fed Comments',
			date: '2024-01-30',
			summary: 'Tech stocks lead gains as Federal Reserve signals potential rate cuts...'
		},
		{
			id: 2,
			title: 'Earnings Season Wrap-Up',
			date: '2024-01-29',
			summary: 'Q4 earnings beat expectations across most sectors...'
		},
		{
			id: 3,
			title: 'Energy Sector in Focus',
			date: '2024-01-28',
			summary: 'Oil prices surge amid Middle East tensions...'
		}
	];
</script>

<svelte:head>
	<title>Newsletter - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">Daily Market Newsletter</h1>
		<p class="text-ink-muted mt-2">
			Your daily digest of market news, trending stocks, and analysis.
		</p>
	</section>

	<!-- Subscribe Section -->
	<section class="col-span-8">
		<div class="card card-elevated">
			<h2 class="headline headline-md">Subscribe</h2>
			<p class="mb-4">Get the newsletter delivered to your inbox every market day at 4:00 PM ET.</p>
			<form class="flex gap-4" onsubmit={(e) => e.preventDefault()}>
				<input type="email" placeholder="Enter your email..." class="input flex-1" />
				<button type="submit" class="btn btn-primary">Subscribe</button>
			</form>
		</div>

		<!-- Newsletter Archive -->
		<h2 class="headline headline-lg mt-8">Archive</h2>
		<div class="space-y-4">
			{#each newsletters as newsletter (newsletter.id)}
				<article class="card">
					<p class="byline">{formatDate(newsletter.date)}</p>
					<h3 class="font-semibold text-lg mt-1">{newsletter.title}</h3>
					<p class="text-ink-muted mt-2">{newsletter.summary}</p>
					<a href="/newsletter/{newsletter.id}" class="btn btn-small mt-4">Read More</a>
				</article>
			{/each}
		</div>
	</section>

	<!-- Sidebar -->
	<aside class="col-span-4">
		<div class="card">
			<h2 class="headline headline-md">What's Included</h2>
			<ul class="space-y-2 mt-4">
				<li class="flex gap-2">
					<span>📈</span>
					<span>Trending Stocks</span>
				</li>
				<li class="flex gap-2">
					<span>📰</span>
					<span>Market News Summary</span>
				</li>
				<li class="flex gap-2">
					<span>💰</span>
					<span>Economic Calendar</span>
				</li>
				<li class="flex gap-2">
					<span>🏛️</span>
					<span>Congress Trading Activity</span>
				</li>
				<li class="flex gap-2">
					<span>📊</span>
					<span>Featured Charts</span>
				</li>
			</ul>
		</div>
	</aside>
</div>
