<script lang="ts">
	import { formatDate } from '$lib/utils/formatters';
<<<<<<< HEAD
	import { getPortraitUrl, getCongressPortraitUrl, getAvatarFallback } from '$lib/utils/urls';
	import { getPartyAbbrev, getPartyClass, getInitials } from '$lib/utils/political';
=======
	import { getPortraitUrl, getCongressPortraitUrl, getAvatarFallback, getCompanyLogoUrl } from '$lib/utils/urls';
	import { getPartyAbbrev, getInitials } from '$lib/utils/political';
>>>>>>> feature/stocktaper-parity

	interface Trade {
		id: number;
		officialName: string;
		ticker: string;
		assetDescription?: string | null;
		transactionType: string;
		transactionDate: string;
		reportedDate: string;
		amountDisplay: string;
		party?: string | null;
		title?: string | null;
		state?: string | null;
		portraitUrl?: string | null;
		chamber?: string | null;
	}

	let { trade }: { trade: Trade } = $props();

	function getLocalPortraitUrl(name: string, title?: string | null): string {
		const chamber = title?.toLowerCase().includes('senator') ? 'senate' : 'house';
		return getCongressPortraitUrl(name, chamber);
	}

	function getCompanyName(description?: string | null): string {
		if (!description) return '';
		const parts = description.split(' - ');
		return parts[0] || description;
	}

	const localPortrait = trade.portraitUrl
		? getPortraitUrl(trade.portraitUrl)
		: getLocalPortraitUrl(trade.officialName, trade.title);
	let portraitError = $state(false);

<<<<<<< HEAD
	const fallbackAvatar = $derived(getAvatarFallback(trade.officialName));
</script>

