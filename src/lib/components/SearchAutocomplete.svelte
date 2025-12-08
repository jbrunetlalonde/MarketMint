<script lang="ts">
	import { goto } from '$app/navigation';
	import api from '$lib/utils/api';
	import { getCompanyLogoUrl } from '$lib/utils/urls';

	interface SearchResult {
		symbol: string;
		name: string;
		exchange: string;
	}

	interface Props {
		placeholder?: string;
		onSelect?: (result: SearchResult) => void;
		compact?: boolean;
		expandable?: boolean;
	}

	let { placeholder = 'Search for stocks...', onSelect, compact = false, expandable = false }: Props = $props();

	let searchQuery = $state('');
	let results = $state<SearchResult[]>([]);
	let isLoading = $state(false);
	let isOpen = $state(false);
	let isExpanded = $state(!expandable);
	let selectedIndex = $state(-1);
	let hasSearched = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let inputElement: HTMLInputElement | null = null;
	let containerElement: HTMLDivElement | null = null;

	function expandSearch() {
		isExpanded = true;
		setTimeout(() => inputElement?.focus(), 100);
	}

	function collapseSearch() {
		if (!searchQuery.trim()) {
			isExpanded = false;
			isOpen = false;
			results = [];
			hasSearched = false;
		}
	}

	function handleInput() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		const query = searchQuery.trim();
		if (query.length < 1) {
			results = [];
			isOpen = false;
			hasSearched = false;
			return;
		}

		isLoading = true;
		debounceTimer = setTimeout(async () => {
			const response = await api.searchSymbols(query, 8);
			hasSearched = true;
			if (response.success && response.data) {
				results = response.data;
				isOpen = true;
				selectedIndex = -1;
			} else {
				results = [];
				isOpen = true;
			}
			isLoading = false;
		}, 300);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) {
			if (e.key === 'Enter') {
				handleDirectSubmit();
			}
			if (e.key === 'Escape' && expandable) {
				collapseSearch();
				inputElement?.blur();
			}
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedIndex >= 0 && results[selectedIndex]) {
					selectResult(results[selectedIndex]);
				} else {
					handleDirectSubmit();
				}
				break;
			case 'Escape':
				isOpen = false;
				selectedIndex = -1;
				if (expandable) {
					collapseSearch();
					inputElement?.blur();
				}
				break;
		}
	}

	function selectResult(result: SearchResult) {
		isOpen = false;
		selectedIndex = -1;
		if (onSelect) {
			onSelect(result);
			searchQuery = '';
			if (expandable) collapseSearch();
		} else {
			searchQuery = '';
			if (expandable) {
				isExpanded = false;
			}
			goto(`/ticker/${result.symbol}`);
		}
	}

	function handleDirectSubmit() {
		const ticker = searchQuery.trim().toUpperCase();
		if (ticker && /^[A-Z0-9.]{1,10}$/.test(ticker)) {
			isOpen = false;
			if (onSelect) {
				onSelect({ symbol: ticker, name: '', exchange: '' });
				searchQuery = '';
				if (expandable) collapseSearch();
			} else {
				searchQuery = '';
				if (expandable) {
					isExpanded = false;
				}
				goto(`/ticker/${ticker}`);
			}
		}
	}

	function handleBlur() {
		setTimeout(() => {
			if (!containerElement?.contains(document.activeElement)) {
				isOpen = false;
				if (expandable) {
					collapseSearch();
				}
			}
		}, 200);
	}

	function handleFocus() {
		if (results.length > 0) {
			isOpen = true;
		}
	}
</script>

