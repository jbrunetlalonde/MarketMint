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
	<a {href} class="card block hover:bg-paper-secondary transition-colors" class:compact>
		<div class="flex justify-between items-start">
			<div>
				<span class="ticker-symbol">{ticker}</span>
				{#if name && !compact}
					<div class="text-xs text-ink-muted truncate max-w-32">{name}</div>
				{/if}
			</div>
			{#if changePercent !== null}
				<span class="badge {priceClass}">
					{formatPercent(changePercent)}
				</span>
			{/if}
		</div>

		<div class="mt-2">
			<div class="text-xl font-semibold">
				{price !== null ? formatCurrency(price) : '--'}
			</div>
			{#if change !== null && !compact}
				<div class={priceClass}>
					{change >= 0 ? '+' : ''}{formatCurrency(change, 'USD', 2)}
				</div>
			{/if}
		</div>

		{#if showVolume && volume}
			<div class="mt-2 text-xs text-ink-muted">
				Vol: {formatCompact(volume)}
			</div>
		{/if}
	</a>
{:else}
	<div class="card" class:compact>
		<div class="flex justify-between items-start">
			<div>
				<span class="ticker-symbol">{ticker}</span>
				{#if name && !compact}
					<div class="text-xs text-ink-muted truncate max-w-32">{name}</div>
				{/if}
			</div>
			{#if changePercent !== null}
				<span class="badge {priceClass}">
					{formatPercent(changePercent)}
				</span>
			{/if}
		</div>

		<div class="mt-2">
			<div class="text-xl font-semibold">
				{price !== null ? formatCurrency(price) : '--'}
			</div>
			{#if change !== null && !compact}
				<div class={priceClass}>
					{change >= 0 ? '+' : ''}{formatCurrency(change, 'USD', 2)}
				</div>
			{/if}
		</div>

		{#if showVolume && volume}
			<div class="mt-2 text-xs text-ink-muted">
				Vol: {formatCompact(volume)}
			</div>
		{/if}
	</div>
{/if}

<style>
	.compact {
		padding: 0.75rem;
	}

	.compact .ticker-symbol {
		font-size: 0.875rem;
	}

	.compact .text-xl {
		font-size: 1rem;
	}
</style>
