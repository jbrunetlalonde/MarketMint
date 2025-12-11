<script lang="ts">
	import api from '$lib/utils/api';
	import { getCongressPortraitUrl, getAvatarFallback } from '$lib/utils/urls';
	import { getPartyAbbrev, getInitials } from '$lib/utils/political';

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

	const ITEMS_PER_PAGE = 20;
	let housePage = $state(1);
	let senatePage = $state(1);

	const houseMembers = $derived(officials.filter((o) => o.chamber === 'house'));
	const senateMembers = $derived(officials.filter((o) => o.chamber === 'senate'));

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

	function handlePortraitError(e: Event, name: string, currentChamber: string) {
		const img = e.currentTarget as HTMLImageElement;
		const otherChamber = currentChamber === 'house' ? 'senate' : 'house';
		const otherUrl = getCongressPortraitUrl(name, otherChamber);

		if (!img.dataset.triedOther) {
			img.dataset.triedOther = 'true';
			img.src = otherUrl;
		} else {
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

	function isRepublican(party: string | null): boolean {
		return party?.toLowerCase().includes('republican') || false;
	}

	function isDemocrat(party: string | null): boolean {
		return party?.toLowerCase().includes('democrat') || false;
	}

	$effect(() => {
		loadOfficials();
	});
</script>

<svelte:head>
	<title>Politicians List - MarketMint</title>
</svelte:head>

<div class="politicians-page">
	<header class="page-header">
		<h1 class="page-title">Congress Members</h1>
		<p class="page-subtitle">{totalCount} politicians with disclosed stock trades</p>
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
		<div class="columns-container">
			<!-- House Column -->
			<div class="column">
				<div class="column-header">
					<h2>House of Representatives</h2>
					<span class="member-count">{houseMembers.length} members</span>
				</div>

				<div class="member-list">
					{#each paginatedHouse as member (member.id || member.name)}
						<a
							href="/political/member/{encodeURIComponent(member.name)}"
							class="member-row"
						>
							<div class="member-left">
								<img
									src={getPortraitUrl(member.name, 'house')}
									alt=""
									class="member-portrait"
									loading="lazy"
									onerror={(e) => handlePortraitError(e, member.name, 'house')}
								/>
								<div class="member-details">
									<span class="member-name">{member.name}</span>
									<div class="member-meta">
										<span
											class="party-badge"
											class:republican={isRepublican(member.party)}
											class:democrat={isDemocrat(member.party)}
										>
											{getPartyAbbrev(member.party)}
										</span>
										{#if member.state}
											<span class="state">{member.state}</span>
										{/if}
									</div>
								</div>
							</div>
							<div class="member-right">
								<svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M9 18l6-6-6-6"></path>
								</svg>
							</div>
						</a>
					{/each}
				</div>

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
					<h2>Senate</h2>
					<span class="member-count">{senateMembers.length} members</span>
				</div>

				<div class="member-list">
					{#each paginatedSenate as member (member.id || member.name)}
						<a
							href="/political/member/{encodeURIComponent(member.name)}"
							class="member-row"
						>
							<div class="member-left">
								<img
									src={getPortraitUrl(member.name, 'senate')}
									alt=""
									class="member-portrait"
									loading="lazy"
									onerror={(e) => handlePortraitError(e, member.name, 'senate')}
								/>
								<div class="member-details">
									<span class="member-name">{member.name}</span>
									<div class="member-meta">
										<span
											class="party-badge"
											class:republican={isRepublican(member.party)}
											class:democrat={isDemocrat(member.party)}
										>
											{getPartyAbbrev(member.party)}
										</span>
										{#if member.state}
											<span class="state">{member.state}</span>
										{/if}
									</div>
								</div>
							</div>
							<div class="member-right">
								<svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M9 18l6-6-6-6"></path>
								</svg>
							</div>
						</a>
					{/each}
				</div>

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
		font-family: var(--font-mono);
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0;
		color: var(--color-ink);
	}

	.page-subtitle {
		font-size: 0.875rem;
		color: var(--color-ink-muted);
		margin: 0.5rem 0 0;
	}

	.loading-state,
	.error-state {
		text-align: center;
		padding: 3rem 1rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
	}

	.error-message {
		color: var(--color-loss);
		margin-bottom: 1rem;
	}

	.retry-btn {
		padding: 0.5rem 1.5rem;
		background: var(--color-ink);
		color: var(--color-paper);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-family: inherit;
	}

	.retry-btn:hover {
		background: var(--color-ink-light);
	}

	.columns-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.column {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		overflow: hidden;
	}

	.column-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-newsprint);
	}

	.column-header h2 {
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
		color: var(--color-ink);
	}

	.member-count {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
	}

	.member-list {
		min-height: 400px;
	}

	.member-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.25rem;
		text-decoration: none;
		color: inherit;
		border-bottom: 1px solid var(--color-border);
		transition: background-color 0.15s;
	}

	.member-row:hover {
		background-color: var(--color-newsprint);
	}

	.member-row:last-child {
		border-bottom: none;
	}

	.member-left {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		min-width: 0;
	}

	.member-portrait {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		object-fit: cover;
		object-position: top;
		background: var(--color-newsprint);
		border: 2px solid var(--color-border);
		flex-shrink: 0;
	}

	.member-details {
		min-width: 0;
	}

	.member-name {
		display: block;
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--color-ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	.member-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.party-badge {
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
		font-size: 0.75rem;
		color: var(--color-ink-muted);
	}

	.member-right {
		flex-shrink: 0;
	}

	.arrow-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-ink-muted);
		transition: transform 0.15s, color 0.15s;
	}

	.member-row:hover .arrow-icon {
		color: var(--color-ink);
		transform: translateX(3px);
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.25rem;
		padding: 1rem;
		border-top: 1px solid var(--color-border);
		background: var(--color-newsprint);
	}

	.page-btn {
		padding: 0.375rem 0.75rem;
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-radius: 4px;
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
		color: var(--color-paper);
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

		.member-name {
			max-width: 180px;
		}
	}
</style>
