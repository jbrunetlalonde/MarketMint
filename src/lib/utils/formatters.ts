/**
 * Format a number as currency
 */
export function formatCurrency(
	value: number | null | undefined,
	currency = 'USD',
	minimumFractionDigits = 2
): string {
	if (value == null) return '--';
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
export function formatNumber(value: number | null | undefined, decimals = 0): string {
	if (value == null) return '--';
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}

/**
 * Format a large number with abbreviations (K, M, B, T)
 */
export function formatCompact(value: number | null | undefined): string {
	if (value == null) return '--';

	const abs = Math.abs(value);
	const sign = value < 0 ? '-' : '';

	if (abs >= 1_000_000_000_000) {
		return `${sign}${(abs / 1_000_000_000_000).toFixed(2)}T`;
	}
	if (abs >= 1_000_000_000) {
		return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
	}
	if (abs >= 1_000_000) {
		return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
	}
	if (abs >= 1_000) {
		return `${sign}${(abs / 1_000).toFixed(2)}K`;
	}
	return value.toFixed(2);
}

/**
 * Format a percentage
 * @param value - The percentage value (already multiplied by 100)
 * @param decimals - Number of decimal places
 * @param showSign - Whether to show + sign for positive values (default: true for changes, false for static values)
 */
export function formatPercent(value: number | null | undefined, decimals = 2, showSign = true): string {
	if (value == null) return '--';
	const sign = showSign && value > 0 ? '+' : '';
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
export function getPriceClass(value: number | null | undefined): string {
	if (value == null) return 'price-neutral';
	if (value > 0) return 'price-positive';
	if (value < 0) return 'price-negative';
	return 'price-neutral';
}

/**
 * Format market cap with abbreviations
 */
export function formatMarketCap(value: number | null | undefined): string {
	if (value == null) return '--';
	if (value >= 1_000_000_000_000) {
		return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
	}
	if (value >= 1_000_000_000) {
		return `$${(value / 1_000_000_000).toFixed(2)}B`;
	}
	if (value >= 1_000_000) {
		return `$${(value / 1_000_000).toFixed(2)}M`;
	}
	if (value >= 1_000) {
		return `$${(value / 1_000).toFixed(0)}K`;
	}
	return `$${value.toFixed(0)}`;
}

/**
 * Format CEO/executive name by removing titles and middle initials
 * "Mr. Elon R. Musk" -> "Elon Musk"
 * "Ms. Mary T. Barra" -> "Mary Barra"
 */
export function formatExecutiveName(name: string | null | undefined): string {
	if (!name) return '';

	// Remove common titles
	let cleaned = name
		.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sir|Dame)\s+/i, '')
		.trim();

	// Split into parts and remove middle initials (single letters followed by period)
	const parts = cleaned.split(/\s+/);
	const filtered = parts.filter(part => {
		// Keep if not a single letter or single letter with period
		return !(part.length === 1 || (part.length === 2 && part.endsWith('.')));
	});

	return filtered.join(' ');
}
