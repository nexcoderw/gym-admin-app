import 'server-only';

import { cache } from 'react';

import { sessionSchema } from '@/lib/contracts/auth';
import { serverEnvironment } from '../../environment';
import { BffError } from '../../http/errors';
import { upstream, type ForwardContext } from '../../http/upstream';

/** Request-scoped RSC deduplication only; no cross-request authentication cache. */
const readSession = cache(async (cookie: string) => {
	const name = serverEnvironment().sessionCookie;
	if (!cookie.split('; ').some((part) => part.startsWith(`${name}=`)))
		throw new BffError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.');
	const result = await upstream(
		'/api/v1/platform/auth/session',
		'GET',
		sessionSchema,
		{ cookie },
		undefined,
		200,
		{ policy: 'resilient-read' },
	);
	if (result.cookies.length > 0)
		throw new BffError(
			502,
			'INVALID_SERVICE_RESPONSE',
			'Authentication is temporarily unavailable.',
		);
	if (Date.parse(result.data.expiresAt) <= Date.now())
		throw new BffError(401, 'AUTHENTICATION_REQUIRED', 'Sign in again.');
	return result.data;
});

/** Nest PlatformAuthController.getSession; only safe server-established session fields return. */
export function getSession(context: ForwardContext) {
	return readSession(context.cookie);
}
