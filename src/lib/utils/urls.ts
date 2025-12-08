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
		return import.meta.env.VITE_PORTRAIT_BASE || 'http://localhost:5001';
	}
	// Server-side
	return import.meta.env.VITE_PORTRAIT_BASE || 'http://localhost:5001';
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

/**
 * Get portrait URL for a Congress member
 * @param name - Member name (e.g., "Nancy Pelosi")
 * @param chamber - "senate" or "house"
 */
export function getCongressPortraitUrl(name: string, chamber: 'senate' | 'house'): string {
	const filename = name.toLowerCase().replace(/\s+/g, '-');
	return getPortraitUrl(`/portraits/${chamber}-${filename}.png`);
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
