import 'server-only';

import {
	ownerInvitationIdSchema,
	ownerInvitationListQuerySchema,
	ownerInvitationListSchema,
	ownerInvitationPermissions,
} from '@/lib/contracts/owner-invitations';
import { authorizeOwnerInvitations, ownerInvitationInput } from '../../owner-invitations-access';
import { BffError } from '../../http/errors';
import { upstream, type ForwardContext } from '../../http/upstream';

export async function listOwnerInvitations(
	inputId: unknown,
	input: unknown,
	context: ForwardContext,
) {
	const id = ownerInvitationInput(ownerInvitationIdSchema, inputId);
	const query = ownerInvitationInput(ownerInvitationListQuerySchema, input);
	await authorizeOwnerInvitations(context, ownerInvitationPermissions.read);
	const params = new URLSearchParams({ limit: String(query.limit) });
	if (query.status) params.set('status', query.status);
	if (query.cursor) params.set('cursor', query.cursor);
	const { data } = await upstream(
		`/api/v1/platform/organizations/${encodeURIComponent(id)}/owner-invitations`,
		'GET',
		ownerInvitationListSchema,
		context,
		undefined,
		200,
		{ domain: 'owner-invitations', query: params },
	);
	if (
		data.items.length > query.limit ||
		data.items.some(
			(item) =>
				item.organizationId !== id || (query.status !== undefined && item.status !== query.status),
		)
	) {
		throw new BffError(
			502,
			'INVALID_SERVICE_RESPONSE',
			'The invitation list was incompatible. Reload invitations.',
		);
	}
	return data;
}