<div class="search-container" class:compact class:expandable class:expanded={isExpanded} bind:this={containerElement}>
	{#if expandable}
		<button
			type="button"
			class="search-trigger"
			class:hidden={isExpanded}
			onclick={expandSearch}
			aria-label="Open search"
			tabindex={isExpanded ? -1 : 0}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"></circle>
				<path d="m21 21-4.35-4.35"></path>
			</svg>
		</button>
	{/if}

	<div class="search-input-wrapper" class:collapsed={expandable && !isExpanded}>
		<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="11" cy="11" r="8"></circle>
			<path d="m21 21-4.35-4.35"></path>
		</svg>
		<input
			type="text"
			bind:this={inputElement}
			bind:value={searchQuery}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={handleBlur}
			onfocus={handleFocus}
			{placeholder}
			class="search-input"
			autocomplete="off"
			spellcheck="false"
			tabindex={expandable && !isExpanded ? -1 : 0}
		/>
		{#if isLoading}
			<div class="search-spinner"></div>
		{/if}
	</div>

	{#if isOpen && isExpanded}
		<div class="search-dropdown">
			{#if results.length > 0}
				<ul>
					{#each results as result, index (result.symbol)}
						<li>
							<button
								type="button"
								class="search-result"
								class:selected={index === selectedIndex}
								onmousedown={() => selectResult(result)}
								onmouseenter={() => (selectedIndex = index)}
							>
								<img
									src={getCompanyLogoUrl(result.symbol)}
									alt=""
									class="result-logo"
									loading="lazy"
									onerror={(e) => {
										const img = e.currentTarget as HTMLImageElement;
										img.style.display = 'none';
									}}
								/>
								<span class="result-symbol">{result.symbol}</span>
								<span class="result-name">{result.name}</span>
								<span class="result-exchange">{result.exchange}</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else if hasSearched && !isLoading}
				<div class="no-results">
					<p class="no-results-text">No stocks found for "{searchQuery}"</p>
					<p class="no-results-hint">Try AAPL, MSFT, GOOGL, or enter a ticker symbol</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.search-container {
		position: relative;
		width: 100%;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		transition: width 0.2s ease, opacity 0.2s ease;
	}

	.search-icon {
		position: absolute;
		left: 1.25rem;
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-ink-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 1rem 3rem 1rem 3.5rem;
		font-family: var(--font-mono);
		font-size: 0.9rem;
		border: 1px solid var(--color-border);
		border-radius: 2rem;
		background: var(--color-newsprint);
		color: var(--color-ink);
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.search-input::placeholder {
		color: var(--color-ink-muted);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-ink);
		box-shadow: 0 0 0 3px rgba(128, 128, 128, 0.15);
	}

	.search-spinner {
		position: absolute;
		right: 1.25rem;
		width: 1rem;
		height: 1rem;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-ink);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.search-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		right: 0;
		background: var(--color-newsprint);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		max-height: 400px;
		overflow-y: auto;
		z-index: 1000;
	}

	.search-dropdown ul {
		list-style: none;
		padding: 0.5rem 0;
		margin: 0;
	}

	.no-results {
		padding: 1.5rem 1rem;
		text-align: center;
	}

	.no-results-text {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-ink-light);
		margin: 0 0 0.5rem 0;
	}

	.no-results-hint {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin: 0;
	}

	.search-result {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		color: var(--color-ink);
		transition: background-color 0.1s;
	}

	.search-result:hover,
	.search-result.selected {
		background-color: var(--color-newsprint-dark);
	}

	.result-logo {
		width: 24px;
		height: 24px;
		object-fit: contain;
		border-radius: 4px;
		background: var(--color-paper);
		flex-shrink: 0;
	}

	.result-symbol {
		font-weight: 700;
		color: var(--color-ink);
		min-width: 60px;
	}

	.result-name {
		flex: 1;
		color: var(--color-ink-light);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-exchange {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		padding: 0.125rem 0.375rem;
		background: var(--color-newsprint-dark);
		border-radius: 0.25rem;
	}

	/* Compact variant for navbar use */
	.compact .search-input {
		padding: 0.4rem 2rem 0.4rem 2rem;
		font-size: 0.75rem;
		border-radius: 0.25rem;
		border-color: var(--color-border);
	}

	.compact .search-input:focus {
		border-color: var(--color-ink-muted);
		box-shadow: none;
	}

	.compact .search-icon {
		left: 0.5rem;
		width: 0.875rem;
		height: 0.875rem;
	}

	.compact .search-spinner {
		right: 0.5rem;
		width: 0.75rem;
		height: 0.75rem;
	}

	.compact .search-dropdown {
		border-radius: 0.25rem;
		min-width: 280px;
		left: auto;
		right: 0;
	}

	.compact .search-result {
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
	}

	.compact .result-logo {
		width: 18px;
		height: 18px;
	}

	.compact .result-symbol {
		min-width: 45px;
	}

	.compact .result-exchange {
		font-size: 0.625rem;
	}

	.compact .no-results {
		padding: 1rem 0.75rem;
	}

	.compact .no-results-text {
		font-size: 0.75rem;
	}

	.compact .no-results-hint {
		font-size: 0.625rem;
	}

	/* Expandable search trigger button */
	.search-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		cursor: pointer;
		color: var(--color-ink-muted);
		transition: all 0.2s ease;
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
	}

	.search-trigger:hover {
		color: var(--color-ink);
		border-color: var(--color-ink-muted);
	}

	.search-trigger.hidden {
		opacity: 0;
		pointer-events: none;
		transform: translateY(-50%) scale(0.8);
	}

	.search-trigger svg {
		width: 1rem;
		height: 1rem;
	}

	/* Expandable mode - collapsed state */
	.expandable {
		width: auto;
		min-width: 2rem;
	}

	.expandable .search-input-wrapper {
		width: 200px;
		overflow: hidden;
	}

	.expandable .search-input-wrapper.collapsed {
		width: 0;
		opacity: 0;
		pointer-events: none;
	}

	.expandable.expanded .search-input-wrapper {
		width: 200px;
		opacity: 1;
		pointer-events: auto;
	}

	.expandable .search-dropdown {
		min-width: 280px;
		right: 0;
		left: auto;
	}
</style>
