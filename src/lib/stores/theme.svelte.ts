type Theme = 'light' | 'dark' | 'system';

function createThemeStore() {
	let theme = $state<Theme>('system');
	let resolvedTheme = $state<'light' | 'dark'>('light');

	function getSystemPreference(): 'light' | 'dark' {
		if (typeof window === 'undefined') return 'light';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function applyTheme() {
		if (typeof window === 'undefined') return;

		const isDark =
			theme === 'dark' || (theme === 'system' && getSystemPreference() === 'dark');
		document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
		resolvedTheme = isDark ? 'dark' : 'light';
	}

	function setTheme(newTheme: Theme) {
		theme = newTheme;
		if (typeof window !== 'undefined') {
			localStorage.setItem('theme', newTheme);
		}
		applyTheme();
	}

	function initialize() {
		if (typeof window === 'undefined') return;

		// Load saved theme
		const stored = localStorage.getItem('theme') as Theme | null;
		if (stored && ['light', 'dark', 'system'].includes(stored)) {
			theme = stored;
		}

		// Apply initial theme
		applyTheme();

		// Listen for system preference changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', () => {
			if (theme === 'system') {
				applyTheme();
			}
		});
	}

	return {
		get theme() {
			return theme;
		},
		get resolvedTheme() {
			return resolvedTheme;
		},
		setTheme,
		initialize,
		toggle: () => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
	};
}

export const themeStore = createThemeStore();