<article class="card p-4 flex gap-4">
	<!-- Portrait -->
	<div class="flex-shrink-0">
		{#if !portraitError}
			<img
				src={localPortrait}
				alt={trade.officialName}
				class="w-16 h-20 object-contain border border-ink-light bg-newsprint"
				loading="lazy"
				decoding="async"
				onerror={() => portraitError = true}
			/>
		{:else}
			<img
				src={fallbackAvatar}
				alt={trade.officialName}
				class="w-16 h-20 object-cover border border-ink-light bg-newsprint"
				loading="lazy"
				decoding="async"
			/>
		{/if}
=======
	const partyAbbrev = getPartyAbbrev(trade.party);
	const isRepublican = trade.party?.toLowerCase().includes('republican');
	const isDemocrat = trade.party?.toLowerCase().includes('democrat');
	const companyName = getCompanyName(trade.assetDescription);
</script>

<article class="trade-card">
	<!-- Header Row: Politician Info + Transaction Type -->
	<div class="card-header">
		<div class="politician-info">
			<div class="portrait-wrapper">
				{#if !portraitError}
					<img
						src={localPortrait}
						alt={trade.officialName}
						class="portrait"
						loading="lazy"
						decoding="async"
						onerror={() => (portraitError = true)}
					/>
				{:else}
					<div class="portrait-fallback">
						{getInitials(trade.officialName)}
					</div>
				{/if}
			</div>
			<div class="politician-details">
				<a href="/political/member/{encodeURIComponent(trade.officialName)}" class="politician-name">
					{trade.officialName}
				</a>
				<div class="politician-meta">
					<span class="party-badge" class:republican={isRepublican} class:democrat={isDemocrat}>
						{partyAbbrev}
					</span>
					{#if trade.state}
						<span class="state">{trade.state}</span>
					{/if}
				</div>
			</div>
		</div>
		<div class="transaction-info">
			<span class="transaction-badge" class:buy={trade.transactionType === 'BUY'} class:sell={trade.transactionType === 'SELL'}>
				{trade.transactionType === 'BUY' ? 'Purchase' : trade.transactionType === 'SELL' ? 'Sale' : trade.transactionType}
			</span>
			<span class="amount">{trade.amountDisplay}</span>
		</div>
>>>>>>> feature/stocktaper-parity
	</div>

	<!-- Stock Row: Ticker + Dates -->
	<div class="card-body">
		<a href="/ticker/{trade.ticker}" class="stock-info">
			<img
				src={getCompanyLogoUrl(trade.ticker)}
				alt=""
				class="stock-logo"
				loading="lazy"
				onerror={(e) => {
					(e.currentTarget as HTMLImageElement).style.display = 'none';
				}}
			/>
			<div class="stock-details">
				<span class="ticker">{trade.ticker}</span>
				{#if companyName}
					<span class="company-name">{companyName}</span>
				{/if}
			</div>
		</a>
		<div class="date-info">
			<span class="transaction-date">
				{trade.transactionDate ? formatDate(trade.transactionDate) : '-'}
			</span>
			{#if trade.reportedDate}
				<span class="reported-date">
					reported {formatDate(trade.reportedDate)}
				</span>
			{/if}
		</div>
	</div>
</article>

<style>
	.trade-card {
		background: var(--color-paper);
		border-bottom: 1px dashed var(--color-border);
		padding: 1rem 1.25rem;
	}

	.trade-card:first-child {
		border-top: 1px dashed var(--color-border);
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.politician-info {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		min-width: 0;
	}

	.portrait-wrapper {
		flex-shrink: 0;
	}

	.portrait {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		object-fit: cover;
		object-position: top;
		background: var(--color-newsprint);
		border: 2px solid var(--color-border);
	}

	.portrait-fallback {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--color-newsprint-dark);
		border: 2px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-ink-muted);
	}

	.politician-details {
		min-width: 0;
	}

	.politician-name {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-ink);
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	.politician-name:hover {
		text-decoration: underline;
	}

	.politician-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.party-badge {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 0.125rem 0.5rem;
		border-radius: 3px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
	}

	.party-badge.republican {
		background: #fee2e2;
		color: #b91c1c;
	}

	.party-badge.democrat {
		background: #dbeafe;
		color: #1d4ed8;
	}

	:global([data-theme='dark']) .party-badge.republican {
		background: #450a0a;
		color: #fca5a5;
	}

	:global([data-theme='dark']) .party-badge.democrat {
		background: #1e3a5f;
		color: #93c5fd;
	}

	.state {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
	}

	.transaction-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.transaction-badge {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		background: var(--color-newsprint-dark);
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	.transaction-badge.buy {
		background: #d1fae5;
		color: #047857;
	}

	.transaction-badge.sell {
		background: #fee2e2;
		color: #b91c1c;
	}

	:global([data-theme='dark']) .transaction-badge.buy {
		background: #064e3b;
		color: #6ee7b7;
	}

	:global([data-theme='dark']) .transaction-badge.sell {
		background: #450a0a;
		color: #fca5a5;
	}

	.amount {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.card-body {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-left: calc(48px + 0.875rem);
	}

	.stock-info {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		text-decoration: none;
		color: inherit;
		min-width: 0;
	}

	.stock-info:hover .ticker {
		text-decoration: underline;
	}

	.stock-logo {
		width: 24px;
		height: 24px;
		object-fit: contain;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.stock-details {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.ticker {
		font-family: var(--font-mono);
		font-size: 0.875rem;
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
		max-width: 180px;
	}

	.date-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.125rem;
		flex-shrink: 0;
	}

	.transaction-date {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		color: var(--color-ink);
	}

	.reported-date {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--color-ink-muted);
	}

	@media (max-width: 540px) {
		.card-header {
			flex-direction: column;
			gap: 0.75rem;
		}

		.transaction-info {
			flex-direction: row;
			align-items: center;
			width: 100%;
			justify-content: space-between;
		}

		.card-body {
			padding-left: 0;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.date-info {
			align-items: flex-start;
			flex-direction: row;
			gap: 0.75rem;
		}

		.politician-name {
			max-width: 180px;
		}
	}
</style>
