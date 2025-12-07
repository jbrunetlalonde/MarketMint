import { request } from './request';

export const authApi = {
	login: (email: string, password: string) =>
		request<{
			user: { id: string; username: string; email: string; role: string };
			accessToken: string;
			refreshToken: string;
		}>('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password })
		}),

	register: (username: string, email: string, password: string) =>
		request<{
			user: { id: string; username: string; email: string; role: string };
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
		request<{ user: { id: string; username: string; email: string; role: string } }>(
			'/api/auth/me',
			{ token }
		)
};
