<script lang="ts">
	import api from '$lib/utils/api';
	import { getCongressPortraitUrl } from '$lib/utils/urls';
	import { getPartyAbbrev, getPartyClass, getInitials } from '$lib/utils/political';

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

	let filterChamber = $state<'all' | 'senate' | 'house'>('all');
	let filterParty = $state<'all' | 'D' | 'R'>('all');
	let searchQuery = $state('');

	const filteredOfficials = $derived.by(() => {
		let result = officials;

		if (filterChamber !== 'all') {
			result = result.filter((o) => o.chamber === filterChamber);
		}

		if (filterParty !== 'all') {
			result = result.filter((o) => {
				const party = o.party?.toLowerCase() || '';
				if (filterParty === 'D') return party.includes('democrat') || party === 'd';
				if (filterParty === 'R') return party.includes('republican') || party === 'r';
				return true;
			});
		}

		if (searchQuery.trim()) {
			const query = searchQuery.trim().toLowerCase();
			result = result.filter(
				(o) =>
					o.name.toLowerCase().includes(query) ||
					o.state?.toLowerCase().includes(query)
			);
		}

		return result;
	});

	const senateMembers = $derived(filteredOfficials.filter((o) => o.chamber === 'senate'));
	const houseMembers = $derived(filteredOfficials.filter((o) => o.chamber === 'house'));

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

	$effect(() => {
		loadOfficials();
	});
</script>

