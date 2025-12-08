<script lang="ts">
	import { Chart, registerables } from 'chart.js';

	// Register all Chart.js components
	Chart.register(...registerables);

	interface Props {
		data: Array<{ date: string; close: number }>;
		label?: string;
		color?: string;
		height?: number;
	}

	let { data, label = 'Price', color = '#0066cc', height = 300 }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	const chartData = $derived({
		labels: data.map((d) => {
			const date = new Date(d.date);
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}),
		datasets: [
			{
				label,
				data: data.map((d) => d.close),
				borderColor: color,
				backgroundColor: `${color}20`,
				fill: true,
				tension: 0.1,
				pointRadius: 0,
				pointHoverRadius: 4,
				borderWidth: 2
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
			type: 'line',
			data: chartData,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					intersect: false,
					mode: 'index'
				},
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
								const value = context.parsed.y;
								return value !== null ? `$${value.toFixed(2)}` : '--';
							}
						}
					}
				},
				scales: {
					x: {
						display: true,
						grid: {
							display: false
						},
						ticks: {
							font: {
								family: "'IBM Plex Mono', monospace",
								size: 10
							},
							maxTicksLimit: 8
						}
					},
					y: {
						display: true,
						position: 'right',
						grid: {
							color: '#e5e5e5'
						},
						ticks: {
							font: {
								family: "'IBM Plex Mono', monospace",
								size: 10
							},
							callback: (value) => `$${value}`
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
