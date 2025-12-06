
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/alerts" | "/analysis" | "/auth" | "/auth/login" | "/auth/register" | "/economic" | "/markets" | "/newsletter" | "/political" | "/political/member" | "/political/member/[name]" | "/portfolio" | "/ticker" | "/ticker/[symbol]" | "/watchlist";
		RouteParams(): {
			"/political/member/[name]": { name: string };
			"/ticker/[symbol]": { symbol: string }
		};
		LayoutParams(): {
			"/": { name?: string; symbol?: string };
			"/alerts": Record<string, never>;
			"/analysis": Record<string, never>;
			"/auth": Record<string, never>;
			"/auth/login": Record<string, never>;
			"/auth/register": Record<string, never>;
			"/economic": Record<string, never>;
			"/markets": Record<string, never>;
			"/newsletter": Record<string, never>;
			"/political": { name?: string };
			"/political/member": { name?: string };
			"/political/member/[name]": { name: string };
			"/portfolio": Record<string, never>;
			"/ticker": { symbol?: string };
			"/ticker/[symbol]": { symbol: string };
			"/watchlist": Record<string, never>
		};
		Pathname(): "/" | "/alerts" | "/alerts/" | "/analysis" | "/analysis/" | "/auth" | "/auth/" | "/auth/login" | "/auth/login/" | "/auth/register" | "/auth/register/" | "/economic" | "/economic/" | "/markets" | "/markets/" | "/newsletter" | "/newsletter/" | "/political" | "/political/" | "/political/member" | "/political/member/" | `/political/member/${string}` & {} | `/political/member/${string}/` & {} | "/portfolio" | "/portfolio/" | "/ticker" | "/ticker/" | `/ticker/${string}` & {} | `/ticker/${string}/` & {} | "/watchlist" | "/watchlist/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | "/market_mint.png" | "/portraits/ceo-elon-musk.png" | "/portraits/ceo-mark-zuckerberg.png" | "/portraits/ceo-satya-nadella.png" | "/portraits/ceo-sundar-pichai.png" | "/portraits/ceo-tim-cook.png" | "/portraits/house-alexandria-ocasio-cortez.png" | "/portraits/house-kevin-mccarthy.png" | "/portraits/senate-chuck-schumer.png" | "/portraits/senate-mitch-mcconnell.png" | "/robots.txt" | string & {};
	}
}