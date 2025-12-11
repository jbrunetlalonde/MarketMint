<script lang="ts">
	import { echart } from '$lib/actions/echarts';
	import { themeStore } from '$lib/stores/theme.svelte';
	import {
		buildFinancialBarOptions,
		buildLineAreaOptions,
		getTheme,
		type FinancialDataPoint
	} from '$lib/utils/chart-options';
	import type { EChartsOption } from 'echarts';

	type ChartType = 'income' | 'balance' | 'cashflow';

	interface IncomeData {
		date: string;
		period: string;
		revenue: number;
		netIncome: number;
		grossProfit: number;
		operatingIncome: number;
		eps: number;
	}

	interface BalanceData {
		date: string;
		period: string;
		cashAndCashEquivalents: number;
		totalAssets: number;
		totalLiabilities: number;
		totalEquity: number;
		totalDebt: number;
		netDebt: number;
	}

	interface CashFlowData {
		date: string;
		period: string;
		netIncome: number;
		operatingCashFlow: number;
		investingCashFlow: number;
		financingCashFlow: number;
		freeCashFlow: number;
		capitalExpenditure: number;
	}

	type FinancialData = IncomeData | BalanceData | CashFlowData;

	interface Props {
		type: ChartType;
		data: FinancialData[];
	}

	let { type, data }: Props = $props();

	const isDark = $derived(themeStore.resolvedTheme === 'dark');
	const colors = $derived(getTheme(isDark));

	function formatBillions(value: number): string {
		const abs = Math.abs(value);
		if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
		if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
		if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
		return `$${value.toFixed(0)}`;
	}

	const mainChartOptions = $derived.by((): EChartsOption | null => {
		if (data.length === 0) return null;

		const dataPoints = data as unknown as FinancialDataPoint[];

		if (type === 'income') {
			return buildFinancialBarOptions(
				dataPoints,
				{
					title: 'Revenue & Profitability',
					series: [
						{ key: 'revenue', name: 'Revenue', color: '#0d7a3e' },
						{ key: 'grossProfit', name: 'Gross Profit', color: '#0066cc' },
						{ key: 'netIncome', name: 'Net Income', color: '#663399' }
					],
					formatValue: formatBillions
				},
				colors
			);
		}

		if (type === 'balance') {
			return buildLineAreaOptions(
				dataPoints,
				{
					title: 'Assets, Liabilities & Equity',
					series: [
						{ key: 'totalAssets', name: 'Total Assets', color: '#0d7a3e' },
						{ key: 'totalLiabilities', name: 'Total Liabilities', color: '#c41e3a' },
						{ key: 'totalEquity', name: 'Shareholders Equity', color: '#0066cc' }
					],
					formatValue: formatBillions
				},
				colors
			);
		}

		if (type === 'cashflow') {
			return buildFinancialBarOptions(
				dataPoints,
				{
					title: 'Cash Flow Analysis',
					series: [
						{ key: 'operatingCashFlow', name: 'Operating', color: '#0d7a3e' },
						{ key: 'investingCashFlow', name: 'Investing', color: '#c41e3a' },
						{ key: 'financingCashFlow', name: 'Financing', color: '#0066cc' }
					],
					formatValue: formatBillions
				},
				colors
			);
		}

		return null;
	});

	const fcfChartOptions = $derived.by((): EChartsOption | null => {
		if (type !== 'cashflow' || data.length === 0) return null;

		const dataPoints = data as unknown as FinancialDataPoint[];
		return buildLineAreaOptions(
			dataPoints,
			{
				title: 'Free Cash Flow Trend',
				series: [{ key: 'freeCashFlow', name: 'Free Cash Flow', color: '#10b981' }],
				formatValue: formatBillions
			},
			colors
		);
	});
</script>

<div class="chart-section">
	{#if data.length === 0}
		<div class="no-data">No data available for visualization</div>
	{:else}
		<div class="charts-wrapper" class:with-secondary={type === 'cashflow'}>
			<div class="main-chart">
				{#if mainChartOptions}
					<div
						class="chart-container"
						use:echart={{ options: mainChartOptions, theme: isDark ? 'dark' : 'light' }}
					></div>
				{/if}
			</div>
			{#if type === 'cashflow' && fcfChartOptions}
				<div class="secondary-chart">
					<div
						class="chart-container"
						use:echart={{ options: fcfChartOptions, theme: isDark ? 'dark' : 'light' }}
					></div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.chart-section {
		background: var(--color-paper);
		border: 1px solid var(--color-border);
		border-top: none;
	}

	.no-data {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--color-ink-muted);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
	}

	.charts-wrapper {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0;
		padding: 1.25rem;
	}

	.charts-wrapper.with-secondary {
		grid-template-columns: 2fr 1fr;
		gap: 1.5rem;
	}

	.main-chart {
		height: 320px;
		min-height: 280px;
		position: relative;
	}

	.secondary-chart {
		height: 320px;
		min-height: 280px;
		position: relative;
		padding-left: 1rem;
		border-left: 1px solid var(--color-border);
	}

	.chart-container {
		width: 100%;
		height: 100%;
	}

	@media (max-width: 900px) {
		.charts-wrapper.with-secondary {
			grid-template-columns: 1fr;
		}

		.secondary-chart {
			border-left: none;
			border-top: 1px solid var(--color-border);
			padding-left: 0;
			padding-top: 1rem;
			height: 180px;
		}
	}
</style>
