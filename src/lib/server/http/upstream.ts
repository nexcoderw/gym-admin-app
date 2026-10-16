import 'server-only';

import type { z } from 'zod';

import { organizationFailure } from '@/lib/contracts/organizations';
import { ownerInvitationFailure } from '@/lib/contracts/owner-invitations';

import { serverEnvironment } from '../environment';
import { BffError, upstreamFailure } from './errors';
import { boundedJson } from './json';

// Leaves transport headroom beyond the API's 18s total session validation budget.
const UPSTREAM_TIMEOUT_MS = 20_000;

export interface ForwardContext {
	readonly cookie: string;
	readonly csrf?: string;
}

/** Fixed endpoint modules alone supply paths. No request URLs or arbitrary headers are forwarded. */
export async function upstream<T>(
	path: `/api/v1/platform/${string}`,
	method: 'GET' | 'POST' | 'PATCH',
	schema: z.ZodType<T>,
	context: ForwardContext,
	body?: unknown,
	expectedStatus: 200 | 201 | 202 | 204 = 200,
	options?: {
		readonly domain: 'organizations' | 'owner-invitations';
		readonly query?: URLSearchParams;
		readonly ifMatch?: string;
	},
): Promise<{ data: T; cookies: string[]; etag?: string | null }> {
	const env = serverEnvironment();
	try {
		const url = new URL(path, env.apiOrigin);
		if (options?.query) url.search = options.query.toString();
		const response = await fetch(url, {
			method,
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
			headers: {
				Accept: 'application/json',
				Origin: env.adminOrigin,
				...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
				...(context.cookie ? { Cookie: context.cookie } : {}),
				...(context.csrf ? { 'x-platform-csrf-token': context.csrf } : {}),
				...(options?.ifMatch ? { 'If-Match': options.ifMatch } : {}),
			},
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		});
		if (options && response.headers.getSetCookie().length > 0) {
			await response.body?.cancel();
			throw new BffError(
				502,
				'INVALID_SERVICE_RESPONSE',
				options.domain === 'owner-invitations'
					? 'Owner invitation management returned an incompatible response.'
					: 'Organization management returned an incompatible response.',
			);
		}
		if (!response.ok) {
			if (options) {
				let code: string | undefined;
				if (response.status === 503 || response.status === 409) {
					try {
						const error: unknown = await boundedJson(response.body, 8192);
						if (
							typeof error === 'object' &&
							error !== null &&
							'code' in error &&
							typeof error.code === 'string' &&
							[
								'ORGANIZATION_AUDIT_UNAVAILABLE',
								'ORGANIZATION_SLUG_CONFLICT',
								'ORGANIZATION_TRANSITION_CONFLICT',
								'OWNER_INVITATION_OUTSTANDING_CONFLICT',
								'OWNER_INVITATION_AUDIT_UNAVAILABLE',
							].includes(error.code)
						)
							code = error.code;
					} catch {
						/* Only an allowlisted code is useful; never expose malformed provider errors. */
					}
				} else await response.body?.cancel();
				const safe =
					options.domain === 'owner-invitations'
						? ownerInvitationFailure(response.status, code)
						: organizationFailure(response.status, code);
				throw new BffError(safe.status, safe.code, safe.message);
			}
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
		return {
			data: parsed.data,
			cookies: response.headers.getSetCookie(),
			...(options === undefined ? {} : { etag: response.headers.get('etag') }),
		};
	} catch (error) {
		if (error instanceof BffError && error.status !== 413 && error.code !== 'INVALID_INPUT')
			throw error;
		throw new BffError(
			options ? 503 : 502,
			'SERVICE_UNAVAILABLE',
			options
				? 'The result could not be confirmed. Reload current records before retrying a change.'
				: 'The service is unavailable. Try again.',
		);
	}
}
