import { browser } from '$app/environment';
import api from '$lib/utils/api';

interface User {
	id: string;
	username: string;
	email: string;
	role: string;
}

interface AuthState {
	user: User | null;
	accessToken: string | null;
	refreshToken: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}

const STORAGE_KEY = 'marketmint_auth';

function createAuthStore() {
	let state = $state<AuthState>({
		user: null,
		accessToken: null,
		refreshToken: null,
		isAuthenticated: false,
		isLoading: true
	});

	// Load from localStorage on init
	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				state.user = parsed.user;
				state.accessToken = parsed.accessToken;
				state.refreshToken = parsed.refreshToken;
				state.isAuthenticated = !!parsed.accessToken;
			} catch {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
		state.isLoading = false;
	}

	function persist() {
		if (browser) {
			if (state.accessToken) {
				localStorage.setItem(
					STORAGE_KEY,
					JSON.stringify({
						user: state.user,
						accessToken: state.accessToken,
						refreshToken: state.refreshToken
					})
				);
			} else {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	}

	return {
		get user() {
			return state.user;
		},
		get accessToken() {
			return state.accessToken;
		},
		get isAuthenticated() {
			return state.isAuthenticated;
		},
		get isLoading() {
			return state.isLoading;
		},

		async login(email: string, password: string) {
			state.isLoading = true;

			const response = await api.login(email, password);

			if (response.success && response.data) {
				state.user = response.data.user;
				state.accessToken = response.data.accessToken;
				state.refreshToken = response.data.refreshToken;
				state.isAuthenticated = true;
				persist();
				state.isLoading = false;
				return { success: true };
			}

			state.isLoading = false;
			return { success: false, error: response.error?.message || 'Login failed' };
		},

		async register(username: string, email: string, password: string) {
			state.isLoading = true;

			const response = await api.register(username, email, password);

			if (response.success && response.data) {
				state.user = response.data.user;
				state.accessToken = response.data.accessToken;
				state.refreshToken = response.data.refreshToken;
				state.isAuthenticated = true;
				persist();
				state.isLoading = false;
				return { success: true };
			}

			state.isLoading = false;
			return { success: false, error: response.error?.message || 'Registration failed' };
		},

		async logout() {
			if (state.accessToken && state.refreshToken) {
				await api.logout(state.accessToken, state.refreshToken);
			}

			state.user = null;
			state.accessToken = null;
			state.refreshToken = null;
			state.isAuthenticated = false;
			persist();
		},

		async refresh() {
			if (!state.refreshToken) return false;

			const response = await api.refresh(state.refreshToken);

			if (response.success && response.data) {
				state.accessToken = response.data.accessToken;
				state.refreshToken = response.data.refreshToken;
				persist();
				return true;
			}

			// Refresh failed, logout
			this.logout();
			return false;
		}
	};
}

export const auth = createAuthStore();
