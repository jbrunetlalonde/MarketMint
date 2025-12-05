/**
 * Format a number as currency
 */
export function formatCurrency(
	value: number,
	currency = 'USD',
	minimumFractionDigits = 2
): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits,
		maximumFractionDigits: minimumFractionDigits
	}).format(value);
}

/**
 * Format a number with commas
 */
export function formatNumber(value: number, decimals = 0): string {
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}

/**
 * Format a large number with abbreviations (K, M, B, T)
 */
export function formatCompact(value: number): string {
	if (value >= 1_000_000_000_000) {
		return `${(value / 1_000_000_000_000).toFixed(2)}T`;
	}
	if (value >= 1_000_000_000) {
		return `${(value / 1_000_000_000).toFixed(2)}B`;
	}
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(2)}M`;
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(2)}K`;
	}
	return value.toFixed(2);
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals = 2): string {
	const sign = value >= 0 ? '+' : '';
	return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format a date
 */
export function formatDate(
	date: Date | string,
	options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	}
): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString('en-US', options);
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSecs < 60) return 'just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;

	return formatDate(d);
}

/**
 * Validate ticker symbol format
 */
export function isValidTicker(ticker: string): boolean {
	return /^[A-Z]{1,5}$/.test(ticker.toUpperCase());
}

/**
 * Get price change class
 */
export function getPriceClass(value: number): string {
	if (value > 0) return 'price-positive';
	if (value < 0) return 'price-negative';
	return 'price-neutral';
}
