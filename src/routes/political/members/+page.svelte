<script lang="ts">
	import api from '$lib/utils/api';
	import { getCongressPortraitUrl, getAvatarFallback } from '$lib/utils/urls';
	import { getPartyAbbrev } from '$lib/utils/political';

	interface Official {
		id: string;
		name: string;
		title: string | null;
		party: string | null;
		state: string | null;
		district: string | null;
		portraitUrl: string | null;
		chamber: string;
	}

	let officials = $state<Official[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Pagination state
	const ITEMS_PER_PAGE = 20;
	let housePage = $state(1);
	let senatePage = $state(1);

	// Filtered by chamber
	const houseMembers = $derived(officials.filter((o) => o.chamber === 'house'));
	const senateMembers = $derived(officials.filter((o) => o.chamber === 'senate'));

	// Pagination calculations
	const houseTotalPages = $derived(Math.ceil(houseMembers.length / ITEMS_PER_PAGE));
	const senateTotalPages = $derived(Math.ceil(senateMembers.length / ITEMS_PER_PAGE));

	const paginatedHouse = $derived(
		houseMembers.slice((housePage - 1) * ITEMS_PER_PAGE, housePage * ITEMS_PER_PAGE)
	);
	const paginatedSenate = $derived(
		senateMembers.slice((senatePage - 1) * ITEMS_PER_PAGE, senatePage * ITEMS_PER_PAGE)
	);

	const totalCount = $derived(officials.length);

	async function loadOfficials() {
		loading = true;
		error = null;

		try {
			const response = await api.getPoliticalOfficials({ limit: 600 });
			if (response.success && response.data) {
				officials = response.data;
			} else {
				error = 'Failed to load officials';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load officials';
		} finally {
			loading = false;
		}
	}

	function getPortraitUrl(name: string, chamber: string): string {
		return getCongressPortraitUrl(name, chamber as 'senate' | 'house');
	}

	// Try the other chamber portrait before falling back to avatar
	function handlePortraitError(e: Event, name: string, currentChamber: string) {
		const img = e.currentTarget as HTMLImageElement;
		const otherChamber = currentChamber === 'house' ? 'senate' : 'house';
		const otherUrl = getCongressPortraitUrl(name, otherChamber);

		// If we haven't tried the other chamber yet
		if (!img.dataset.triedOther) {
			img.dataset.triedOther = 'true';
			img.src = otherUrl;
		} else {
			// Both chambers failed, use avatar fallback
			img.src = getAvatarFallback(name);
		}
	}

	function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
		const pages: (number | string)[] = [];
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			if (currentPage > 3) pages.push('...');
			for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
				pages.push(i);
			}
			if (currentPage < totalPages - 2) pages.push('...');
			pages.push(totalPages);
		}
		return pages;
	}

	$effect(() => {
		loadOfficials();
	});
</script>

<svelte:head>
	<title>Politicians List - MarketMint</title>
</svelte:head>

