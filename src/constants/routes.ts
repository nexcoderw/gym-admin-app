export const routes = {
	home: '/',
	login: '/login',
	dashboard: '/dashboard',
} as const;

/** Browser-owned paths only. Upstream paths must never enter this registry. */
export const browserApi = {
	login: '/api/auth/login',
	verifyMfa: '/api/auth/mfa/verify',
	session: '/api/auth/session',
	logout: '/api/auth/logout',
	summary: '/api/dashboard/summary',
} as const;
