/**
 * URL utilities for handling asset paths across environments
 */

/**
 * Get the base URL for portrait images
 * Uses VITE_PORTRAIT_BASE env var in production, defaults to localhost:3001 in dev
 * Portraits are served from the backend API server at /portraits
 */
export function getPortraitBase(): string {
	if (typeof window !== 'undefined') {
		// Client-side: check for env var or use API base
		return import.meta.env.VITE_PORTRAIT_BASE || 'http://localhost:3001';
	}
	// Server-side
	return import.meta.env.VITE_PORTRAIT_BASE || 'http://localhost:3001';
}

/**
 * Get full URL for a portrait image
 * @param path - The portrait path (e.g., "/portraits/ceo-tim-cook.png")
 */
export function getPortraitUrl(path: string | null | undefined): string {
	if (!path) return '';
	const base = getPortraitBase();
	// Handle paths that already start with http
	if (path.startsWith('http')) return path;
	// Ensure path starts with /
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${base}${normalizedPath}`;
}

/**
 * Get portrait URL for a CEO by name
 * @param name - CEO name (e.g., "Tim Cook")
 */
export function getCeoPortraitUrl(name: string): string {
	const filename = `ceo-${name.toLowerCase().replace(/\s+/g, '-')}.png`;
	return getPortraitUrl(`/portraits/${filename}`);
}

// Common nickname mappings for first names
const NICKNAME_MAP: Record<string, string> = {
	thomas: 'tom',
	william: 'bill',
	richard: 'rick',
	robert: 'bob',
	james: 'jim',
	michael: 'mike',
	christopher: 'chris',
	daniel: 'dan',
	benjamin: 'ben',
	joseph: 'joe',
	steven: 'steve',
	stephen: 'steve',
	timothy: 'tim',
	gregory: 'greg',
	anthony: 'tony',
	nicholas: 'nick',
	kenneth: 'ken',
	edward: 'ed',
	theodore: 'ted',
	gerald: 'jerry',
	lawrence: 'larry',
	raymond: 'ray',
	francis: 'frank',
	charles: 'chuck',
	elizabeth: 'liz',
	jennifer: 'jen',
	katherine: 'kate',
	catherine: 'cathy',
	jacqueline: 'jackie',
	margaret: 'peggy',
	patricia: 'pat',
	deborah: 'debbie',
	cynthia: 'cindy',
	virginia: 'ginny',
	suzanne: 'suzy'
};

/**
 * Normalize a Congress member name to match portrait filename convention
 * Handles middle initials, suffixes, and nicknames
 * Uses full name approach but removes single-letter initials
 * "Adam B Schiff" -> "adam-schiff"
 * "Shelley Moore Capito" -> "shelley-moore-capito"
 * "John W. Hickenlooper" -> "john-hickenlooper"
 * "James Conley Justice, II" -> "james-conley-justice"
 */
function normalizeCongressName(name: string): string {
	// Remove content in quotes (nicknames)
	let cleaned = name.replace(/"[^"]*"/g, '').replace(/\([^)]*\)/g, '');

	// Remove common suffixes
	cleaned = cleaned.replace(/,?\s*(Jr\.?|Sr\.?|II|III|IV|Hon\.?|Dr\.?)$/gi, '');

	// Split into parts and filter out empty
	const parts = cleaned.trim().split(/\s+/).filter(Boolean);

	if (parts.length === 0) return name.toLowerCase().replace(/\s+/g, '-');

	// Filter out single-letter initials (like B., W., S.)
	const nameParts = parts.filter((part) => {
		// Keep parts that are longer than 2 chars or don't look like initials
		return part.length > 2 || !/^[A-Z]\.?$/.test(part);
	});

	// Clean each part and join with hyphens
	const result = nameParts
		.map((part, index) => {
			const cleaned = part.toLowerCase().replace(/[^a-z-]/g, '');
			// Apply nickname mapping only to first name
			if (index === 0 && NICKNAME_MAP[cleaned]) {
				return NICKNAME_MAP[cleaned];
			}
			return cleaned;
		})
		.filter(Boolean)
		.join('-');

	return result;
}

/**
 * Get portrait URL for a Congress member
 * @param name - Member name (e.g., "Nancy Pelosi")
 * @param chamber - "senate" or "house"
 */
export function getCongressPortraitUrl(name: string, chamber: 'senate' | 'house'): string {
	const filename = normalizeCongressName(name);
	return getPortraitUrl(`/portraits/${chamber}-${filename}.png`);
}

/**
 * Get DiceBear avatar URL as fallback for missing portraits
 * @param name - Person's name to generate avatar from
 * @param backgroundColor - Background color hex (without #)
 */
export function getAvatarFallback(name: string, backgroundColor: string = '374151'): string {
	return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=${backgroundColor}`;
}

/**
 * Get company logo URL from FMP
 * @param symbol - Stock ticker symbol
 */
export function getCompanyLogoUrl(symbol: string): string {
	return `https://financialmodelingprep.com/image-stock/${symbol.toUpperCase()}.png`;
}

/**
 * Format relative time for "Last updated" displays
 * @param date - Date to format
 */
export function formatRelativeTime(date: Date | string | number): string {
	const now = new Date();
	const then = new Date(date);
	const diffMs = now.getTime() - then.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);

	if (diffSec < 10) return 'just now';
	if (diffSec < 60) return `${diffSec}s ago`;
	if (diffMin < 60) return `${diffMin}m ago`;
	if (diffHour < 24) return `${diffHour}h ago`;
	return then.toLocaleDateString();
}
