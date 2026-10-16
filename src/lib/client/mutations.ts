import type { z } from 'zod';
import { organizationFailure } from '@/lib/contracts/organizations';
import { ownerInvitationFailure } from '@/lib/contracts/owner-invitations';

export class OrganizationRequestError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
	}
}

/** Only frontend-owned paths are accepted. Credentials are never persisted or logged. */
export async function post<T>(
	path: `/api/${string}`,
	body: unknown,
	schema: z.ZodType<T>,
	csrf?: string,
): Promise<T> {
	return browserRequest(path, 'POST', body, schema, csrf);
}

/** Private-domain options are explicit; auth callers retain their established error semantics. */
export async function browserRequest<T>(
	path: `/api/${string}`,
	method: 'GET' | 'POST' | 'PATCH',
	body: unknown,
	schema: z.ZodType<T>,
	csrf?: string,
	options?: {
		readonly domain: 'organizations' | 'owner-invitations';
		readonly expectedStatus: 200 | 201 | 202;
		readonly ifMatch?: string;
		readonly signal?: AbortSignal;
	},
): Promise<T> {
	let response: Response;
	try {
		response = await fetch(path, {
			method,
			credentials: 'same-origin',
			cache: 'no-store',
			redirect: 'error',
			signal: options?.signal
				? AbortSignal.any([AbortSignal.timeout(25_000), options.signal])
				: AbortSignal.timeout(25_000),
			headers: {
				...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
				...(csrf ? { 'x-platform-csrf-token': csrf } : {}),
				...(options?.ifMatch ? { 'If-Match': options.ifMatch } : {}),
			},
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		});
	} catch {
		if (options)
			throw new OrganizationRequestError(
				503,
				'OUTCOME_UNCONFIRMED',
				'The result could not be confirmed. Review current records before retrying this change.',
			);
		throw new Error('The service could not be reached. Try again.');
	}
	if (options && !response.ok) {
		let code: string | undefined;
		try {
			const value: unknown = await response.json();
			if (
				typeof value === 'object' &&
				value !== null &&
				'error' in value &&
				typeof value.error === 'object' &&
				value.error !== null &&
				'code' in value.error &&
				typeof value.error.code === 'string' &&
				[
					'ORGANIZATION_AUDIT_UNAVAILABLE',
					'ORGANIZATION_SLUG_CONFLICT',
					'ORGANIZATION_TRANSITION_CONFLICT',
					'OWNER_INVITATION_OUTSTANDING_CONFLICT',
					'OWNER_INVITATION_AUDIT_UNAVAILABLE',
				].includes(value.error.code)
			)
				code = value.error.code;
		} catch {
			/* Display only local allowlisted error messages. */
		}
		const safe =
			options.domain === 'owner-invitations'
				? ownerInvitationFailure(response.status, code)
				: organizationFailure(response.status, code);
		throw new OrganizationRequestError(safe.status, safe.code, safe.message);
	}
	if (!response.ok)
		throw new Error(
			response.status === 429
				? 'Too many attempts. Wait before trying again.'
				: response.status === 401
					? 'Authentication was not accepted. Check your details or sign in again.'
					: response.status === 403
						? 'This request was not accepted. Restart sign-in and try again.'
						: response.status === 412
							? 'Contact your operator to complete MFA enrollment.'
							: 'The request could not be completed. Try again or contact your operator.',
		);
	let value: unknown;
	if (options && response.status !== options.expectedStatus) {
		throw new OrganizationRequestError(
			503,
			'OUTCOME_UNCONFIRMED',
			'The service did not confirm the expected result. Review current records before retrying.',
		);
	}
	try {
		value = response.status === 204 ? undefined : await response.json();
	} catch {
		if (options)
			throw new OrganizationRequestError(
				503,
				'OUTCOME_UNCONFIRMED',
				'The result could not be read. Review current records before retrying.',
			);
		throw new Error('The service returned an unexpected response. Try again.');
	}
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		if (options)
			throw new OrganizationRequestError(
				503,
				'OUTCOME_UNCONFIRMED',
				'The result was incompatible. Review current records before retrying.',
			);
		throw new Error('The service returned an unexpected response. Try again.');
	}
	return parsed.data;
}

export function browserCsrf(): string | undefined {
	for (const name of ['__Host-nexcode-platform-csrf', 'nexcode-platform-csrf']) {
		const entry = document.cookie.split('; ').find((value) => value.startsWith(`${name}=`));
		if (entry) return entry.slice(name.length + 1);
	}
	return undefined;
}
