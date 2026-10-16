import 'server-only';

import {
	createOwnerInvitationSchema,
	ownerInvitationIdSchema,
	ownerInvitationPermissions,
	ownerInvitationSchema,
} from '@/lib/contracts/owner-invitations';
import { authorizeOwnerInvitations, ownerInvitationInput } from '../../owner-invitations-access';
import { BffError } from '../../http/errors';
import { upstream, type ForwardContext } from '../../http/upstream';

export async function createOwnerInvitation(
	inputId: unknown,
	input: unknown,
	context: ForwardContext,
) {
	const id = ownerInvitationInput(ownerInvitationIdSchema, inputId);
	const body = ownerInvitationInput(createOwnerInvitationSchema, input);
	await authorizeOwnerInvitations(context, ownerInvitationPermissions.create);
	const { data } = await upstream(
		`/api/v1/platform/organizations/${encodeURIComponent(id)}/owner-invitations`,
		'POST',
		ownerInvitationSchema,
		context,
		body,
		201,
		{ domain: 'owner-invitations' },
	);
	if (
		data.organizationId !== id ||
		data.status !== 'PENDING_DELIVERY' ||
		data.displayName !== body.displayName ||
		data.email !== body.email
	) {
		throw new BffError(
			502,
			'OUTCOME_UNCONFIRMED',
			'The invitation result was incompatible. Review invitations before retrying.',
		);
	}
	return data;
}