<div class="politicians-page">
	<!-- Header -->
	<header class="page-header">
		<h1 class="page-title">Politicians List <span class="count">({totalCount})</span></h1>
	</header>

	{#if loading}
		<div class="loading-state">
			<p>Loading Congress members...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p class="error-message">{error}</p>
			<button onclick={loadOfficials} class="retry-btn">Try Again</button>
		</div>
	{:else}
		<!-- Two Column Layout -->
		<div class="columns-container">
			<!-- House Column -->
			<div class="column">
				<div class="column-header">
					<h2>House <span class="count">({houseMembers.length})</span></h2>
					<div class="column-labels">
						<span class="label-name">NAME</span>
						<span class="label-action">ACTION</span>
					</div>
				</div>

				<div class="member-list">
					{#each paginatedHouse as member (member.id || member.name)}
						<a
							href="/political/member/{encodeURIComponent(member.name)}"
							class="member-row"
						>
							<div class="member-info">
								<img
									src={getPortraitUrl(member.name, 'house')}
									alt=""
									class="member-portrait"
									loading="lazy"
									onerror={(e) => handlePortraitError(e, member.name, 'house')}
								/>
								<span class="member-name">{member.name}</span>
							</div>
							<span class="view-link">View Trades</span>
						</a>
					{/each}
				</div>

				<!-- House Pagination -->
				{#if houseTotalPages > 1}
					<div class="pagination">
						<button
							class="page-btn"
							disabled={housePage === 1}
							onclick={() => housePage--}
						>
							Prev
						</button>
						{#each getPageNumbers(housePage, houseTotalPages) as page}
							{#if page === '...'}
								<span class="page-ellipsis">...</span>
							{:else}
								<button
									class="page-btn"
									class:active={page === housePage}
									onclick={() => housePage = page as number}
								>
									{page}
								</button>
							{/if}
						{/each}
						<button
							class="page-btn"
							disabled={housePage === houseTotalPages}
							onclick={() => housePage++}
						>
							Next
						</button>
					</div>
				{/if}
			</div>

			<!-- Senate Column -->
			<div class="column">
				<div class="column-header">
					<h2>Senate <span class="count">({senateMembers.length})</span></h2>
					<div class="column-labels">
						<span class="label-name">NAME</span>
						<span class="label-action">ACTION</span>
					</div>
				</div>

				<div class="member-list">
					{#each paginatedSenate as member (member.id || member.name)}
						<a
							href="/political/member/{encodeURIComponent(member.name)}"
							class="member-row"
						>
							<div class="member-info">
								<img
									src={getPortraitUrl(member.name, 'senate')}
									alt=""
									class="member-portrait"
									loading="lazy"
									onerror={(e) => handlePortraitError(e, member.name, 'senate')}
								/>
								<span class="member-name">{member.name}</span>
							</div>
							<span class="view-link">View Trades</span>
						</a>
					{/each}
				</div>

				<!-- Senate Pagination -->
				{#if senateTotalPages > 1}
					<div class="pagination">
						<button
							class="page-btn"
							disabled={senatePage === 1}
							onclick={() => senatePage--}
						>
							Prev
						</button>
						{#each getPageNumbers(senatePage, senateTotalPages) as page}
							{#if page === '...'}
								<span class="page-ellipsis">...</span>
							{:else}
								<button
									class="page-btn"
									class:active={page === senatePage}
									onclick={() => senatePage = page as number}
								>
									{page}
								</button>
							{/if}
						{/each}
						<button
							class="page-btn"
							disabled={senatePage === senateTotalPages}
							onclick={() => senatePage++}
						>
							Next
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.politicians-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: 'IBM Plex Mono', monospace;
	}

	.page-header {
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px dotted var(--color-ink);
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		margin: 0;
		color: var(--color-ink);
	}

	.count {
		font-weight: 400;
		color: var(--color-ink-muted);
	}

	.loading-state,
	.error-state {
		text-align: center;
		padding: 3rem 1rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
	}

	.error-message {
		color: var(--color-loss);
		margin-bottom: 1rem;
	}

	.retry-btn {
		padding: 0.5rem 1.5rem;
		background: var(--color-ink);
		color: var(--color-newsprint);
		border: none;
		cursor: pointer;
		font-family: inherit;
	}

	.retry-btn:hover {
		background: var(--color-ink-light);
	}

	.columns-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	.column {
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
	}

	.column-header {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.column-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 0.75rem;
		color: var(--color-ink);
	}

	.column-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-ink-faint);
		letter-spacing: 0.05em;
	}

	.member-list {
		min-height: 400px;
	}

	.member-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		text-decoration: none;
		color: inherit;
		border-bottom: 1px dotted var(--color-border);
		transition: background-color 0.15s;
	}

	.member-row:hover {
		background-color: var(--color-newsprint-dark);
	}

	.member-row:last-child {
		border-bottom: none;
	}

	.member-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		min-width: 0;
	}

	.member-portrait {
		width: 44px;
		height: 54px;
		object-fit: contain;
		background: var(--color-paper, #fff);
		border: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.member-name {
		font-weight: 500;
		font-size: 0.9rem;
		color: var(--color-ink);
	}

	.view-link {
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	.member-row:hover .view-link {
		color: var(--color-ink);
		text-decoration: underline;
	}

	/* Pagination */
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.25rem;
		padding: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.page-btn {
		padding: 0.375rem 0.75rem;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		font-family: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		color: var(--color-ink);
	}

	.page-btn:hover:not(:disabled) {
		background: var(--color-newsprint-dark);
		border-color: var(--color-ink-muted);
	}

	.page-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-btn.active {
		background: var(--color-ink);
		color: var(--color-newsprint);
		border-color: var(--color-ink);
	}

	.page-ellipsis {
		padding: 0 0.5rem;
		color: var(--color-ink-muted);
	}

	@media (max-width: 900px) {
		.columns-container {
			grid-template-columns: 1fr;
		}
	}
</style>
