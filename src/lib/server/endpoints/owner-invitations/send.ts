import 'server-only';

import {
	ownerInvitationDeliverySchema,
	ownerInvitationIdSchema,
	ownerInvitationPermissions,
} from '@/lib/contracts/owner-invitations';
import { authorizeOwnerInvitations, ownerInvitationInput } from '../../owner-invitations-access';
import { upstream, type ForwardContext } from '../../http/upstream';

export async function sendOwnerInvitation(
	inputId: unknown,
	inputInvitationId: unknown,
	context: ForwardContext,
) {
	const id = ownerInvitationInput(ownerInvitationIdSchema, inputId);
	const invitationId = ownerInvitationInput(ownerInvitationIdSchema, inputInvitationId);
	await authorizeOwnerInvitations(context, ownerInvitationPermissions.send);
	return (
		await upstream(
			`/api/v1/platform/organizations/${encodeURIComponent(id)}/owner-invitations/${encodeURIComponent(invitationId)}/delivery`,
			'POST',
			ownerInvitationDeliverySchema,
			context,
			undefined,
			202,
			{ domain: 'owner-invitations' },
		)
	).data;
}
