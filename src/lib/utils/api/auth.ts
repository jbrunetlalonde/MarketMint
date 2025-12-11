import { request } from './request';

interface UserResponse {
	id: string;
	username: string;
	email: string;
	role: string;
	hasCompletedOnboarding: boolean;
}

export const authApi = {
	login: (email: string, password: string) =>
		request<{
			user: UserResponse;
			accessToken: string;
			refreshToken: string;
		}>('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password })
		}),

	register: (username: string, email: string, password: string) =>
		request<{
			user: UserResponse;
			accessToken: string;
			refreshToken: string;
		}>('/api/auth/register', {
			method: 'POST',
			body: JSON.stringify({ username, email, password })
		}),

	refresh: (refreshToken: string) =>
		request<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
			method: 'POST',
			body: JSON.stringify({ refreshToken })
		}),

	logout: (token: string, refreshToken: string) =>
		request('/api/auth/logout', {
			method: 'POST',
			token,
			body: JSON.stringify({ refreshToken })
		}),

	getMe: (token: string) =>
		request<{ user: UserResponse }>('/api/auth/me', { token }),

	completeOnboarding: (token: string) =>
		request<{ message: string }>('/api/auth/onboarding/complete', {
			method: 'POST',
			token
		})
};
