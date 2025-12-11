<script lang="ts">
	import { formatDate } from '$lib/utils/formatters';
	import { getPortraitUrl, getCongressPortraitUrl, getAvatarFallback } from '$lib/utils/urls';
	import { getPartyAbbrev, getPartyClass, getInitials } from '$lib/utils/political';

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

	function getReportingGapDays(): number | null {
		if (!trade.transactionDate || !trade.reportedDate) return null;
		const tx = new Date(trade.transactionDate);
		const rpt = new Date(trade.reportedDate);
		const diffTime = rpt.getTime() - tx.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	function getLocalPortraitUrl(name: string, title?: string | null): string {
		const chamber = title?.toLowerCase().includes('senator') ? 'senate' : 'house';
		return getCongressPortraitUrl(name, chamber);
	}

	const reportingGap = getReportingGapDays();
	const localPortrait = trade.portraitUrl
		? getPortraitUrl(trade.portraitUrl)
		: getLocalPortraitUrl(trade.officialName, trade.title);
	let portraitError = $state(false);

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
	</div>

	<!-- Content -->
	<div class="flex-1 min-w-0">
		<!-- Header: Name and Party -->
		<div class="flex items-start justify-between gap-2">
			<div>
				<a href="/political/member/{encodeURIComponent(trade.officialName)}" class="font-semibold text-ink truncate hover:underline">{trade.officialName}</a>
				<p class="text-xs text-ink-muted">
					{trade.title || 'Official'}
					{#if trade.state}
						({getPartyAbbrev(trade.party)}-{trade.state})
					{/if}
				</p>
			</div>
			<span class="text-xs px-2 py-0.5 rounded font-medium {getPartyClass(trade.party)}">
				{getPartyAbbrev(trade.party)}
			</span>
		</div>

		<!-- Trade Details -->
		<div class="mt-2 flex flex-wrap items-center gap-2">
			<a href="/ticker/{trade.ticker}" class="ticker-symbol text-lg">
				{trade.ticker}
			</a>
			<span
				class={trade.transactionType === 'BUY'
					? 'badge badge-gain'
					: trade.transactionType === 'SELL'
						? 'badge badge-loss'
						: 'badge'}
			>
				{trade.transactionType}
			</span>
			<span class="font-semibold">{trade.amountDisplay}</span>
		</div>

		{#if trade.assetDescription}
			<p class="text-xs text-ink-muted mt-1 truncate">{trade.assetDescription}</p>
		{/if}

		<!-- Dates -->
		<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
			<span>
				Transaction: {trade.transactionDate ? formatDate(trade.transactionDate) : 'N/A'}
			</span>
			<span>
				Reported: {trade.reportedDate ? formatDate(trade.reportedDate) : 'N/A'}
			</span>
			{#if reportingGap !== null}
				<span class={reportingGap > 45 ? 'text-red-600' : reportingGap > 30 ? 'text-yellow-600' : ''}>
					({reportingGap} days to report)
				</span>
			{/if}
		</div>
	</div>
</article>
