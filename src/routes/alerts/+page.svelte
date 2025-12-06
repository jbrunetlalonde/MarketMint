<script lang="ts">
	import { onMount } from 'svelte';
	import { formatCurrency, formatPercent } from '$lib/utils/formatters';
	import { auth } from '$lib/stores/auth.svelte';
	import api from '$lib/utils/api';

	type AlertTab = 'trade' | 'idea';

	interface TradeAlert {
		id: number;
		ticker: string;
		officialName: string;
		transactionType: string;
		amountDisplay: string;
		createdAt: string;
		readAt: string | null;
		assetDescription: string | null;
		transactionDate: string | null;
		reportedDate: string | null;
		party: string | null;
		title: string | null;
		state: string | null;
		portraitUrl: string | null;
	}

	interface IdeaAlert {
		id: number;
		ideaId: number;
		ticker: string;
		alertType: 'target_hit' | 'stopped_out';
		triggerPrice: number;
		entryPrice: number | null;
		targetPrice: number | null;
		stopLoss: number | null;
		pnlPercent: number | null;
		ideaTitle: string | null;
		createdAt: string;
		readAt: string | null;
	}

	let activeTab = $state<AlertTab>('trade');
	let loading = $state(true);
	let error = $state<string | null>(null);

	let tradeAlerts = $state<TradeAlert[]>([]);
	let tradeUnreadCount = $state(0);
	let ideaAlerts = $state<IdeaAlert[]>([]);
	let ideaUnreadCount = $state(0);

	const totalUnread = $derived(tradeUnreadCount + ideaUnreadCount);

	async function loadAlerts() {
		if (!auth.isAuthenticated || !auth.accessToken) return;

		loading = true;
		error = null;

		try {
			const [tradeResponse, ideaResponse] = await Promise.all([
				api.getAlerts({}, auth.accessToken),
				api.getIdeaAlerts({}, auth.accessToken)
			]);

			if (tradeResponse.success && tradeResponse.data) {
				tradeAlerts = tradeResponse.data.alerts;
				tradeUnreadCount = tradeResponse.data.unreadCount;
			}

			if (ideaResponse.success && ideaResponse.data) {
				ideaAlerts = ideaResponse.data.alerts;
				ideaUnreadCount = ideaResponse.data.unreadCount;
			}
		} catch (err) {
			error = 'Failed to load alerts';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function markTradeAlertRead(alertId: number) {
		if (!auth.accessToken) return;

		try {
			const response = await api.markAlertRead(alertId, auth.accessToken);
			if (response.success) {
				tradeAlerts = tradeAlerts.map((a) => (a.id === alertId ? { ...a, readAt: new Date().toISOString() } : a));
				tradeUnreadCount = Math.max(0, tradeUnreadCount - 1);
			}
		} catch (err) {
			console.error('Failed to mark alert as read:', err);
		}
	}

	async function markIdeaAlertRead(alertId: number) {
		if (!auth.accessToken) return;

		try {
			const response = await api.markIdeaAlertRead(alertId, auth.accessToken);
			if (response.success) {
				ideaAlerts = ideaAlerts.map((a) => (a.id === alertId ? { ...a, readAt: new Date().toISOString() } : a));
				ideaUnreadCount = Math.max(0, ideaUnreadCount - 1);
			}
		} catch (err) {
			console.error('Failed to mark idea alert as read:', err);
		}
	}

	async function markAllTradeAlertsRead() {
		if (!auth.accessToken) return;

		try {
			const response = await api.markAllAlertsRead(auth.accessToken);
			if (response.success) {
				tradeAlerts = tradeAlerts.map((a) => ({ ...a, readAt: a.readAt || new Date().toISOString() }));
				tradeUnreadCount = 0;
			}
		} catch (err) {
			console.error('Failed to mark all alerts as read:', err);
		}
	}

	function formatAlertTime(dateStr: string): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return '';

		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffHours / 24);

		if (diffHours < 1) return 'Just now';
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getPartyClass(party: string | null): string {
		if (!party) return '';
		const p = party.toLowerCase();
		if (p.includes('democrat')) return 'party-dem';
		if (p.includes('republican')) return 'party-rep';
		return '';
	}

	onMount(() => {
		if (auth.isAuthenticated) {
			loadAlerts();
		}
	});
</script>

<svelte:head>
	<title>Alerts - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<div class="alerts-header">
			<h1 class="headline headline-xl">Alerts</h1>
			{#if totalUnread > 0}
				<span class="unread-badge">{totalUnread} unread</span>
			{/if}
		</div>

		{#if !auth.isAuthenticated}
			<div class="card mt-4">
				<p class="text-center py-8">
					<a href="/auth/login" class="underline font-semibold">Sign in</a> to view your alerts.
				</p>
			</div>
		{:else}
			<!-- Tabs -->
			<div class="tabs">
				<button
					class="tab"
					class:active={activeTab === 'trade'}
					onclick={() => (activeTab = 'trade')}
				>
					Trade Alerts
					{#if tradeUnreadCount > 0}
						<span class="tab-badge">{tradeUnreadCount}</span>
					{/if}
				</button>
				<button
					class="tab"
					class:active={activeTab === 'idea'}
					onclick={() => (activeTab = 'idea')}
				>
					Idea Alerts
					{#if ideaUnreadCount > 0}
						<span class="tab-badge">{ideaUnreadCount}</span>
					{/if}
				</button>
			</div>

			<!-- Trade Alerts Tab -->
			{#if activeTab === 'trade'}
				<div class="card mt-4">
					<div class="card-header">
						<h3 class="headline headline-md">Political Trade Alerts</h3>
						{#if tradeUnreadCount > 0}
							<button class="btn btn-small" onclick={markAllTradeAlertsRead}>
								Mark all read
							</button>
						{/if}
					</div>
					<p class="byline mb-4">Alerts when officials trade stocks in your watchlist</p>

					{#if loading}
						<div class="animate-pulse space-y-3">
							{#each Array(3) as _, i (i)}
								<div class="h-16 bg-gray-200 rounded"></div>
							{/each}
						</div>
					{:else if tradeAlerts.length === 0}
						<div class="empty-state">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
							</svg>
							<p>No trade alerts yet</p>
							<span class="text-xs text-ink-muted">
								Add stocks to your watchlist to receive alerts when officials trade them
							</span>
						</div>
					{:else}
						<div class="alerts-list">
							{#each tradeAlerts as alert (alert.id)}
								<div
									class="alert-item"
									class:unread={!alert.readAt}
									onclick={() => !alert.readAt && markTradeAlertRead(alert.id)}
									role="button"
									tabindex="0"
									onkeypress={(e) => e.key === 'Enter' && !alert.readAt && markTradeAlertRead(alert.id)}
								>
									<div class="alert-indicator" class:unread={!alert.readAt}></div>
									<div class="alert-content">
										<div class="alert-main">
											<a href="/ticker/{alert.ticker}" class="ticker-symbol">
												{alert.ticker}
											</a>
											<span class="alert-type {alert.transactionType.toLowerCase()}">
												{alert.transactionType}
											</span>
											<span class="alert-amount">{alert.amountDisplay}</span>
										</div>
										<div class="alert-details">
											<span class="official-name {getPartyClass(alert.party)}">
												{alert.officialName}
											</span>
											{#if alert.title}
												<span class="official-title">{alert.title}</span>
											{/if}
											{#if alert.state}
												<span class="official-state">({alert.state})</span>
											{/if}
										</div>
										{#if alert.assetDescription}
											<p class="alert-description">{alert.assetDescription}</p>
										{/if}
									</div>
									<div class="alert-time">{formatAlertTime(alert.createdAt)}</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Idea Alerts Tab -->
			{#if activeTab === 'idea'}
				<div class="card mt-4">
					<div class="card-header">
						<h3 class="headline headline-md">Trading Idea Alerts</h3>
					</div>
					<p class="byline mb-4">Alerts when your trading ideas hit targets or stop losses</p>

					{#if loading}
						<div class="animate-pulse space-y-3">
							{#each Array(3) as _, i (i)}
								<div class="h-16 bg-gray-200 rounded"></div>
							{/each}
						</div>
					{:else if ideaAlerts.length === 0}
						<div class="empty-state">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
							<p>No idea alerts yet</p>
							<span class="text-xs text-ink-muted">
								Create trading ideas with targets and stops to receive alerts when they're hit
							</span>
						</div>
					{:else}
						<div class="alerts-list">
							{#each ideaAlerts as alert (alert.id)}
								<div
									class="alert-item"
									class:unread={!alert.readAt}
									onclick={() => !alert.readAt && markIdeaAlertRead(alert.id)}
									role="button"
									tabindex="0"
									onkeypress={(e) => e.key === 'Enter' && !alert.readAt && markIdeaAlertRead(alert.id)}
								>
									<div class="alert-indicator" class:unread={!alert.readAt}></div>
									<div class="alert-content">
										<div class="alert-main">
											<a href="/ticker/{alert.ticker}" class="ticker-symbol">
												{alert.ticker}
											</a>
											<span class="alert-type {alert.alertType === 'target_hit' ? 'target' : 'stopped'}">
												{alert.alertType === 'target_hit' ? 'Target Hit' : 'Stopped Out'}
											</span>
											{#if alert.pnlPercent !== null}
												<span class="alert-pnl" class:positive={alert.pnlPercent >= 0} class:negative={alert.pnlPercent < 0}>
													{alert.pnlPercent >= 0 ? '+' : ''}{formatPercent(alert.pnlPercent)}
												</span>
											{/if}
										</div>
										{#if alert.ideaTitle}
											<p class="alert-title">{alert.ideaTitle}</p>
										{/if}
										<div class="alert-prices">
											{#if alert.entryPrice}
												<span>Entry: {formatCurrency(alert.entryPrice)}</span>
											{/if}
											<span>Trigger: {formatCurrency(alert.triggerPrice)}</span>
										</div>
									</div>
									<div class="alert-time">{formatAlertTime(alert.createdAt)}</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</section>
</div>

<style>
	.alerts-header {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.unread-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.75rem;
		background: var(--color-gain);
		color: white;
		border-radius: 9999px;
	}

	.tabs {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--color-border);
		margin-top: 1rem;
	}

	.tab {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.75rem 1.5rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		color: var(--color-ink-muted);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.15s ease;
	}

	.tab:hover {
		color: var(--color-ink);
	}

	.tab.active {
		color: var(--color-ink);
		border-bottom-color: var(--color-ink);
	}

	.tab-badge {
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0.125rem 0.375rem;
		background: var(--color-gain);
		color: white;
		border-radius: 9999px;
		min-width: 1.25rem;
		text-align: center;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--color-ink-muted);
	}

	.empty-state svg {
		width: 3rem;
		height: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state p {
		font-weight: 500;
		margin-bottom: 0.25rem;
	}

	.alerts-list {
		display: flex;
		flex-direction: column;
	}

	.alert-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.alert-item:last-child {
		border-bottom: none;
	}

	.alert-item:hover {
		background: var(--color-newsprint);
	}

	.alert-item.unread {
		background: rgba(34, 197, 94, 0.05);
	}

	.alert-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-border);
		flex-shrink: 0;
		margin-top: 0.5rem;
	}

	.alert-indicator.unread {
		background: var(--color-gain);
	}

	.alert-content {
		flex: 1;
		min-width: 0;
	}

	.alert-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.alert-type {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
	}

	.alert-type.purchase,
	.alert-type.buy,
	.alert-type.target {
		background: rgba(34, 197, 94, 0.1);
		color: var(--color-gain);
	}

	.alert-type.sale,
	.alert-type.sell,
	.alert-type.stopped {
		background: rgba(239, 68, 68, 0.1);
		color: var(--color-loss);
	}

	.alert-amount {
		font-size: 0.8rem;
		color: var(--color-ink-muted);
	}

	.alert-details {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
		font-size: 0.8rem;
		flex-wrap: wrap;
	}

	.official-name {
		font-weight: 500;
	}

	.official-name.party-dem {
		color: #3b82f6;
	}

	.official-name.party-rep {
		color: #ef4444;
	}

	.official-title,
	.official-state {
		color: var(--color-ink-muted);
	}

	.alert-description {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		margin-top: 0.25rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.alert-title {
		font-size: 0.8rem;
		color: var(--color-ink-light);
		margin-top: 0.25rem;
	}

	.alert-prices {
		display: flex;
		gap: 1rem;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-ink-muted);
	}

	.alert-pnl {
		font-weight: 600;
		font-size: 0.8rem;
	}

	.alert-pnl.positive {
		color: var(--color-gain);
	}

	.alert-pnl.negative {
		color: var(--color-loss);
	}

	.alert-time {
		font-size: 0.7rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
		flex-shrink: 0;
	}
</style>
