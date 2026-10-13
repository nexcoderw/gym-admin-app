import 'server-only';

import type { z } from 'zod';

import { serverEnvironment } from '../environment';
import { BffError, upstreamFailure } from './errors';
import { boundedJson } from './json';

export interface ForwardContext {
	readonly cookie: string;
	readonly csrf?: string;
}

/** Fixed endpoint modules alone supply paths. No request URLs or arbitrary headers are forwarded. */
export async function upstream<T>(
	path: `/api/v1/platform/${string}`,
	method: 'GET' | 'POST',
	schema: z.ZodType<T>,
	context: ForwardContext,
	body?: unknown,
	expectedStatus: 200 | 204 = 200,
): Promise<{ data: T; cookies: string[] }> {
	const env = serverEnvironment();
	try {
		const response = await fetch(new URL(path, env.apiOrigin), {
			method,
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(10_000),
			headers: {
				Accept: 'application/json',
				Origin: env.adminOrigin,
				...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
				...(context.cookie ? { Cookie: context.cookie } : {}),
				...(context.csrf ? { 'x-platform-csrf-token': context.csrf } : {}),
			},
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		});
		if (!response.ok) {
			await response.body?.cancel();
			throw upstreamFailure(response.status);
		}
		if (response.status !== expectedStatus) {
			await response.body?.cancel();
			throw new BffError(
				502,
				'INVALID_SERVICE_RESPONSE',
				'The service returned an incompatible response.',
			);
		}
		if (
			response.status !== 204 &&
			response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
				'application/json'
		) {
			await response.body?.cancel();
			throw new BffError(
				502,
				'INVALID_SERVICE_RESPONSE',
				'The service returned an incompatible response.',
			);
		}
		const json: unknown =
			response.status === 204 ? undefined : await boundedJson(response.body, 65_536);
		const parsed = schema.safeParse(json);
		if (!parsed.success)
			throw new BffError(
				502,
				'INVALID_SERVICE_RESPONSE',
				'The service returned an incompatible response.',
			);
		return { data: parsed.data, cookies: response.headers.getSetCookie() };
	} catch (error) {
		if (error instanceof BffError && error.status !== 413 && error.code !== 'INVALID_INPUT')
			throw error;
		throw new BffError(502, 'SERVICE_UNAVAILABLE', 'The service is unavailable. Try again.');
	}
}
