<script lang="ts">
	import { formatCompact, formatPercent, formatDate } from '$lib/utils/formatters';
	import EmptyState from './EmptyState.svelte';

	type StatementType = 'income' | 'balance' | 'cashflow';

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
		type: StatementType;
		data: FinancialData[];
		loading?: boolean;
	}

	let { type, data, loading = false }: Props = $props();

	const incomeRows = [
		{ key: 'revenue', label: 'Revenue' },
		{ key: 'grossProfit', label: 'Gross Profit' },
		{ key: 'operatingIncome', label: 'Operating Income' },
		{ key: 'netIncome', label: 'Net Income' },
		{ key: 'eps', label: 'EPS', isEps: true }
	];

	const balanceRows = [
		{ key: 'cashAndCashEquivalents', label: 'Cash & Equivalents' },
		{ key: 'totalAssets', label: 'Total Assets' },
		{ key: 'totalLiabilities', label: 'Total Liabilities' },
		{ key: 'totalEquity', label: 'Total Equity' },
		{ key: 'totalDebt', label: 'Total Debt' },
		{ key: 'netDebt', label: 'Net Debt' }
	];

	const cashflowRows = [
		{ key: 'operatingCashFlow', label: 'Operating Cash Flow' },
		{ key: 'investingCashFlow', label: 'Investing Cash Flow' },
		{ key: 'financingCashFlow', label: 'Financing Cash Flow' },
		{ key: 'freeCashFlow', label: 'Free Cash Flow' },
		{ key: 'capitalExpenditure', label: 'Capital Expenditure' }
	];

	const rows = $derived(
		type === 'income' ? incomeRows : type === 'balance' ? balanceRows : cashflowRows
	);

	const title = $derived(
		type === 'income'
			? 'Income Statement'
			: type === 'balance'
				? 'Balance Sheet'
				: 'Cash Flow Statement'
	);

	const emptyMessage = $derived(
		type === 'income'
			? 'Income statement data not available'
			: type === 'balance'
				? 'Balance sheet data not available'
				: 'Cash flow data not available'
	);

	function getValue(item: FinancialData, key: string): number | null {
		const val = (item as Record<string, unknown>)[key];
		return typeof val === 'number' ? val : null;
	}

	function formatValue(value: number | null, isEps = false): string {
		if (value === null) return '--';
		if (isEps) return `$${value.toFixed(2)}`;
		return `$${formatCompact(Math.abs(value))}${value < 0 ? '' : ''}`;
	}

	function calcYoyChange(current: number | null, prev: number | null): number | null {
		if (current === null || prev === null || prev === 0) return null;
		return ((current - prev) / Math.abs(prev)) * 100;
	}

	function getYearLabel(dateStr: string): string {
		const date = new Date(dateStr);
		return date.getFullYear().toString();
	}

	function getQuarterLabel(dateStr: string, period: string): string {
		if (period === 'FY') return getYearLabel(dateStr);
		const date = new Date(dateStr);
		const quarter = Math.ceil((date.getMonth() + 1) / 3);
		return `Q${quarter} ${date.getFullYear().toString().slice(-2)}`;
	}
</script>

<div class="financial-table">
	{#if loading}
		<div class="loading">Loading financial data...</div>
	{:else if data.length === 0}
		<EmptyState
			title={emptyMessage}
			description="This may be due to the company being recently listed or data provider limitations."
			compact
		/>
	{:else}
		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						<th class="row-label">Metric</th>
						{#each data as period (period.date)}
							<th class="period-header">
								{getQuarterLabel(period.date, period.period)}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.key)}
						<tr>
							<td class="row-label">{row.label}</td>
							{#each data as period, i (period.date)}
								{@const value = getValue(period, row.key)}
								{@const prevValue = i < data.length - 1 ? getValue(data[i + 1], row.key) : null}
								{@const yoyChange = calcYoyChange(value, prevValue)}
								<td class="value-cell">
									<span class="value" class:negative={value !== null && value < 0}>
										{formatValue(value, row.isEps)}
									</span>
									{#if yoyChange !== null}
										<span
											class="yoy-change"
											class:positive={yoyChange > 0}
											class:negative={yoyChange < 0}
										>
											{formatPercent(yoyChange, 1)}
										</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.financial-table {
		background: var(--color-paper);
	}

	.loading,
	.empty {
		padding: 3rem 2rem;
		text-align: center;
		color: var(--color-ink-muted);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.875rem;
	}

	th,
	td {
		padding: 0.875rem 1rem;
		text-align: right;
		border-bottom: 1px solid var(--color-border);
	}

	th {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-muted);
		background: var(--color-newsprint-dark);
	}

	.row-label {
		text-align: left;
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--color-ink);
		white-space: nowrap;
		min-width: 160px;
		position: sticky;
		left: 0;
		background: var(--color-paper);
	}

	thead .row-label {
		background: var(--color-newsprint-dark);
	}

	.period-header {
		min-width: 100px;
		font-size: 0.8125rem;
	}

	.value-cell {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.value {
		color: var(--color-ink);
		font-weight: 500;
		font-size: 0.875rem;
	}

	.value.negative {
		color: var(--color-loss);
	}

	.yoy-change {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 3px 6px;
		border-radius: 3px;
		background: var(--color-newsprint-dark);
		border: 1px solid var(--color-border);
	}

	.yoy-change.positive {
		color: var(--color-gain);
		background: var(--color-gain-light);
		border-color: var(--color-gain);
	}

	.yoy-change.negative {
		color: var(--color-loss);
		background: var(--color-loss-light);
		border-color: var(--color-loss);
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background: var(--color-newsprint-dark);
	}

	tbody tr:hover .row-label {
		background: var(--color-newsprint-dark);
	}

	@media (max-width: 640px) {
		th,
		td {
			padding: 0.75rem 0.625rem;
		}

		.row-label {
			min-width: 120px;
			font-size: 0.8125rem;
		}

		.value {
			font-size: 0.8125rem;
		}

		.period-header {
			min-width: 80px;
		}
	}
</style>
