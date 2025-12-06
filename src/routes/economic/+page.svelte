<script lang="ts">
	import { api } from '$lib/utils/api';
	import { onMount } from 'svelte';

	type EconomicData = {
		fedFundsRate: { latest: { date: string; value: number } | null } | null;
		treasury10Y: { latest: { date: string; value: number } | null } | null;
		treasury2Y: { latest: { date: string; value: number } | null } | null;
		yieldSpread: { latest: { date: string; value: number } | null } | null;
		unemployment: { latest: { date: string; value: number } | null } | null;
		cpi: { latest: { date: string; value: number } | null } | null;
		vix: { latest: { date: string; value: number } | null } | null;
		oilPrice: { latest: { date: string; value: number } | null } | null;
		mortgageRate: { latest: { date: string; value: number } | null } | null;
		gdp: { latest: { date: string; value: number } | null } | null;
	};

	let dashboard = $state<EconomicData | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		await loadDashboard();
	});

	async function loadDashboard() {
		loading = true;
		error = null;

		const result = await api.getEconomicDashboard();

		if (result.success && result.data) {
			dashboard = result.data;
		} else {
			error = result.error?.message || 'Failed to load economic data';
		}

		loading = false;
	}

	function formatValue(value: number | undefined | null, unit: string): string {
		if (value == null) return 'N/A';
		if (unit === '%') return value.toFixed(2) + '%';
		if (unit === 'USD') return '$' + value.toFixed(2);
		if (unit === 'index') return value.toFixed(2);
		return value.toFixed(2);
	}

	function formatDate(dateStr: string | undefined): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Economic Indicators - MarketMint</title>
</svelte:head>

