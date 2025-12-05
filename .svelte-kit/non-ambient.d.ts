
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
		RouteId(): "/" | "/analysis" | "/auth" | "/auth/login" | "/auth/register" | "/newsletter" | "/political" | "/ticker" | "/ticker/[symbol]" | "/watchlist";
		RouteParams(): {
			"/ticker/[symbol]": { symbol: string }
		};
		LayoutParams(): {
			"/": { symbol?: string };
			"/analysis": Record<string, never>;
			"/auth": Record<string, never>;
			"/auth/login": Record<string, never>;
			"/auth/register": Record<string, never>;
			"/newsletter": Record<string, never>;
			"/political": Record<string, never>;
			"/ticker": { symbol?: string };
			"/ticker/[symbol]": { symbol: string };
			"/watchlist": Record<string, never>
		};
		Pathname(): "/" | "/analysis" | "/analysis/" | "/auth" | "/auth/" | "/auth/login" | "/auth/login/" | "/auth/register" | "/auth/register/" | "/newsletter" | "/newsletter/" | "/political" | "/political/" | "/ticker" | "/ticker/" | `/ticker/${string}` & {} | `/ticker/${string}/` & {} | "/watchlist" | "/watchlist/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | string & {};
	}
}