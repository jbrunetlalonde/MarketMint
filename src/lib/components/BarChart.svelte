<script lang="ts">
	import { Chart, registerables } from 'chart.js';

	// Register all Chart.js components
	Chart.register(...registerables);

	interface DataPoint {
		label: string;
		value: number;
	}

	interface Props {
		data: DataPoint[];
		label?: string;
		color?: string;
		height?: number;
		horizontal?: boolean;
		formatValue?: (value: number) => string;
	}

	let {
		data,
		label = 'Value',
		color = '#0066cc',
		height = 200,
		horizontal = false,
		formatValue = (v: number) => v.toLocaleString()
	}: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	const chartData = $derived({
		labels: data.map((d) => d.label),
		datasets: [
			{
				label,
				data: data.map((d) => d.value),
				backgroundColor: data.map((d) => (d.value >= 0 ? '#0066cc' : '#cc0000')),
				borderColor: data.map((d) => (d.value >= 0 ? '#0055aa' : '#aa0000')),
				borderWidth: 1,
				borderRadius: 2
			}
		]
	});

	$effect(() => {
		if (!canvas) return;

		// Destroy existing chart
		if (chart) {
			chart.destroy();
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		chart = new Chart(ctx, {
			type: 'bar',
			data: chartData,
			options: {
				indexAxis: horizontal ? 'y' : 'x',
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						backgroundColor: '#1a1a1a',
						titleFont: {
							family: "'IBM Plex Mono', monospace"
						},
						bodyFont: {
							family: "'IBM Plex Mono', monospace"
						},
						callbacks: {
							label: (context) => {
								const value = context.parsed[horizontal ? 'x' : 'y'];
								return formatValue(value ?? 0);
							}
						}
					}
				},
				scales: {
					x: {
						type: horizontal ? 'linear' : 'category',
						display: true,
						grid: {
							display: horizontal
						},
						ticks: {
							font: {
								family: "'IBM Plex Mono', monospace",
								size: 11
							},
							color: '#333',
							callback: horizontal
								? (value) => {
										if (typeof value === 'number') {
											return formatValue(value);
										}
										return value;
									}
								: undefined
						}
					},
					y: {
						display: true,
						grid: {
							display: !horizontal,
							color: '#e5e5e5'
						},
						ticks: {
							font: {
								family: "'IBM Plex Mono', monospace",
								size: 10
							},
							callback: !horizontal
								? (value) => {
										if (typeof value === 'number') {
											return formatValue(value);
										}
										return value;
									}
								: undefined
						}
					}
				}
			}
		});

		return () => {
			if (chart) {
				chart.destroy();
				chart = null;
			}
		};
	});
</script>

<div class="chart-container" style="height: {height}px;">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-container {
		position: relative;
		width: 100%;
	}
</style>
