import { request } from './request';

export const newsletterApi = {
	subscribeNewsletter: (email: string, name?: string) =>
		request<{ message: string }>('/api/newsletter/subscribe', {
			method: 'POST',
			body: JSON.stringify({ email, name })
		}),

	unsubscribeNewsletter: (token: string) =>
		request<{ message: string }>('/api/newsletter/unsubscribe', {
			method: 'POST',
			body: JSON.stringify({ token })
		})
};
