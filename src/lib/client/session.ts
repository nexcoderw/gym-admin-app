import { browserApi } from '@/constants/routes';
import { sessionSchema, type PlatformSession } from '@/lib/contracts/auth';

// The browser must leave headroom for the BFF's bounded resilient session read.
export const SESSION_CONFIRMATION_TIMEOUT_MS = 65_000;

/** Confirm the HttpOnly session through the fixed BFF endpoint, never a browser-held token. */
export async function readLiveSession(): Promise<PlatformSession> {
	let response: Response;
	try {
		response = await fetch(browserApi.session, {
			credentials: 'same-origin',
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(SESSION_CONFIRMATION_TIMEOUT_MS),
		});
	} catch {
		throw new Error('Your session could not be confirmed. Try again.');
	}
	if (response.status !== 200) {
		throw new Error(
			response.status === 401
				? 'Your session expired or was not accepted. Start sign-in again.'
				: response.status === 429
					? 'Too many attempts. Wait before trying again.'
					: 'Your session could not be confirmed. Try again.',
		);
	}
	let value: unknown;
	try {
		value = await response.json();
	} catch {
		throw new Error('The service returned an unexpected session. Try again.');
	}
	const parsed = sessionSchema.safeParse(value);
	if (!parsed.success || Date.parse(parsed.data.expiresAt) <= Date.now()) {
		throw new Error('Your session could not be confirmed. Start sign-in again.');
	}
	return parsed.data;
}
