<script lang="ts">
	import { formatDate } from '$lib/utils/formatters';
	import { getPortraitUrl, getCongressPortraitUrl } from '$lib/utils/urls';

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

	function getPartyClass(party?: string | null): string {
		if (!party) return 'bg-gray-100 text-gray-700';
		const p = party.toLowerCase();
		if (p.includes('democrat')) return 'bg-blue-100 text-blue-800';
		if (p.includes('republican')) return 'bg-red-100 text-red-800';
		return 'bg-gray-100 text-gray-700';
	}

	function getPartyAbbrev(party?: string | null): string {
		if (!party) return '?';
		const p = party.toLowerCase();
		if (p.includes('democrat')) return 'D';
		if (p.includes('republican')) return 'R';
		return party.charAt(0).toUpperCase();
	}

	function getReportingGapDays(): number | null {
		if (!trade.transactionDate || !trade.reportedDate) return null;
		const tx = new Date(trade.transactionDate);
		const rpt = new Date(trade.reportedDate);
		const diffTime = rpt.getTime() - tx.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n.charAt(0))
			.join('')
			.toUpperCase()
			.slice(0, 2);
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
</script>

<article class="card p-4 flex gap-4">
	<!-- Portrait -->
	<div class="flex-shrink-0">
		{#if !portraitError}
			<img
				src={localPortrait}
				alt={trade.officialName}
				class="w-16 h-20 object-contain border border-ink-light bg-newsprint"
				onerror={() => portraitError = true}
			/>
		{:else}
			<div
				class="w-16 h-20 flex items-center justify-center text-lg font-bold border border-ink-light {getPartyClass(
					trade.party
				)}"
			>
				{getInitials(trade.officialName)}
			</div>
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
