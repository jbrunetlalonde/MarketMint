<script lang="ts">
	import { onMount } from 'svelte';
	import api from '$lib/utils/api';
	import { formatPercent } from '$lib/utils/formatters';

	interface IndustryData {
		industry: string;
		changePercent: number;
	}

	let loading = $state(true);
	let industryData = $state<IndustryData[]>([]);
	let error = $state<string | null>(null);
	let expanded = $state(false);

	const DEFAULT_SHOW = 10;

	const sortedData = $derived(
		[...industryData].filter((s) => s?.industry).sort((a, b) => b.changePercent - a.changePercent)
	);

	const displayData = $derived(expanded ? sortedData : sortedData.slice(0, DEFAULT_SHOW));

	const maxAbsChange = $derived(Math.max(...sortedData.map((s) => Math.abs(s.changePercent)), 1));

	const hasMore = $derived(sortedData.length > DEFAULT_SHOW);

	// Industry short names for compact display
	const industryShortNames: Record<string, string> = {
		'Information Technology Services': 'IT Services',
		'Semiconductors & Equipment': 'Semiconductors',
		'Software - Application': 'Software Apps',
		'Software - Infrastructure': 'Software Infra',
		'Consumer Electronics': 'Consumer Elec.',
		'Communication Equipment': 'Comm. Equipment',
		'Electronic Components': 'Elec. Components',
		'Computer Hardware': 'Computer Hw',
		'Electrical Equipment & Parts': 'Electrical Equip.',
		'Banks - Diversified': 'Banks Diversified',
		'Banks - Regional': 'Banks Regional',
		'Insurance - Property & Casualty': 'Insurance P&C',
		'Insurance - Life': 'Insurance Life',
		'Asset Management': 'Asset Mgmt',
		'Capital Markets': 'Capital Mkts',
		'Financial Data & Stock Exchanges': 'Financial Data',
		'Credit Services': 'Credit Svcs',
		'Drug Manufacturers - General': 'Pharma General',
		'Drug Manufacturers - Specialty & Generic': 'Pharma Specialty',
		'Medical Devices': 'Medical Devices',
		'Medical Instruments & Supplies': 'Medical Instr.',
		'Healthcare Plans': 'Healthcare Plans',
		'Biotechnology': 'Biotech',
		'Diagnostics & Research': 'Diagnostics',
		'Restaurants': 'Restaurants',
		'Specialty Retail': 'Specialty Retail',
		'Internet Retail': 'Internet Retail',
		'Home Improvement Retail': 'Home Improvement',
		'Apparel Retail': 'Apparel Retail',
		'Auto Manufacturers': 'Auto Mfrs',
		'Auto Parts': 'Auto Parts',
		'Leisure': 'Leisure',
		'Travel Services': 'Travel Svcs',
		'Residential Construction': 'Res. Construction',
		'Household & Personal Products': 'Household Prod.',
		'Packaged Foods': 'Packaged Foods',
		'Food Distribution': 'Food Distrib.',
		'Beverages - Non-Alcoholic': 'Beverages',
		'Beverages - Brewers': 'Brewers',
		'Tobacco': 'Tobacco',
		'Discount Stores': 'Discount Stores',
		'Farm Products': 'Farm Products',
		'Oil & Gas E&P': 'Oil & Gas E&P',
		'Oil & Gas Integrated': 'Oil & Gas Integ.',
		'Oil & Gas Midstream': 'Oil & Gas Mid.',
		'Oil & Gas Refining & Marketing': 'Oil & Gas R&M',
		'Oil & Gas Equipment & Services': 'Oil & Gas Equip.',
		'Utilities - Regulated Electric': 'Utilities Elec.',
		'Utilities - Diversified': 'Utilities Div.',
		'Utilities - Renewable': 'Utilities Renew.',
		'Aerospace & Defense': 'Aerospace',
		'Railroads': 'Railroads',
		'Trucking': 'Trucking',
		'Marine Shipping': 'Marine Ship.',
		'Airlines': 'Airlines',
		'Waste Management': 'Waste Mgmt',
		'Building Products & Equipment': 'Building Prod.',
		'Construction Materials': 'Constr. Mats',
		'Steel': 'Steel',
		'Copper': 'Copper',
		'Gold': 'Gold',
		'Silver': 'Silver',
		'Specialty Chemicals': 'Spec. Chemicals',
		'Agricultural Inputs': 'Agri Inputs',
		'Telecom Services': 'Telecom',
		'Entertainment': 'Entertainment',
		'Internet Content & Information': 'Internet Content',
		'Advertising Agencies': 'Advertising',
		'Broadcasting': 'Broadcasting',
		'Publishing': 'Publishing',
		'Gaming': 'Gaming',
		'REIT - Retail': 'REIT Retail',
		'REIT - Residential': 'REIT Resid.',
		'REIT - Office': 'REIT Office',
		'REIT - Industrial': 'REIT Indust.',
		'REIT - Healthcare Facilities': 'REIT Healthcare',
		'REIT - Diversified': 'REIT Divers.',
		'Real Estate Services': 'Real Estate Svcs'
	};

	function getShortName(industry: string): string {
		return industryShortNames[industry] || (industry.length > 18 ? industry.slice(0, 16) + '...' : industry);
	}

	onMount(async () => {
		try {
			const response = await api.getIndustryPerformance();
			if (response.success && response.data) {
				industryData = response.data;
			} else if (response.error) {
				error = response.error.message;
			}
		} catch (err) {
			error = 'Failed to load industry data';
			console.error('Industry performance error:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="industry-performance">
	<div class="header">
		<h3 class="section-title">Industry Performance</h3>
		{#if hasMore && !loading}
			<button class="toggle-btn" onclick={() => (expanded = !expanded)}>
				{expanded ? 'Show Less' : `+${sortedData.length - DEFAULT_SHOW} more`}
			</button>
		{/if}
	</div>

	{#if loading}
		<div class="loading">
			{#each Array(6) as _, i (i)}
				<div class="skeleton-row"></div>
			{/each}
		</div>
	{:else if error}
		<p class="error-msg">{error}</p>
	{:else if sortedData.length === 0}
		<p class="no-data">No industry data available</p>
	{:else}
		<div class="industry-list" class:expanded>
			{#each displayData as industry, i (industry.industry ?? `industry-${i}`)}
				{@const isPositive = industry.changePercent >= 0}
				{@const barWidth = Math.abs(industry.changePercent / maxAbsChange) * 100}
				<div class="industry-row" class:positive={isPositive} class:negative={!isPositive}>
					<div class="industry-header">
						<span class="industry-name" title={industry.industry}>{getShortName(industry.industry)}</span>
						<span class="industry-change" class:positive={isPositive} class:negative={!isPositive}>
							{isPositive ? '+' : ''}{formatPercent(industry.changePercent)}
						</span>
					</div>
					<div class="bar-track">
						<div
							class="bar-fill"
							class:positive={isPositive}
							class:negative={!isPositive}
							style="width: {barWidth}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.industry-performance {
		margin-top: 1rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.section-title {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink);
		margin: 0;
	}

	.toggle-btn {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		color: var(--color-ink-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.toggle-btn:hover {
		background: var(--color-newsprint);
		border-color: var(--color-ink-light);
	}

	.loading {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-row {
		height: 2rem;
		background: var(--color-newsprint-dark);
		border-radius: 6px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}

	.no-data,
	.error-msg {
		font-size: 0.75rem;
		color: var(--color-ink-muted);
		text-align: center;
		padding: 1rem 0;
	}

	.error-msg {
		color: var(--color-loss);
	}

	.industry-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.industry-list.expanded {
		max-height: 600px;
	}

	.industry-row {
		padding: 0.375rem 0.5rem;
		border-radius: 4px;
		border-bottom: 1px dotted var(--color-border);
		transition: all 0.15s;
	}

	.industry-row:hover {
		background: var(--color-newsprint);
	}

	.industry-row:last-child {
		border-bottom: none;
	}

	.industry-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.industry-name {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 60%;
	}

	.industry-change {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 700;
	}

	.industry-change.positive {
		color: var(--color-gain);
	}

	.industry-change.negative {
		color: var(--color-loss);
	}

	.bar-track {
		height: 4px;
		background: var(--color-newsprint-dark);
		border-radius: 2px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.4s ease;
	}

	.bar-fill.positive {
		background: linear-gradient(90deg, var(--color-gain) 0%, #10b981 100%);
	}

	.bar-fill.negative {
		background: linear-gradient(90deg, var(--color-loss) 0%, #f87171 100%);
	}
</style>
