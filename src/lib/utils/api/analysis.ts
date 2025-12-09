import { request } from './request';

interface SWOTData {
	ticker: string;
	companyName: string;
	strengths: string[];
	weaknesses: string[];
	opportunities: string[];
	threats: string[];
	cached: boolean;
	generatedAt: string;
}

interface MetricExplanation {
	metric: string;
	value: string | number;
	explanation: string;
}

interface AnalysisStatus {
	available: boolean;
}

export const analysisApi = {
	/**
	 * Get SWOT analysis for a ticker
	 */
	getSWOT: (ticker: string) => {
		return request<SWOTData>(`/api/analysis/${ticker.toUpperCase()}/swot`);
	},

	/**
	 * Force refresh SWOT analysis
	 */
	refreshSWOT: (ticker: string) => {
		return request<SWOTData>(`/api/analysis/${ticker.toUpperCase()}/swot/refresh`, {
			method: 'POST'
		});
	},

	/**
	 * Explain a financial metric
	 */
	explainMetric: (metric: string, value: string | number, context?: { ticker?: string; industry?: string }) => {
		return request<MetricExplanation>('/api/analysis/explain', {
			method: 'POST',
			body: JSON.stringify({ metric, value, ...context })
		});
	},

	/**
	 * Check if AI analysis is available
	 */
	getStatus: () => {
		return request<AnalysisStatus>('/api/analysis/status');
	}
};

export default analysisApi;
