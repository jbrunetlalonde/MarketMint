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
		padding: 1rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
	}

	.price-card:hover {
		background: var(--color-newsprint);
		border-color: var(--color-ink-muted);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		transform: translateY(-2px);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.ticker-symbol {
		font-family: var(--font-mono);
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.company-name {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 8rem;
		margin-top: 0.125rem;
	}

	.badge {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		white-space: nowrap;
	}

	.badge.price-positive {
		background: rgba(34, 139, 34, 0.12);
		color: var(--color-gain);
	}

	.badge.price-negative {
		background: rgba(178, 34, 34, 0.12);
		color: var(--color-loss);
	}

	.badge.price-neutral {
		background: var(--color-newsprint);
		color: var(--color-ink-muted);
	}

	.card-body {
		margin-top: 0.75rem;
	}

	.price {
		font-family: var(--font-mono);
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--color-ink);
		letter-spacing: -0.02em;
	}

	.change {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}

	.volume {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px dotted var(--color-border);
	}

	.compact {
		padding: 0.75rem;
	}

	.compact .ticker-symbol {
		font-size: 0.875rem;
	}

	.compact .price {
		font-size: 1.125rem;
	}

	.compact .badge {
		font-size: 0.625rem;
		padding: 0.1875rem 0.375rem;
	}

	/* Mobile adjustments */
	@media (max-width: 640px) {
		.price-card {
			padding: 0.875rem;
		}

		.ticker-symbol {
			font-size: 0.9375rem;
		}

		.price {
			font-size: 1.25rem;
		}

		.badge {
			font-size: 0.625rem;
			padding: 0.1875rem 0.375rem;
		}
	}
</style>