<svelte:head>
	<title>Congress Members - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">Congress Members Directory</h1>
		<p class="text-ink-muted mt-2">
			Browse House and Senate members. Click to view their trading activity.
		</p>
	</section>

	<!-- Filters -->
	<section class="col-span-full">
		<div class="card">
			<div class="flex gap-4 flex-wrap items-end">
				<div>
					<label for="filter-chamber" class="byline block mb-1">Chamber</label>
					<select id="filter-chamber" bind:value={filterChamber} class="input">
						<option value="all">All</option>
						<option value="senate">Senate</option>
						<option value="house">House</option>
					</select>
				</div>
				<div>
					<label for="filter-party" class="byline block mb-1">Party</label>
					<select id="filter-party" bind:value={filterParty} class="input">
						<option value="all">All Parties</option>
						<option value="D">Democrat</option>
						<option value="R">Republican</option>
					</select>
				</div>
				<div class="flex-1 min-w-48">
					<label for="search-member" class="byline block mb-1">Search</label>
					<input
						type="text"
						id="search-member"
						bind:value={searchQuery}
						placeholder="Search by name or state..."
						class="input w-full"
					/>
				</div>
			</div>
		</div>
	</section>

	{#if loading}
		<section class="col-span-full">
			<div class="card text-center py-8">
				<p class="text-ink-muted">Loading Congress members...</p>
			</div>
		</section>
	{:else if error}
		<section class="col-span-full">
			<div class="card text-center py-8">
				<p class="text-red-600 mb-4">{error}</p>
				<button onclick={loadOfficials} class="btn btn-primary">Try Again</button>
			</div>
		</section>
	{:else if filterChamber === 'all'}
		<!-- Two Column View: House | Senate -->
		<section class="col-span-6">
			<div class="card">
				<div class="flex items-center justify-between mb-4 pb-2 border-b-2 border-ink-light border-dotted">
					<h2 class="headline headline-md">House</h2>
					<span class="badge">{houseMembers.length}</span>
				</div>
				{#if houseMembers.length === 0}
					<p class="text-ink-muted text-center py-4">No House members found.</p>
				{:else}
					<div class="member-list">
						{#each houseMembers as member (member.id || member.name)}
							{@const portraitFailed = false}
							<a
								href="/political/member/{encodeURIComponent(member.name)}"
								class="member-row"
							>
								<img
									src={getPortraitUrl(member.name, 'house')}
									alt={member.name}
									class="member-portrait"
									loading="lazy"
									decoding="async"
									onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'}
								/>
								<div class="member-info">
									<span class="member-name">{member.name}</span>
									<span class="member-meta">
										{getPartyAbbrev(member.party)}{#if member.state}-{member.state}{/if}
									</span>
								</div>
								<span class="view-link">View Trades</span>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</section>

		<section class="col-span-6">
			<div class="card">
				<div class="flex items-center justify-between mb-4 pb-2 border-b-2 border-ink-light border-dotted">
					<h2 class="headline headline-md">Senate</h2>
					<span class="badge">{senateMembers.length}</span>
				</div>
				{#if senateMembers.length === 0}
					<p class="text-ink-muted text-center py-4">No Senate members found.</p>
				{:else}
					<div class="member-list">
						{#each senateMembers as member (member.id || member.name)}
							<a
								href="/political/member/{encodeURIComponent(member.name)}"
								class="member-row"
							>
								<img
									src={getPortraitUrl(member.name, 'senate')}
									alt={member.name}
									class="member-portrait"
									loading="lazy"
									decoding="async"
									onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'}
								/>
								<div class="member-info">
									<span class="member-name">{member.name}</span>
									<span class="member-meta">
										{getPartyAbbrev(member.party)}{#if member.state}-{member.state}{/if}
									</span>
								</div>
								<span class="view-link">View Trades</span>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	{:else}
		<!-- Single Column View (filtered by chamber) -->
		<section class="col-span-full">
			<div class="card">
				<div class="flex items-center justify-between mb-4 pb-2 border-b-2 border-ink-light border-dotted">
					<h2 class="headline headline-md">
						{filterChamber === 'senate' ? 'Senate' : 'House'}
					</h2>
					<span class="badge">{filteredOfficials.length}</span>
				</div>
				{#if filteredOfficials.length === 0}
					<p class="text-ink-muted text-center py-4">No members found matching your filters.</p>
				{:else}
					<div class="member-grid">
						{#each filteredOfficials as member (member.id || member.name)}
							<a
								href="/political/member/{encodeURIComponent(member.name)}"
								class="member-card"
							>
								<img
									src={getPortraitUrl(member.name, member.chamber)}
									alt={member.name}
									class="member-card-portrait"
									loading="lazy"
									decoding="async"
									onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'}
								/>
								<div class="member-card-info">
									<span class="member-card-name">{member.name}</span>
									<span class="member-card-meta">
										<span class="text-xs px-1.5 py-0.5 rounded {getPartyClass(member.party)}">
											{getPartyAbbrev(member.party)}
										</span>
										{#if member.state}
											<span class="text-ink-muted">{member.state}</span>
										{/if}
									</span>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	{/if}
</div>

<style>
	.member-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		max-height: 600px;
		overflow-y: auto;
	}

	.member-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0;
		border-bottom: 1px dotted var(--color-ink-light, #e5e7eb);
		text-decoration: none;
		color: inherit;
		transition: background-color 0.15s;
	}

	.member-row:hover {
		background-color: var(--color-newsprint-dark, #f3f4f6);
	}

	.member-row:last-child {
		border-bottom: none;
	}

	.member-portrait {
		width: 2.5rem;
		height: 3rem;
		object-fit: contain;
		border: 1px solid var(--color-ink-light, #e5e7eb);
		background-color: var(--color-newsprint, #fafaf9);
		flex-shrink: 0;
	}

	.member-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.member-name {
		font-weight: 500;
		font-size: 0.875rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.member-meta {
		font-size: 0.75rem;
		color: var(--color-ink-muted, #6b7280);
	}

	.view-link {
		font-size: 0.75rem;
		color: var(--color-ink-muted, #6b7280);
		text-decoration: underline;
		flex-shrink: 0;
	}

	.member-row:hover .view-link {
		color: var(--color-ink, #111827);
	}

	.member-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.member-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem;
		border: 1px solid var(--color-ink-light, #e5e7eb);
		background-color: var(--color-newsprint, #fafaf9);
		text-decoration: none;
		color: inherit;
		transition: box-shadow 0.15s, transform 0.15s;
	}

	.member-card:hover {
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.member-card-portrait {
		width: 4rem;
		height: 5rem;
		object-fit: contain;
		border: 1px solid var(--color-ink-light, #e5e7eb);
		background-color: white;
		margin-bottom: 0.75rem;
	}

	.member-card-info {
		text-align: center;
		width: 100%;
	}

	.member-card-name {
		display: block;
		font-weight: 600;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.member-card-meta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	@media (max-width: 768px) {
		.member-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
