<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';

	Chart.register(...registerables);

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

	let mainCanvas: HTMLCanvasElement;
	let secondaryCanvas: HTMLCanvasElement;
	let mainChart: Chart | null = null;
	let secondaryChart: Chart | null = null;

	function getLabels(data: FinancialData[]): string[] {
		return [...data].reverse().map((d) => {
			const date = new Date(d.date);
			if (d.period === 'FY') {
				return date.getFullYear().toString();
			}
			const quarter = Math.ceil((date.getMonth() + 1) / 3);
			return `Q${quarter} ${date.getFullYear().toString().slice(-2)}`;
		});
	}

	function formatBillions(value: number): string {
		const abs = Math.abs(value);
		if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
		if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
		if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
		return `$${value.toFixed(0)}`;
	}

	function getBaseOptions(isDark: boolean, title: string): any {
		const textColor = isDark ? '#e8e8e0' : '#1a1a1a';
		const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

		return {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: 'index' as const,
				intersect: false
			},
			plugins: {
				legend: {
					position: 'top' as const,
					align: 'end' as const,
					labels: {
						color: textColor,
						font: {
							family: "'IBM Plex Mono', monospace",
							size: 10
						},
						boxWidth: 8,
						boxHeight: 8,
						padding: 12,
						usePointStyle: true,
						pointStyle: 'circle'
					}
				},
				title: {
					display: true,
					text: title,
					color: textColor,
					font: {
						family: "'IBM Plex Mono', monospace",
						size: 12,
						weight: 600
					},
					align: 'start' as const,
					padding: { bottom: 20 }
				},
				tooltip: {
					backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
					titleColor: textColor,
					bodyColor: textColor,
					borderColor: isDark ? '#3d3d3d' : '#aaaaaa',
					borderWidth: 1,
					cornerRadius: 4,
					padding: 12,
					titleFont: {
						family: "'IBM Plex Mono', monospace",
						size: 11,
						weight: 600
					},
					bodyFont: {
						family: "'IBM Plex Mono', monospace",
						size: 10
					},
					callbacks: {
						label: function (context: any) {
							const value = context.parsed.y;
							if (context.dataset.yAxisID === 'y1') {
								return `${context.dataset.label}: ${value.toFixed(1)}%`;
							}
							return `${context.dataset.label}: ${formatBillions(value)}`;
						}
					}
				}
			},
			scales: {
				x: {
					ticks: {
						color: textColor,
						font: {
							family: "'IBM Plex Mono', monospace",
							size: 10
						}
					},
					grid: {
						display: false
					}
				},
				y: {
					position: 'left' as const,
					ticks: {
						color: textColor,
						font: {
							family: "'IBM Plex Mono', monospace",
							size: 10
						},
						callback: function (value: any) {
							return formatBillions(value as number);
						}
					},
					grid: {
						color: gridColor
					}
				}
			}
		};
	}

	// INCOME STATEMENT: Revenue bars with profit margin line
	function createIncomeChart(isDark: boolean) {
		const reversed = [...(data as IncomeData[])].reverse();
		const labels = getLabels(data);

		const revenues = reversed.map((d) => d.revenue);
		const grossProfits = reversed.map((d) => d.grossProfit);
		const netIncomes = reversed.map((d) => d.netIncome);
		const grossMargins = reversed.map((d) => (d.grossProfit / d.revenue) * 100);
		const netMargins = reversed.map((d) => (d.netIncome / d.revenue) * 100);

		const options = getBaseOptions(isDark, 'Revenue & Profitability');
		options.scales.y1 = {
			position: 'right',
			ticks: {
				color: isDark ? '#e8e8e0' : '#1a1a1a',
				font: { family: "'IBM Plex Mono', monospace", size: 10 },
				callback: (value: any) => `${value}%`
			},
			grid: { display: false },
			min: 0,
			max: Math.ceil(Math.max(...grossMargins) / 10) * 10 + 10
		};

		return {
			type: 'bar' as const,
			data: {
				labels,
				datasets: [
					{
						label: 'Revenue',
						data: revenues,
						backgroundColor: createGradient(mainCanvas, '#0d7a3e', '#0d7a3e80'),
						borderColor: '#0d7a3e',
						borderWidth: 0,
						borderRadius: 4,
						order: 3
					},
					{
						label: 'Gross Profit',
						data: grossProfits,
						backgroundColor: createGradient(mainCanvas, '#0066cc', '#0066cc80'),
						borderColor: '#0066cc',
						borderWidth: 0,
						borderRadius: 4,
						order: 2
					},
					{
						label: 'Net Income',
						data: netIncomes,
						backgroundColor: createGradient(mainCanvas, '#663399', '#66339980'),
						borderColor: '#663399',
						borderWidth: 0,
						borderRadius: 4,
						order: 1
					},
					{
						label: 'Gross Margin',
						data: grossMargins,
						type: 'line' as const,
						borderColor: '#f59e0b',
						backgroundColor: 'transparent',
						borderWidth: 2,
						pointRadius: 4,
						pointBackgroundColor: '#f59e0b',
						pointBorderColor: isDark ? '#1e1e1e' : '#ffffff',
						pointBorderWidth: 2,
						tension: 0.3,
						yAxisID: 'y1',
						order: 0
					},
					{
						label: 'Net Margin',
						data: netMargins,
						type: 'line' as const,
						borderColor: '#ef4444',
						backgroundColor: 'transparent',
						borderWidth: 2,
						pointRadius: 4,
						pointBackgroundColor: '#ef4444',
						pointBorderColor: isDark ? '#1e1e1e' : '#ffffff',
						pointBorderWidth: 2,
						tension: 0.3,
						yAxisID: 'y1',
						order: 0
					}
				]
			},
			options
		};
	}

	// BALANCE SHEET: Stacked area chart for composition
	function createBalanceChart(isDark: boolean) {
		const reversed = [...(data as BalanceData[])].reverse();
		const labels = getLabels(data);

		const options = getBaseOptions(isDark, 'Assets, Liabilities & Equity');
		options.scales.y.stacked = false;

		return {
			type: 'line' as const,
			data: {
				labels,
				datasets: [
					{
						label: 'Total Assets',
						data: reversed.map((d) => d.totalAssets),
						borderColor: '#0d7a3e',
						backgroundColor: 'rgba(13, 122, 62, 0.15)',
						borderWidth: 2,
						fill: true,
						tension: 0.4,
						pointRadius: 5,
						pointBackgroundColor: '#0d7a3e',
						pointBorderColor: isDark ? '#1e1e1e' : '#ffffff',
						pointBorderWidth: 2,
						pointHoverRadius: 7
					},
					{
						label: 'Total Liabilities',
						data: reversed.map((d) => d.totalLiabilities),
						borderColor: '#c41e3a',
						backgroundColor: 'rgba(196, 30, 58, 0.15)',
						borderWidth: 2,
						fill: true,
						tension: 0.4,
						pointRadius: 5,
						pointBackgroundColor: '#c41e3a',
						pointBorderColor: isDark ? '#1e1e1e' : '#ffffff',
						pointBorderWidth: 2,
						pointHoverRadius: 7
					},
					{
						label: 'Shareholders Equity',
						data: reversed.map((d) => d.totalEquity),
						borderColor: '#0066cc',
						backgroundColor: 'rgba(0, 102, 204, 0.15)',
						borderWidth: 2,
						fill: true,
						tension: 0.4,
						pointRadius: 5,
						pointBackgroundColor: '#0066cc',
						pointBorderColor: isDark ? '#1e1e1e' : '#ffffff',
						pointBorderWidth: 2,
						pointHoverRadius: 7
					}
				]
			},
			options
		};
	}

	// CASH FLOW: Waterfall-style grouped bars
	function createCashFlowChart(isDark: boolean) {
		const reversed = [...(data as CashFlowData[])].reverse();
		const labels = getLabels(data);

		const options = getBaseOptions(isDark, 'Cash Flow Analysis');

		return {
			type: 'bar' as const,
			data: {
				labels,
				datasets: [
					{
						label: 'Operating',
						data: reversed.map((d) => d.operatingCashFlow),
						backgroundColor: reversed.map((d) =>
							d.operatingCashFlow >= 0
								? createGradient(mainCanvas, '#0d7a3e', '#0d7a3e80')
								: createGradient(mainCanvas, '#c41e3a', '#c41e3a80')
						),
						borderColor: reversed.map((d) =>
							d.operatingCashFlow >= 0 ? '#0d7a3e' : '#c41e3a'
						),
						borderWidth: 0,
						borderRadius: 4
					},
					{
						label: 'Investing',
						data: reversed.map((d) => d.investingCashFlow),
						backgroundColor: reversed.map((d) =>
							d.investingCashFlow >= 0
								? 'rgba(13, 122, 62, 0.5)'
								: 'rgba(196, 30, 58, 0.5)'
						),
						borderColor: reversed.map((d) =>
							d.investingCashFlow >= 0 ? '#0d7a3e' : '#c41e3a'
						),
						borderWidth: 1,
						borderRadius: 4
					},
					{
						label: 'Financing',
						data: reversed.map((d) => d.financingCashFlow),
						backgroundColor: reversed.map((d) =>
							d.financingCashFlow >= 0
								? 'rgba(0, 102, 204, 0.7)'
								: 'rgba(139, 92, 246, 0.7)'
						),
						borderColor: reversed.map((d) =>
							d.financingCashFlow >= 0 ? '#0066cc' : '#8b5cf6'
						),
						borderWidth: 0,
						borderRadius: 4
					}
				]
			},
			options
		};
	}

	// Secondary chart: Free Cash Flow trend
	function createFCFChart(isDark: boolean) {
		const reversed = [...(data as CashFlowData[])].reverse();
		const labels = getLabels(data);
		const textColor = isDark ? '#e8e8e0' : '#1a1a1a';

		return {
			type: 'line' as const,
			data: {
				labels,
				datasets: [
					{
						label: 'Free Cash Flow',
						data: reversed.map((d) => d.freeCashFlow),
						borderColor: '#10b981',
						backgroundColor: 'rgba(16, 185, 129, 0.2)',
						borderWidth: 3,
						fill: true,
						tension: 0.4,
						pointRadius: 6,
						pointBackgroundColor: reversed.map((d) =>
							d.freeCashFlow >= 0 ? '#10b981' : '#ef4444'
						),
						pointBorderColor: isDark ? '#1e1e1e' : '#ffffff',
						pointBorderWidth: 2,
						pointHoverRadius: 8
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					title: {
						display: true,
						text: 'Free Cash Flow Trend',
						color: textColor,
						font: { family: "'IBM Plex Mono', monospace", size: 11, weight: 600 },
						align: 'start' as const
					},
					tooltip: {
						backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
						titleColor: textColor,
						bodyColor: textColor,
						borderColor: isDark ? '#3d3d3d' : '#aaaaaa',
						borderWidth: 1,
						callbacks: {
							label: (ctx: any) => `FCF: ${formatBillions(ctx.parsed.y)}`
						}
					}
				},
				scales: {
					x: { display: false },
					y: {
						ticks: {
							color: textColor,
							font: { family: "'IBM Plex Mono', monospace", size: 9 },
							callback: (v: any) => formatBillions(v)
						},
						grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
					}
				}
			}
		};
	}

	function createGradient(canvas: HTMLCanvasElement, color1: string, color2: string) {
		const ctx = canvas?.getContext('2d');
		if (!ctx) return color1;
		const gradient = ctx.createLinearGradient(0, 0, 0, 250);
		gradient.addColorStop(0, color1);
		gradient.addColorStop(1, color2);
		return gradient;
	}

	function createCharts() {
		if (!mainCanvas || data.length === 0) return;

		const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

		if (mainChart) mainChart.destroy();
		if (secondaryChart) secondaryChart.destroy();

		let config;
		if (type === 'income') {
			config = createIncomeChart(isDark);
		} else if (type === 'balance') {
			config = createBalanceChart(isDark);
		} else {
			config = createCashFlowChart(isDark);
		}

		mainChart = new Chart(mainCanvas, config as any);

		// Create secondary FCF chart for cash flow tab
		if (type === 'cashflow' && secondaryCanvas) {
			const fcfConfig = createFCFChart(isDark);
			secondaryChart = new Chart(secondaryCanvas, fcfConfig as any);
		}
	}

	$effect(() => {
		if (data && data.length > 0) {
			createCharts();
		}
	});

	onMount(() => {
		if (data && data.length > 0) {
			setTimeout(createCharts, 100);
		}
	});

	onDestroy(() => {
		if (mainChart) mainChart.destroy();
		if (secondaryChart) secondaryChart.destroy();
	});
</script>

<div class="chart-section">
	{#if data.length === 0}
		<div class="no-data">No data available for visualization</div>
	{:else}
		<div class="charts-wrapper" class:with-secondary={type === 'cashflow'}>
			<div class="main-chart">
				<canvas bind:this={mainCanvas}></canvas>
			</div>
			{#if type === 'cashflow'}
				<div class="secondary-chart">
					<canvas bind:this={secondaryCanvas}></canvas>
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

	canvas {
		width: 100% !important;
		height: 100% !important;
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
