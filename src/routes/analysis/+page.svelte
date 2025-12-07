<script lang="ts">
	import { onMount } from 'svelte';
	import { formatCurrency, formatDate, getPriceClass } from '$lib/utils/formatters';
	import { auth } from '$lib/stores/auth.svelte';
	import { tradingIdeas, type TradingIdeaWithPnL } from '$lib/stores/tradingIdeas.svelte';
	import { quotes } from '$lib/stores/quotes.svelte';

	// Modal states
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showCloseModal = $state(false);
	let editingIdea = $state<TradingIdeaWithPnL | null>(null);
	let closingIdea = $state<TradingIdeaWithPnL | null>(null);

	// Form states
	let formTicker = $state('');
	let formTitle = $state('');
	let formThesis = $state('');
	let formEntryPrice = $state('');
	let formTargetPrice = $state('');
	let formStopLoss = $state('');
	let formTimeframe = $state<'intraday' | 'swing' | 'position' | 'long_term'>('swing');
	let formSentiment = $state<'bullish' | 'bearish' | 'neutral'>('bullish');
	let formExitPrice = $state('');
	let formCloseStatus = $state<'closed' | 'stopped_out' | 'target_hit'>('closed');
	let formError = $state('');
	let isSubmitting = $state(false);

	onMount(() => {
		if (auth.isAuthenticated) {
			tradingIdeas.fetch();
			tradingIdeas.fetchStats();
			quotes.connect();
		}
	});

	function getSentimentBadge(sentiment: string | null) {
		if (sentiment === 'bullish') return 'badge-gain';
		if (sentiment === 'bearish') return 'badge-loss';
		return '';
	}

	function getStatusBadge(status: string) {
		if (status === 'target_hit') return 'badge-gain';
		if (status === 'stopped_out') return 'badge-loss';
		return '';
	}

	function formatTimeframe(tf: string | null) {
		const labels: Record<string, string> = {
			intraday: 'Intraday',
			swing: 'Swing',
			position: 'Position',
			long_term: 'Long Term'
		};
		return tf ? labels[tf] || tf : '-';
	}

	function openCreateModal() {
		formTicker = '';
		formTitle = '';
		formThesis = '';
		formEntryPrice = '';
		formTargetPrice = '';
		formStopLoss = '';
		formTimeframe = 'swing';
		formSentiment = 'bullish';
		formError = '';
		showCreateModal = true;
	}

	function openEditModal(idea: TradingIdeaWithPnL) {
		editingIdea = idea;
		formTitle = idea.title || '';
		formThesis = idea.thesis;
		formEntryPrice = idea.entry_price?.toString() || '';
		formTargetPrice = idea.target_price?.toString() || '';
		formStopLoss = idea.stop_loss?.toString() || '';
		formTimeframe = idea.timeframe || 'swing';
		formSentiment = idea.sentiment || 'bullish';
		formError = '';
		showEditModal = true;
	}

	function openCloseModal(idea: TradingIdeaWithPnL) {
		closingIdea = idea;
		formExitPrice = idea.currentPrice?.toString() || '';
		formCloseStatus = 'closed';
		formError = '';
		showCloseModal = true;
	}

	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		showCloseModal = false;
		editingIdea = null;
		closingIdea = null;
		formError = '';
	}

	async function handleCreate() {
		if (!formTicker.trim()) {
			formError = 'Ticker is required';
			return;
		}
		if (!formThesis.trim()) {
			formError = 'Thesis is required';
			return;
		}

		isSubmitting = true;
		formError = '';

		const result = await tradingIdeas.create({
			ticker: formTicker.toUpperCase(),
			title: formTitle.trim() || undefined,
			thesis: formThesis.trim(),
			entryPrice: formEntryPrice ? parseFloat(formEntryPrice) : undefined,
			targetPrice: formTargetPrice ? parseFloat(formTargetPrice) : undefined,
			stopLoss: formStopLoss ? parseFloat(formStopLoss) : undefined,
			timeframe: formTimeframe,
			sentiment: formSentiment
		});

		isSubmitting = false;

		if (result.success) {
			closeModals();
		} else {
			formError = result.error || 'Failed to create idea';
		}
	}

	async function handleUpdate() {
		if (!editingIdea) return;

		isSubmitting = true;
		formError = '';

		const result = await tradingIdeas.update(editingIdea.id, {
			title: formTitle.trim() || undefined,
			thesis: formThesis.trim(),
			entryPrice: formEntryPrice ? parseFloat(formEntryPrice) : undefined,
			targetPrice: formTargetPrice ? parseFloat(formTargetPrice) : undefined,
			stopLoss: formStopLoss ? parseFloat(formStopLoss) : undefined,
			timeframe: formTimeframe,
			sentiment: formSentiment
		});

		isSubmitting = false;

		if (result.success) {
			closeModals();
			tradingIdeas.fetch();
		} else {
			formError = result.error || 'Failed to update idea';
		}
	}

	async function handleClose() {
		if (!closingIdea) return;

		const exitPrice = parseFloat(formExitPrice);
		if (isNaN(exitPrice) || exitPrice <= 0) {
			formError = 'Valid exit price is required';
			return;
		}

		isSubmitting = true;
		formError = '';

		const result = await tradingIdeas.close(closingIdea.id, exitPrice, formCloseStatus);

		isSubmitting = false;

		if (result.success) {
			closeModals();
		} else {
			formError = result.error || 'Failed to close position';
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('Are you sure you want to delete this trading idea?')) return;

		const result = await tradingIdeas.delete(id);
		if (!result.success) {
			alert(result.error || 'Failed to delete idea');
		}
	}

	async function handleExport() {
		const result = await tradingIdeas.exportCSV();
		if (!result.success) {
			alert(result.error || 'Export failed');
		}
	}

	async function handleExportPDF() {
		const result = await tradingIdeas.exportPDF();
		if (!result.success) {
			alert(result.error || 'PDF export failed');
		}
	}
