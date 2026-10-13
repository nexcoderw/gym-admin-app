import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { routes } from '@/constants/routes';
import { getSession } from './endpoints/auth/get-session';
import { forwardedCookies } from './http/cookies';
import { BffError } from './http/errors';

export const serverContext = cache(async () => {
	const jar = await cookies();
	return { cookie: forwardedCookies(jar.toString()) };
});

/** Page guards are supplementary: each BFF operation also authenticates independently. */
export const requirePlatformSession = cache(async () => {
	try {
		return await getSession(await serverContext());
	} catch (error) {
		if (error instanceof BffError && error.status === 401) redirect(routes.login);
		throw error;
	}
});

/** Authentication pages render only after Nest confirms there is no usable platform session. */
export const requireAnonymousSession = cache(async (): Promise<void> => {
	try {
		await getSession(await serverContext());
	} catch (error) {
		if (error instanceof BffError && error.status === 401) return;
		throw error;
	}
	// Next redirects throw; keep this outside the authentication error handler.
	redirect(routes.dashboard);
});
