import 'server-only';

import type { z } from 'zod';

import { serverEnvironment } from '../environment';
import { assertCsrf, forwardedCookies, platformCookies } from './cookies';
import { BffError } from './errors';
import { boundedJson } from './json';
import type { ForwardContext } from './upstream';

/** Run before reading or forwarding browser mutation data. */
export function mutationContext(request: Request, csrfRequired: boolean): ForwardContext {
	const env = serverEnvironment();
	if (request.headers.get('origin') !== env.adminOrigin)
		throw new BffError(403, 'ORIGIN_REJECTED', 'This request origin is not allowed.');
	const cookieHeader = request.headers.get('cookie');
	const csrf = request.headers.get('x-platform-csrf-token');
	if (csrfRequired) assertCsrf(csrf, platformCookies(cookieHeader).get(env.csrfCookie));
	return { cookie: forwardedCookies(cookieHeader), ...(csrfRequired && csrf ? { csrf } : {}) };
}

export function readContext(request: Request): ForwardContext {
	const origin = request.headers.get('origin');
	if (origin !== null && origin !== serverEnvironment().adminOrigin)
		throw new BffError(403, 'ORIGIN_REJECTED', 'This request origin is not allowed.');
	return { cookie: forwardedCookies(request.headers.get('cookie')) };
}

export async function requestBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
	if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json')
		throw new BffError(415, 'JSON_REQUIRED', 'Send an application/json request.');
	const parsed = schema.safeParse(await boundedJson(request.body, 8192));
	if (!parsed.success)
		throw new BffError(400, 'INVALID_INPUT', 'Check the supplied details and try again.');
	return parsed.data;
}
