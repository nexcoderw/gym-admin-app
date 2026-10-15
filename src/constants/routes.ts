export const routes = {
	home: '/',
	login: '/login',
	verification: '/verification',
	dashboard: '/dashboard',
	organizations: '/organizations',
	unauthorized: '/401',
	forbidden: '/403',
	notFound: '/404',
	rateLimited: '/429',
	serverError: '/500',
	unavailable: '/503',
} as const;

/** Browser-owned paths only. Upstream paths must never enter this registry. */
export const browserApi = {
	login: '/api/auth/login',
	verifyMfa: '/api/auth/mfa/verify',
	sendEmailOtp: '/api/auth/mfa/email',
	session: '/api/auth/session',
	logout: '/api/auth/logout',
	summary: '/api/dashboard/summary',
	organizations: '/api/organizations',
	organization: (id: string): `/api/${string}` => `/api/organizations/${encodeURIComponent(id)}`,
	activateOrganization: (id: string): `/api/${string}` => `/api/organizations/${encodeURIComponent(id)}/activation`,
	suspendOrganization: (id: string): `/api/${string}` => `/api/organizations/${encodeURIComponent(id)}/suspension`,
} as const;
