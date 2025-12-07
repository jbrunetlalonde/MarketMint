/**
 * Political utility functions shared across components
 */

export function getPartyAbbrev(party?: string | null): string {
	if (!party) return '?';
	const p = party.toLowerCase();
	if (p.includes('democrat')) return 'D';
	if (p.includes('republican')) return 'R';
	return party.charAt(0).toUpperCase();
}

export function getPartyClass(party?: string | null): string {
	if (!party) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
	const p = party.toLowerCase();
	if (p.includes('democrat')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
	if (p.includes('republican')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
	return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

export function getInitials(name: string): string {
	return name
		.split(' ')
		.map((n) => n.charAt(0))
		.join('')
		.toUpperCase()
		.slice(0, 2);
}
