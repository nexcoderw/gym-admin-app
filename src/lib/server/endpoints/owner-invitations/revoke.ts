import 'server-only';

import { ownerInvitationIdSchema, ownerInvitationPermissions, ownerInvitationSchema } from '@/lib/contracts/owner-invitations';
import { authorizeOwnerInvitations, ownerInvitationInput } from '../../owner-invitations-access';
import { BffError } from '../../http/errors';
import { upstream, type ForwardContext } from '../../http/upstream';

export async function revokeOwnerInvitation(inputId: unknown, inputInvitationId: unknown, context: ForwardContext) {
	const id = ownerInvitationInput(ownerInvitationIdSchema, inputId);
	const invitationId = ownerInvitationInput(ownerInvitationIdSchema, inputInvitationId);
	await authorizeOwnerInvitations(context, ownerInvitationPermissions.revoke);
	const { data } = await upstream(
		`/api/v1/platform/organizations/${encodeURIComponent(id)}/owner-invitations/${encodeURIComponent(invitationId)}/revocation`,
		'POST', ownerInvitationSchema, context, undefined, 200, { domain: 'owner-invitations' },
	);
	if (data.id !== invitationId || data.organizationId !== id || data.status !== 'REVOKED') {
		throw new BffError(502, 'OUTCOME_UNCONFIRMED', 'Revocation could not be confirmed. Reload invitations before another action.');
	}
	return data;
}