<div class="newspaper-grid">
	<section class="col-span-full">
		<h1 class="headline headline-xl">Economic Indicators</h1>
		<p class="text-ink-muted mt-2">
			Key economic data from the Federal Reserve Economic Data (FRED) database.
		</p>
	</section>

	{#if loading}
		<div class="col-span-full text-center py-12">
			<p class="text-ink-muted">Loading economic data...</p>
		</div>
	{:else if error}
		<div class="col-span-full">
			<div class="border border-red-600 bg-red-50 p-4 rounded">
				<p class="text-red-800">{error}</p>
				<button class="btn btn-small mt-4" onclick={loadDashboard}>Retry</button>
			</div>
		</div>
	{:else if dashboard}
		<!-- Interest Rates -->
		<section class="col-span-6">
			<h2 class="headline headline-lg border-b-2 border-ink pb-2 mb-4">Interest Rates</h2>
			<div class="space-y-4">
				<div class="card">
					<div class="flex justify-between items-center">
						<div>
							<h3 class="font-semibold">Fed Funds Rate</h3>
							<p class="text-xs text-ink-muted">Target rate set by the Federal Reserve</p>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold">{formatValue(dashboard.fedFundsRate?.latest?.value, '%')}</p>
							<p class="text-xs text-ink-muted">{formatDate(dashboard.fedFundsRate?.latest?.date)}</p>
						</div>
					</div>
				</div>

				<div class="card">
					<div class="flex justify-between items-center">
						<div>
							<h3 class="font-semibold">10-Year Treasury</h3>
							<p class="text-xs text-ink-muted">Benchmark long-term yield</p>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold">{formatValue(dashboard.treasury10Y?.latest?.value, '%')}</p>
							<p class="text-xs text-ink-muted">{formatDate(dashboard.treasury10Y?.latest?.date)}</p>
						</div>
					</div>
				</div>

				<div class="card">
					<div class="flex justify-between items-center">
						<div>
							<h3 class="font-semibold">2-Year Treasury</h3>
							<p class="text-xs text-ink-muted">Short-term yield indicator</p>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold">{formatValue(dashboard.treasury2Y?.latest?.value, '%')}</p>
							<p class="text-xs text-ink-muted">{formatDate(dashboard.treasury2Y?.latest?.date)}</p>
						</div>
					</div>
				</div>

				<div class="card">
					<div class="flex justify-between items-center">
						<div>
							<h3 class="font-semibold">10Y-2Y Spread</h3>
							<p class="text-xs text-ink-muted">Yield curve indicator</p>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold" class:text-red-600={dashboard.yieldSpread?.latest?.value != null && dashboard.yieldSpread.latest.value < 0}>
								{formatValue(dashboard.yieldSpread?.latest?.value, '%')}
							</p>
							<p class="text-xs text-ink-muted">{formatDate(dashboard.yieldSpread?.latest?.date)}</p>
						</div>
					</div>
				</div>

				<div class="card">
					<div class="flex justify-between items-center">
						<div>
							<h3 class="font-semibold">30-Year Mortgage</h3>
							<p class="text-xs text-ink-muted">Average fixed rate</p>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold">{formatValue(dashboard.mortgageRate?.latest?.value, '%')}</p>
							<p class="text-xs text-ink-muted">{formatDate(dashboard.mortgageRate?.latest?.date)}</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Economic Health -->
		<section class="col-span-6">
			<h2 class="headline headline-lg border-b-2 border-ink pb-2 mb-4">Economic Health</h2>
			<div class="space-y-4">
				<div class="card">
					<div class="flex justify-between items-center">
						<div>
							<h3 class="font-semibold">Unemployment Rate</h3>
							<p class="text-xs text-ink-muted">U.S. unemployment percentage</p>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold">{formatValue(dashboard.unemployment?.latest?.value, '%')}</p>
							<p class="text-xs text-ink-muted">{formatDate(dashboard.unemployment?.latest?.date)}</p>
						</div>
					</div>
				</div>

				<div class="card">
					<div class="flex justify-between items-center">
						<div>
							<h3 class="font-semibold">Consumer Price Index</h3>
							<p class="text-xs text-ink-muted">Inflation measure (index)</p>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold">{formatValue(dashboard.cpi?.latest?.value, 'index')}</p>
							<p class="text-xs text-ink-muted">{formatDate(dashboard.cpi?.latest?.date)}</p>
						</div>
					</div>
				</div>

				<div class="card">
					<div class="flex justify-between items-center">
						<div>
							<h3 class="font-semibold">GDP</h3>
							<p class="text-xs text-ink-muted">Gross Domestic Product (billions)</p>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold">${dashboard.gdp?.latest?.value ? (dashboard.gdp.latest.value / 1000).toFixed(1) + 'T' : 'N/A'}</p>
							<p class="text-xs text-ink-muted">{formatDate(dashboard.gdp?.latest?.date)}</p>
						</div>
					</div>
				</div>

				<div class="card">
					<div class="flex justify-between items-center">
						<div>
							<h3 class="font-semibold">VIX</h3>
							<p class="text-xs text-ink-muted">Market volatility index</p>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold" class:text-red-600={dashboard.vix?.latest?.value != null && dashboard.vix.latest.value > 30}>
								{formatValue(dashboard.vix?.latest?.value, 'index')}
							</p>
							<p class="text-xs text-ink-muted">{formatDate(dashboard.vix?.latest?.date)}</p>
						</div>
					</div>
				</div>

				<div class="card">
					<div class="flex justify-between items-center">
						<div>
							<h3 class="font-semibold">WTI Crude Oil</h3>
							<p class="text-xs text-ink-muted">Price per barrel</p>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold">{formatValue(dashboard.oilPrice?.latest?.value, 'USD')}</p>
							<p class="text-xs text-ink-muted">{formatDate(dashboard.oilPrice?.latest?.date)}</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Data Source Note -->
		<section class="col-span-full mt-8">
			<div class="card bg-paper-dark">
				<h3 class="font-semibold mb-2">About This Data</h3>
				<p class="text-sm text-ink-muted">
					Economic data is sourced from the Federal Reserve Economic Data (FRED) database maintained by
					the Federal Reserve Bank of St. Louis. Data is cached for 24 hours. Some indicators update
					daily, while others update monthly or quarterly.
				</p>
			</div>
		</section>
	{/if}
</div>
