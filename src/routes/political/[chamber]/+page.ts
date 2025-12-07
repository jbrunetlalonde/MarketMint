import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export type Chamber = 'house' | 'senate';

const VALID_CHAMBERS: Chamber[] = ['house', 'senate'];

export interface ChamberConfig {
	chamber: Chamber;
	title: string;
	titlePlural: string;
	titleFilter: string[];
	pageTitle: string;
	description: string;
}

const CHAMBER_CONFIG: Record<Chamber, ChamberConfig> = {
	house: {
		chamber: 'house',
		title: 'Representative',
		titlePlural: 'Representatives',
		titleFilter: ['representative', 'rep.'],
		pageTitle: 'House Trading Activity',
		description: 'Track stock trades made by U.S. Representatives. Data sourced from public STOCK Act filings.'
	},
	senate: {
		chamber: 'senate',
		title: 'Senator',
		titlePlural: 'Senators',
		titleFilter: ['senator'],
		pageTitle: 'Senate Trading Activity',
		description: 'Track stock trades made by U.S. Senators. Data sourced from public STOCK Act filings.'
	}
};

export const load: PageLoad = ({ params }) => {
	const chamber = params.chamber as Chamber;

	if (!VALID_CHAMBERS.includes(chamber)) {
		error(404, 'Invalid chamber. Use /political/house or /political/senate');
	}

	return {
		config: CHAMBER_CONFIG[chamber]
	};
};
