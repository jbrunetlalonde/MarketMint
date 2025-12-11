<script lang="ts">
	import { formatCurrency, formatPercent, formatCompact, getPriceClass } from '$lib/utils/formatters';

	interface Props {
		ticker: string;
		name?: string;
		price: number | null;
		change: number | null;
		changePercent: number | null;
		volume?: number | null;
		marketCap?: number | null;
		showVolume?: boolean;
		compact?: boolean;
		href?: string;
	}

	let {
		ticker,
		name,
		price,
		change,
		changePercent,
		volume,
		marketCap,
		showVolume = false,
		compact = false,
		href
	}: Props = $props();

	const priceClass = $derived(getPriceClass(changePercent ?? 0));
</script>

{#if href}
	<a {href} class="price-card" class:compact>
		<div class="card-header">
			<div>
				<span class="ticker-symbol">{ticker}</span>
				{#if name && !compact}
					<div class="company-name">{name}</div>
				{/if}
			</div>
			{#if changePercent !== null}
				<span class="badge {priceClass}">
					{formatPercent(changePercent)}
				</span>
			{/if}
		</div>

		<div class="card-body">
			<div class="price">
				{price !== null ? formatCurrency(price) : '--'}
			</div>
			{#if change !== null && !compact}
				<div class="change {priceClass}">
					{change >= 0 ? '+' : ''}{formatCurrency(change, 'USD', 2)}
				</div>
			{/if}
		</div>

		{#if showVolume && volume}
			<div class="volume">
				Vol: {formatCompact(volume)}
			</div>
		{/if}
	</a>
{:else}
	<div class="price-card" class:compact>
		<div class="card-header">
			<div>
				<span class="ticker-symbol">{ticker}</span>
				{#if name && !compact}
					<div class="company-name">{name}</div>
				{/if}
			</div>
			{#if changePercent !== null}
				<span class="badge {priceClass}">
					{formatPercent(changePercent)}
				</span>
			{/if}
		</div>

		<div class="card-body">
			<div class="price">
				{price !== null ? formatCurrency(price) : '--'}
			</div>
			{#if change !== null && !compact}
				<div class="change {priceClass}">
					{change >= 0 ? '+' : ''}{formatCurrency(change, 'USD', 2)}
				</div>
			{/if}
		</div>

		{#if showVolume && volume}
			<div class="volume">
				Vol: {formatCompact(volume)}
			</div>
		{/if}
	</div>
{/if}

<style>
	.price-card {
		display: block;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		text-decoration: none;
		color: inherit;
		transition: background 0.15s ease;
	}

	.price-card:hover {
		background: var(--color-newsprint);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.ticker-symbol {
		font-family: var(--font-mono);
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.company-name {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 8rem;
	}

	.card-body {
		margin-top: 0.5rem;
	}

	.price {
		font-family: var(--font-mono);
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.change {
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.volume {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin-top: 0.5rem;
	}

	.compact {
		padding: 0.5rem;
	}

	.compact .ticker-symbol {
		font-size: 0.875rem;
	}

	.compact .price {
		font-size: 1rem;
	}
</style>
