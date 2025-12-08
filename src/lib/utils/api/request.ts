import { env } from '$env/dynamic/public';

export const API_BASE = env.PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiOptions extends RequestInit {
	token?: string;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: {
		message: string;
		details?: unknown;
	};
}

export async function request<T>(
	endpoint: string,
	options: ApiOptions = {}
): Promise<ApiResponse<T>> {
	const { token, ...fetchOptions } = options;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	try {
		const response = await fetch(`${API_BASE}${endpoint}`, {
			...fetchOptions,
			headers
		});

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.error || { message: 'Request failed' }
			};
		}

		return data;
	} catch (err) {
		return {
			success: false,
			error: {
				message: err instanceof Error ? err.message : 'Network error'
			}
		};
	}
}
