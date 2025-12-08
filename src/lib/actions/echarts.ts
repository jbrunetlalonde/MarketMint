import * as echarts from 'echarts';
import type { EChartsOption, ECharts } from 'echarts';

export interface EChartsActionOptions {
	options: EChartsOption;
	theme?: 'light' | 'dark';
}

export function echart(node: HTMLElement, { options, theme = 'light' }: EChartsActionOptions) {
	const chart = echarts.init(node, theme === 'dark' ? 'dark' : undefined, {
		renderer: 'canvas'
	});

	chart.setOption(options);

	const resizeObserver = new ResizeObserver(() => {
		chart.resize();
	});
	resizeObserver.observe(node);

	return {
		update({ options: newOptions, theme: newTheme }: EChartsActionOptions) {
			if (newTheme !== theme) {
				chart.dispose();
				const newChart = echarts.init(node, newTheme === 'dark' ? 'dark' : undefined, {
					renderer: 'canvas'
				});
				newChart.setOption(newOptions);
			} else {
				chart.setOption(newOptions, { notMerge: true });
			}
		},
		destroy() {
			resizeObserver.disconnect();
			chart.dispose();
		}
	};
}

export function getEChartsInstance(node: HTMLElement): ECharts | undefined {
	return echarts.getInstanceByDom(node);
}
