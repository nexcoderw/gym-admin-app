import 'server-only';

import { BffError } from './http/errors';

/** Never infer an approved upstream or Origin from untrusted request headers. */
export function serverEnvironment() {
	const secure = process.env.NODE_ENV === 'production';
	function readOrigin(name: 'GYM_API_BASE_URL' | 'ADMIN_ORIGIN'): string {
		try {
			const raw = process.env[name];
			if (!raw) throw new Error();
			const url = new URL(raw);
			const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
			if (url.username || url.password || url.pathname !== '/' || url.search || url.hash)
				throw new Error();
			if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local && !secure))
				throw new Error();
			return url.origin;
		} catch {
			throw new BffError(
				503,
				'CONFIGURATION_UNAVAILABLE',
				'Administration is not configured. Contact your operator.',
			);
		}
	}
	return {
		apiOrigin: readOrigin('GYM_API_BASE_URL'),
		adminOrigin: readOrigin('ADMIN_ORIGIN'),
		secure,
		sessionCookie: secure ? '__Host-nexcode-platform-session' : 'nexcode-platform-session',
		csrfCookie: secure ? '__Host-nexcode-platform-csrf' : 'nexcode-platform-csrf',
	};
}
