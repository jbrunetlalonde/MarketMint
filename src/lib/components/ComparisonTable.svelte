<script lang="ts">
	import { formatCurrency, formatCompact, formatPercent } from '$lib/utils/formatters';

	interface StockData {
		ticker: string;
		name?: string;
		price?: number | null;
		marketCap?: number | null;
		fiftyTwoWeekHigh?: number | null;
		fiftyTwoWeekLow?: number | null;
		volume?: number | null;
		peRatio?: number | null;
		eps?: number | null;
		dividendYield?: number | null;
		// Financials
		grossMargin?: number | null;
		operatingMargin?: number | null;
		netMargin?: number | null;
		roe?: number | null;
		roa?: number | null;
		revenueGrowth?: number | null;
		epsGrowth?: number | null;
		debtToEquity?: number | null;
		currentRatio?: number | null;
		freeCashFlow?: number | null;
		pbRatio?: number | null;
		evToEbitda?: number | null;
		pegRatio?: number | null;
	}

	interface Props {
		stock1: StockData | null;
		stock2: StockData | null;
	}

	let { stock1, stock2 }: Props = $props();

	type MetricConfig = {
		label: string;
		key: keyof StockData;
		format: 'currency' | 'compact' | 'percent' | 'ratio' | 'number';
		higherIsBetter: boolean;
	};

	const sections: { title: string; metrics: MetricConfig[] }[] = [
		{
			title: 'Overview',
			metrics: [
				{ label: 'Price', key: 'price', format: 'currency', higherIsBetter: true },
				{ label: 'Market Cap', key: 'marketCap', format: 'compact', higherIsBetter: true },
				{ label: '52W High', key: 'fiftyTwoWeekHigh', format: 'currency', higherIsBetter: true },
				{ label: '52W Low', key: 'fiftyTwoWeekLow', format: 'currency', higherIsBetter: false },
				{ label: 'Volume', key: 'volume', format: 'compact', higherIsBetter: true }
			]
		},
		{
			title: 'Valuation',
			metrics: [
				{ label: 'P/E Ratio', key: 'peRatio', format: 'ratio', higherIsBetter: false },
				{ label: 'P/B Ratio', key: 'pbRatio', format: 'ratio', higherIsBetter: false },
				{ label: 'EV/EBITDA', key: 'evToEbitda', format: 'ratio', higherIsBetter: false },
				{ label: 'PEG Ratio', key: 'pegRatio', format: 'ratio', higherIsBetter: false }
			]
		},
		{
			title: 'Profitability',
			metrics: [
				{ label: 'Gross Margin', key: 'grossMargin', format: 'percent', higherIsBetter: true },
				{ label: 'Operating Margin', key: 'operatingMargin', format: 'percent', higherIsBetter: true },
				{ label: 'Net Margin', key: 'netMargin', format: 'percent', higherIsBetter: true },
				{ label: 'ROE', key: 'roe', format: 'percent', higherIsBetter: true },
				{ label: 'ROA', key: 'roa', format: 'percent', higherIsBetter: true }
			]
		},
		{
			title: 'Growth & Income',
			metrics: [
				{ label: 'Revenue Growth', key: 'revenueGrowth', format: 'percent', higherIsBetter: true },
				{ label: 'EPS Growth', key: 'epsGrowth', format: 'percent', higherIsBetter: true },
				{ label: 'Dividend Yield', key: 'dividendYield', format: 'percent', higherIsBetter: true },
				{ label: 'EPS', key: 'eps', format: 'currency', higherIsBetter: true }
			]
		},
		{
			title: 'Financial Health',
			metrics: [
				{ label: 'Debt/Equity', key: 'debtToEquity', format: 'ratio', higherIsBetter: false },
				{ label: 'Current Ratio', key: 'currentRatio', format: 'ratio', higherIsBetter: true },
				{ label: 'Free Cash Flow', key: 'freeCashFlow', format: 'compact', higherIsBetter: true }
			]
		}
	];

	function formatValue(
		value: number | string | null | undefined,
		format: MetricConfig['format']
	): string {
		if (value === null || value === undefined) return '--';
		const num = typeof value === 'string' ? parseFloat(value) : value;
		if (isNaN(num)) return '--';

		switch (format) {
			case 'currency':
				return formatCurrency(num);
			case 'compact':
				return formatCompact(num);
			case 'percent':
				return formatPercent(num, 2, false);
			case 'ratio':
				return num.toFixed(2);
			case 'number':
				return num.toLocaleString();
			default:
				return String(num);
		}
	}

	function getComparisonClass(
		val1: number | string | null | undefined,
		val2: number | string | null | undefined,
		higherIsBetter: boolean,
		isStock1: boolean
	): string {
		if (val1 === null || val1 === undefined || val2 === null || val2 === undefined) return '';
		const num1 = typeof val1 === 'string' ? parseFloat(val1) : val1;
		const num2 = typeof val2 === 'string' ? parseFloat(val2) : val2;
		if (isNaN(num1) || isNaN(num2)) return '';
		if (num1 === num2) return '';

		const stock1Better = higherIsBetter ? num1 > num2 : num1 < num2;
		if (isStock1) {
			return stock1Better ? 'better' : 'worse';
		}
		return stock1Better ? 'worse' : 'better';
	}
</script>

<div class="comparison-table">
	{#each sections as section (section.title)}
		<div class="section">
			<h3 class="section-title">{section.title}</h3>
			<table>
				<thead>
					<tr>
						<th class="metric-col">Metric</th>
						<th class="value-col">{stock1?.ticker || 'Stock 1'}</th>
						<th class="value-col">{stock2?.ticker || 'Stock 2'}</th>
					</tr>
				</thead>
				<tbody>
					{#each section.metrics as metric (metric.key)}
						{@const val1 = stock1?.[metric.key]}
						{@const val2 = stock2?.[metric.key]}
						<tr>
							<td class="metric-name">{metric.label}</td>
							<td
								class="value {getComparisonClass(val1 as number, val2 as number, metric.higherIsBetter, true)}"
							>
								{formatValue(val1 as number, metric.format)}
							</td>
							<td
								class="value {getComparisonClass(val1 as number, val2 as number, metric.higherIsBetter, false)}"
							>
								{formatValue(val2 as number, metric.format)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/each}
</div>

<style>
	.comparison-table {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.section {
		border: 1px solid var(--color-border);
		background: var(--color-paper);
	}

	.section-title {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 700;
		margin: 0;
		padding: 0.75rem 1rem;
		background: var(--color-ink);
		color: var(--color-newsprint);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}

	thead {
		background: var(--color-newsprint);
	}

	th {
		padding: 0.625rem 1rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		color: var(--color-ink-muted);
		border-bottom: 1px solid var(--color-border);
	}

	th.metric-col {
		width: 40%;
	}

	th.value-col {
		width: 30%;
		text-align: right;
	}

	td {
		padding: 0.625rem 1rem;
		border-bottom: 1px dotted var(--color-border);
	}

	td.metric-name {
		color: var(--color-ink-muted);
	}

	td.value {
		text-align: right;
		font-weight: 600;
	}

	td.value.better {
		color: var(--color-gain);
		background: rgba(16, 185, 129, 0.05);
	}

	td.value.worse {
		color: var(--color-loss);
		background: rgba(239, 68, 68, 0.05);
	}

	tr:last-child td {
		border-bottom: none;
	}

	@media (max-width: 640px) {
		table {
			font-size: 0.75rem;
		}

		th,
		td {
			padding: 0.5rem 0.75rem;
		}
	}
</style>
