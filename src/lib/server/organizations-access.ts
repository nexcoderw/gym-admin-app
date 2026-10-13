import 'server-only';

import type { z } from 'zod';
import type { Organization, OrganizationPermission } from '@/lib/contracts/organizations';
import { getSession } from './endpoints/auth/get-session';
import { BffError, errorResponse } from './http/errors';
import { clearPlatformCookies } from './http/cookies';
import { serverEnvironment } from './environment';
import type { ForwardContext } from './http/upstream';

export async function authorizeOrganization(context: ForwardContext, permission: OrganizationPermission) {
	const session = await getSession(context);
	if (!session.permissions.includes(permission)) {
		throw new BffError(403, 'ACCESS_DENIED', 'Your account does not have the required organization permission.');
	}
	return session;
}

export function organizationInput<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success) throw new BffError(400, 'INVALID_INPUT', 'Check the organization details and reload the latest records.');
	return result.data;
}

/** Duplicate, unsupported and malformed query parameters fail rather than selecting a hidden value. */
export function organizationQuery(request: Request): Record<string, string> {
	const params = new URL(request.url).searchParams;
	const result: Record<string, string> = {};
	for (const [key, value] of params) {
		if (Object.hasOwn(result, key) || !['limit', 'status', 'cursor'].includes(key)) {
			throw new BffError(400, 'INVALID_INPUT', 'Use a valid status, limit and cursor to list gyms.');
		}
		result[key] = value;
	}
	return result;
}

export function organizationRouteError(request: Request, error: unknown) {
	const response = errorResponse(error);
	if (response.status === 401) {
		const env = serverEnvironment();
		const supplied = (request.headers.get('cookie') ?? '').split(';').some((part) => {
			const name = part.trim().split('=')[0];
			return name === env.sessionCookie || name === env.csrfCookie;
		});
		if (supplied) clearPlatformCookies(response);
	}
	return response;
}

export function verifyOrganizationResult(row: Organization, expected: Partial<Pick<Organization, 'id' | 'name' | 'slug' | 'status'>>) {
	if ((expected.id !== undefined && row.id !== expected.id) ||
		(expected.name !== undefined && row.name !== expected.name) ||
		(expected.slug !== undefined && row.slug !== expected.slug) ||
		(expected.status !== undefined && row.status !== expected.status)) {
		throw new BffError(502, 'INVALID_SERVICE_RESPONSE', 'The organization result was incompatible. Review current records before retrying.');
	}
	return row;
}