</script>

<svelte:head>
	<title>Analysis - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">Trading Ideas & Analysis</h1>
		<p class="text-ink-muted mt-2">
			Track your trading ideas, set price targets, and monitor performance.
		</p>
	</section>

	{#if !auth.isAuthenticated}
		<section class="col-span-full">
			<div class="card">
				<p class="text-center py-8">
					<a href="/auth/login" class="underline font-semibold">Sign in</a> to create and track trading
					ideas.
				</p>
			</div>
		</section>
	{:else}
		<!-- Stats Cards -->
		{#if tradingIdeas.stats}
			<section class="col-span-full">
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="card text-center">
						<div class="text-2xl font-bold">{tradingIdeas.stats.totalIdeas}</div>
						<div class="byline">Total Ideas</div>
					</div>
					<div class="card text-center">
						<div class="text-2xl font-bold">{tradingIdeas.stats.openIdeas}</div>
						<div class="byline">Open</div>
					</div>
					<div class="card text-center">
						<div class="text-2xl font-bold {tradingIdeas.stats.winRate > 50 ? 'price-positive' : tradingIdeas.stats.winRate < 50 ? 'price-negative' : ''}">
							{tradingIdeas.stats.winRate}%
						</div>
						<div class="byline">Win Rate</div>
					</div>
					<div class="card text-center">
						<div class="text-2xl font-bold {getPriceClass(tradingIdeas.stats.avgPnlPercent)}">
							{tradingIdeas.stats.avgPnlPercent > 0 ? '+' : ''}{tradingIdeas.stats.avgPnlPercent}%
						</div>
						<div class="byline">Avg P&L</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- Controls -->
		<section class="col-span-full">
			<div class="flex flex-wrap items-center gap-4">
				<button class="btn btn-primary" onclick={openCreateModal}>+ New Trading Idea</button>
				<button class="btn" onclick={handleExport}>Export CSV</button>
				<button class="btn" onclick={handleExportPDF}>Export PDF</button>

				<div class="flex gap-2 ml-auto">
					<button
						class="btn btn-small {tradingIdeas.statusFilter === 'all' ? 'btn-primary' : ''}"
						onclick={() => tradingIdeas.setStatusFilter('all')}
					>
						All
					</button>
					<button
						class="btn btn-small {tradingIdeas.statusFilter === 'open' ? 'btn-primary' : ''}"
						onclick={() => tradingIdeas.setStatusFilter('open')}
					>
						Open
					</button>
					<button
						class="btn btn-small {tradingIdeas.statusFilter === 'closed' ? 'btn-primary' : ''}"
						onclick={() => tradingIdeas.setStatusFilter('closed')}
					>
						Closed
					</button>
				</div>
			</div>
		</section>

		<!-- Loading/Error States -->
		{#if tradingIdeas.isLoading}
			<section class="col-span-full">
				<div class="card text-center py-8">
					<p class="text-ink-muted">Loading trading ideas...</p>
				</div>
			</section>
		{:else if tradingIdeas.error}
			<section class="col-span-full">
				<div class="card border-red-600 bg-red-50 p-4">
					<p class="text-red-800">{tradingIdeas.error}</p>
					<button class="btn btn-small mt-2" onclick={() => tradingIdeas.fetch()}>Retry</button>
				</div>
			</section>
		{:else if tradingIdeas.ideas.length === 0}
			<section class="col-span-full">
				<div class="card text-center py-8">
					<p class="text-ink-muted">No trading ideas yet. Create your first one!</p>
				</div>
			</section>
		{:else}
			<!-- Trading Ideas List -->
			<section class="col-span-full">
				<div class="ideas-grid">
					{#each tradingIdeas.ideas as idea (idea.id)}
						<article class="idea-card">
							<!-- Header -->
							<div class="idea-header">
								<div class="idea-title-row">
									<a href="/ticker/{idea.ticker}" class="idea-ticker">{idea.ticker}</a>
									{#if idea.sentiment}
										<span class="idea-badge {getSentimentBadge(idea.sentiment)}">
											{idea.sentiment}
										</span>
									{/if}
									{#if idea.status !== 'open'}
										<span class="idea-badge {getStatusBadge(idea.status)}">
											{idea.status.replace('_', ' ')}
										</span>
									{/if}
								</div>
								<span class="idea-meta">{formatTimeframe(idea.timeframe)}</span>
							</div>

							<!-- Title & Thesis -->
							{#if idea.title}
								<h3 class="idea-name">{idea.title}</h3>
							{/if}
							<p class="idea-thesis">{idea.thesis}</p>

							<!-- Price Levels -->
							<div class="idea-prices">
								<div class="price-item">
									<span class="price-label">Entry</span>
									<span class="price-value">{idea.entry_price ? formatCurrency(idea.entry_price) : '-'}</span>
								</div>
								<div class="price-item">
									<span class="price-label">Target</span>
									<span class="price-value price-positive">{idea.target_price ? formatCurrency(idea.target_price) : '-'}</span>
								</div>
								<div class="price-item">
									<span class="price-label">Stop</span>
									<span class="price-value price-negative">{idea.stop_loss ? formatCurrency(idea.stop_loss) : '-'}</span>
								</div>
							</div>

							<!-- Current Status / P&L -->
							{#if idea.status === 'open'}
								<div class="idea-pnl">
									<div class="pnl-current">
										<span class="pnl-label">Current</span>
										<span class="pnl-value {idea.unrealizedPnl !== null ? getPriceClass(idea.unrealizedPnl) : ''}">
											{idea.currentPrice ? formatCurrency(idea.currentPrice) : 'Loading...'}
										</span>
									</div>
									<div class="pnl-result {idea.unrealizedPnlPercent !== null ? getPriceClass(idea.unrealizedPnlPercent) : ''}">
										{#if idea.unrealizedPnlPercent !== null}
											{idea.unrealizedPnlPercent > 0 ? '+' : ''}{idea.unrealizedPnlPercent.toFixed(2)}%
										{:else}
											--
										{/if}
									</div>
								</div>
							{:else}
								<div class="idea-pnl idea-pnl-closed">
									<div class="pnl-current">
										<span class="pnl-label">Exited at</span>
										<span class="pnl-value">{idea.actual_exit_price ? formatCurrency(idea.actual_exit_price) : '-'}</span>
									</div>
									<div class="pnl-result {idea.realizedPnlPercent !== null ? getPriceClass(idea.realizedPnlPercent) : ''}">
										{#if idea.realizedPnlPercent !== null}
											{idea.realizedPnlPercent > 0 ? '+' : ''}{idea.realizedPnlPercent.toFixed(2)}%
										{:else}
											--
										{/if}
									</div>
								</div>
							{/if}

							<!-- Actions -->
							<div class="idea-actions">
								{#if idea.status === 'open'}
									<button class="btn btn-small" onclick={() => openEditModal(idea)}>Edit</button>
									<button class="btn btn-small btn-primary" onclick={() => openCloseModal(idea)}>Close</button>
								{/if}
								<button class="btn btn-small btn-danger" onclick={() => handleDelete(idea.id)}>Delete</button>
								<span class="idea-date">{formatDate(idea.created_at)}</span>
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<!-- Create Modal -->
{#if showCreateModal}
	<div class="modal-backdrop" onclick={closeModals} role="dialog" aria-modal="true">
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<h2 class="headline headline-lg">New Trading Idea</h2>

			{#if formError}
				<div class="modal-error">
					<p>{formError}</p>
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="modal-form">
				<div class="form-row">
					<div class="form-group">
						<label for="ticker">Ticker *</label>
						<input type="text" id="ticker" bind:value={formTicker} class="input" placeholder="AAPL" />
					</div>
					<div class="form-group">
						<label for="sentiment">Sentiment *</label>
						<select id="sentiment" bind:value={formSentiment} class="input">
							<option value="bullish">Bullish</option>
							<option value="bearish">Bearish</option>
							<option value="neutral">Neutral</option>
						</select>
					</div>
				</div>

				<div class="form-group">
					<label for="title">Title</label>
					<input type="text" id="title" bind:value={formTitle} class="input" placeholder="Short description" />
				</div>

				<div class="form-group">
					<label for="thesis">Thesis *</label>
					<textarea id="thesis" bind:value={formThesis} class="input" rows="3" placeholder="Why this trade?"></textarea>
				</div>

				<div class="form-row form-row-3">
					<div class="form-group">
						<label for="entry">Entry Price</label>
						<input type="number" step="0.01" id="entry" bind:value={formEntryPrice} class="input" placeholder="0.00" />
					</div>
					<div class="form-group">
						<label for="target">Target</label>
						<input type="number" step="0.01" id="target" bind:value={formTargetPrice} class="input" placeholder="0.00" />
					</div>
					<div class="form-group">
						<label for="stop">Stop Loss</label>
						<input type="number" step="0.01" id="stop" bind:value={formStopLoss} class="input" placeholder="0.00" />
					</div>
				</div>

				<div class="form-group">
					<label for="timeframe">Timeframe</label>
					<select id="timeframe" bind:value={formTimeframe} class="input">
						<option value="intraday">Intraday</option>
						<option value="swing">Swing (days-weeks)</option>
						<option value="position">Position (weeks-months)</option>
						<option value="long_term">Long Term (months+)</option>
					</select>
				</div>

				<div class="modal-actions">
					<button type="submit" class="btn btn-primary" disabled={isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Create Idea'}
					</button>
					<button type="button" class="btn" onclick={closeModals}>Cancel</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Modal -->
{#if showEditModal && editingIdea}
	<div class="modal-backdrop" onclick={closeModals} role="dialog" aria-modal="true">
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<h2 class="headline headline-lg">Edit - {editingIdea.ticker}</h2>

			{#if formError}
				<div class="modal-error">
					<p>{formError}</p>
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleUpdate(); }} class="modal-form">
				<div class="form-row">
					<div class="form-group">
						<label for="edit-sentiment">Sentiment</label>
						<select id="edit-sentiment" bind:value={formSentiment} class="input">
							<option value="bullish">Bullish</option>
							<option value="bearish">Bearish</option>
							<option value="neutral">Neutral</option>
						</select>
					</div>
					<div class="form-group">
						<label for="edit-timeframe">Timeframe</label>
						<select id="edit-timeframe" bind:value={formTimeframe} class="input">
							<option value="intraday">Intraday</option>
							<option value="swing">Swing</option>
							<option value="position">Position</option>
							<option value="long_term">Long Term</option>
						</select>
					</div>
				</div>

				<div class="form-group">
					<label for="edit-title">Title</label>
					<input type="text" id="edit-title" bind:value={formTitle} class="input" />
				</div>

				<div class="form-group">
					<label for="edit-thesis">Thesis</label>
					<textarea id="edit-thesis" bind:value={formThesis} class="input" rows="3"></textarea>
				</div>

				<div class="form-row form-row-3">
					<div class="form-group">
						<label for="edit-entry">Entry Price</label>
						<input type="number" step="0.01" id="edit-entry" bind:value={formEntryPrice} class="input" />
					</div>
					<div class="form-group">
						<label for="edit-target">Target</label>
						<input type="number" step="0.01" id="edit-target" bind:value={formTargetPrice} class="input" />
					</div>
					<div class="form-group">
						<label for="edit-stop">Stop Loss</label>
						<input type="number" step="0.01" id="edit-stop" bind:value={formStopLoss} class="input" />
					</div>
				</div>

				<div class="modal-actions">
					<button type="submit" class="btn btn-primary" disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Save Changes'}
					</button>
					<button type="button" class="btn" onclick={closeModals}>Cancel</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Close Position Modal -->
{#if showCloseModal && closingIdea}
	<div class="modal-backdrop" onclick={closeModals} role="dialog" aria-modal="true">
		<div class="modal-content modal-small" onclick={(e) => e.stopPropagation()}>
			<h2 class="headline headline-lg">Close Position - {closingIdea.ticker}</h2>

			{#if formError}
				<div class="modal-error">
					<p>{formError}</p>
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleClose(); }} class="modal-form">
				<div class="form-group">
					<label for="exit-price">Exit Price *</label>
					<input type="number" step="0.01" id="exit-price" bind:value={formExitPrice} class="input" placeholder="0.00" />
					{#if closingIdea.currentPrice}
						<span class="form-hint">Current: {formatCurrency(closingIdea.currentPrice)}</span>
					{/if}
				</div>

				<div class="form-group">
					<label for="close-status">Result</label>
					<select id="close-status" bind:value={formCloseStatus} class="input">
						<option value="closed">Closed (Manual)</option>
						<option value="target_hit">Target Hit</option>
						<option value="stopped_out">Stopped Out</option>
					</select>
				</div>

				{#if closingIdea.entry_price && formExitPrice}
					{@const exitPrice = parseFloat(formExitPrice)}
					{@const pnl = closingIdea.sentiment === 'bearish'
						? closingIdea.entry_price - exitPrice
						: exitPrice - closingIdea.entry_price}
					{@const pnlPercent = (pnl / closingIdea.entry_price) * 100}
					<div class="pnl-preview">
						<span class="text-ink-muted">Expected P&L:</span>
						<span class="font-semibold {getPriceClass(pnl)}">
							{pnl > 0 ? '+' : ''}{formatCurrency(pnl)} ({pnlPercent > 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
						</span>
					</div>
				{/if}

				<div class="modal-actions">
					<button type="submit" class="btn btn-primary" disabled={isSubmitting}>
						{isSubmitting ? 'Closing...' : 'Close Position'}
					</button>
					<button type="button" class="btn" onclick={closeModals}>Cancel</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	/* Trading Ideas Grid */
	.ideas-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1rem;
	}

	.idea-card {
		background: white;
		border: 1px solid var(--color-border);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.idea-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.idea-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.idea-ticker {
		font-weight: 700;
		font-size: 1.25rem;
		letter-spacing: 0.05em;
		color: var(--color-ink);
		text-decoration: none;
	}

	.idea-ticker:hover {
		text-decoration: underline;
	}

	.idea-badge {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		padding: 0.125rem 0.5rem;
		border: 1px solid currentColor;
	}

	.idea-meta {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.idea-name {
		font-weight: 600;
		font-size: 1rem;
		margin: 0;
	}

	.idea-thesis {
		font-size: 0.85rem;
		color: var(--color-ink-light);
		line-height: 1.5;
		margin: 0;
	}

	.idea-prices {
		display: flex;
		gap: 1.5rem;
		padding: 0.75rem 0;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}

	.price-item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.price-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.price-value {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.idea-pnl {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--color-newsprint);
		padding: 0.75rem;
		margin: 0 -1rem;
		width: calc(100% + 2rem);
	}

	.idea-pnl-closed {
		background: var(--color-newsprint-dark);
	}

	.pnl-current {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.pnl-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
	}

	.pnl-value {
		font-weight: 600;
	}

	.pnl-result {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.idea-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-top: 0.5rem;
	}

	.idea-date {
		margin-left: auto;
		font-size: 0.7rem;
		color: var(--color-ink-muted);
	}

	.btn-danger {
		color: var(--color-loss);
		border-color: var(--color-loss);
	}

	.btn-danger:hover {
		background: var(--color-loss);
		color: white;
	}

	@media (max-width: 640px) {
		.ideas-grid {
			grid-template-columns: 1fr;
		}

		.idea-prices {
			flex-wrap: wrap;
			gap: 1rem;
		}
	}

	/* Modal Styles */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 100;
	}

	.modal-content {
		background: white;
		border: 1px solid var(--color-border);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.modal-small {
		max-width: 400px;
	}

	.modal-error {
		background: var(--color-loss-light);
		border: 1px solid var(--color-loss);
		padding: 0.75rem 1rem;
		margin: 1rem 0;
		font-size: 0.875rem;
		color: var(--color-loss);
	}

	.modal-form {
		margin-top: 1.5rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		margin-bottom: 0.375rem;
	}

	.form-group .input {
		width: 100%;
	}

	.form-hint {
		display: block;
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin-top: 0.25rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-row-3 {
		grid-template-columns: 1fr 1fr 1fr;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.modal-actions .btn-primary {
		flex: 1;
	}

	.pnl-preview {
		background: var(--color-newsprint);
		padding: 0.75rem 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}

	@media (max-width: 640px) {
		.modal-content {
			padding: 1rem;
			max-height: 95vh;
		}

		.form-row,
		.form-row-3 {
			grid-template-columns: 1fr;
		}
	}
</style>
