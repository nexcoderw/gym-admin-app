import 'server-only';

import type { z } from 'zod';

import type { OwnerInvitationPermission } from '@/lib/contracts/owner-invitations';
import { getSession } from './endpoints/auth/get-session';
import { BffError } from './http/errors';
import type { ForwardContext } from './http/upstream';

export async function authorizeOwnerInvitations(context: ForwardContext, permission: OwnerInvitationPermission) {
	const session = await getSession(context);
	if (!session.permissions.includes(permission)) {
		throw new BffError(403, 'ACCESS_DENIED', 'Your account does not have the required owner invitation permission.');
	}
}

export function ownerInvitationInput<T>(schema: z.ZodType<T>, input: unknown): T {
	const parsed = schema.safeParse(input);
	if (!parsed.success) throw new BffError(400, 'OWNER_INVITATION_INVALID_INPUT', 'Check the owner invitation details and cursor.');
	return parsed.data;
}

export function ownerInvitationQuery(request: Request): Record<string, string> {
	const query: Record<string, string> = {};
	for (const [key, value] of new URL(request.url).searchParams) {
		if (!['limit', 'status', 'cursor'].includes(key) || Object.hasOwn(query, key)) {
			throw new BffError(400, 'OWNER_INVITATION_INVALID_INPUT', 'Use one valid limit, status and cursor.');
		}
		query[key] = value;
	}
	return query;
}
